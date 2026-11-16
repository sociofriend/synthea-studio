#!/usr/bin/env python3
"""Keeps .claude/codemap/index.json in step with the repo's files.

tools/codemap.py            update only the entries whose hash changed
tools/codemap.py --changed  list files whose hash differs from the map (no write)
tools/codemap.py --check    same, but exit 1 when the map is stale (CI)
tools/codemap.py --all      rescan types and uses of every file (keeps purposes)
"""
import hashlib, html, json, os, re, subprocess, sys

ROOT = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, check=True).stdout.strip()
MAP = os.path.join(ROOT, ".claude/codemap/index.json")
TEXT = {".swift", ".md", ".sh", ".py", ".yml", ".yaml", ".plist", ".entitlements", ".xcstrings", ".storekit", ".js", ".mjs",
        ".html", ".css", ".json", ".resolved"}
IGNORE = os.path.join(ROOT, ".claude/codemap/ignore")  # Optional: one path regex per line (data folders).
SKIP = re.compile("|".join([r"\.xcassets/|\.xcodeproj/|\.xcworkspace/|^\.claude/codemap/"] +
                           ([l.strip() for l in open(IGNORE) if l.strip() and not l.startswith("#")] if os.path.exists(IGNORE) else [])))
TYPE = re.compile(r"^\s*(?:@\w+(?:\([^)]*\))?\s+)*(?:(?:public|private|fileprivate|internal|nonisolated|final|open|indirect)\s+)*"
                  r"(struct|class|enum|protocol|actor|extension)\s+([A-Z]\w*(?:\.\w+)*)", re.M)
IMPORT = re.compile(r"^\s*(?:@\w+\s+)?import\s+(\w+)", re.M)
JS_TYPE = re.compile(r"^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:class|function\*?)\s+(\w+)", re.M)
JS_IMPORT = re.compile(r"""(?:from\s+|require\(\s*|import\s+)['"]([^'"]+)['"]""")
PY_TYPE = re.compile(r"^(?:class|def)\s+(\w+)", re.M)
PY_IMPORT = re.compile(r"^(?:from\s+(\S+)\s+import|import\s+(\w+))", re.M)
NOISE = re.compile(r"MARK:|TODO|swift-tools|Created by|Copyright|-\*-|^\S+$")
WORD = re.compile(r"\b[A-Z]\w+\b")
MAX_USES = 15


def files():
    out = subprocess.run(["git", "ls-files", "-co", "--exclude-standard", "-z"], cwd=ROOT, capture_output=True, check=True).stdout
    paths = [p for p in out.decode().split("\0") if p and os.path.isfile(os.path.join(ROOT, p))]
    return sorted(p for p in paths if os.path.splitext(p)[1] in TEXT and not SKIP.search(p))


def digest(path):
    with open(os.path.join(ROOT, path), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()[:16]  # A SHA-256 prefix is enough to spot a change.


def header(text, swift):
    """Default purpose of a new file: first sentence of the comment before its first line of code."""
    para = []
    for line in text.splitlines():
        t = line.strip()
        if t.startswith('"""') and not para:
            return t.strip('"').strip()[:140]
        if t.startswith("#!") or t.strip("'\";") == "use strict":
            continue
        if t.startswith(("//", "/*", "* ", "<!--") if swift else ("//", "#", "/*", "* ", "<!--")):
            c = re.sub(r"^(//+|#+|/\*+|\*|<!--)|(\*/|-->)$", "", t).strip()
            if c and not NOISE.search(c):
                para.append(c)
            elif para:
                break
        elif t and not t.startswith(("import ", "@preconcurrency import ", "const ")) and not (swift and t.startswith("#")):
            break
    return re.split(r"(?<=\.)\s", " ".join(para), maxsplit=1)[0][:140]


def title(text):
    m = re.search(r"<title>([^<]+)</title>", text[:4000])
    return html.unescape(m.group(1)).strip()[:140] if m else ""


def first_doc(text):
    """The doc comment right above the file's first type, if any."""
    m = TYPE.search(text)
    if not m:
        return ""
    doc = []
    for line in reversed(text[:m.start()].splitlines()):
        t = line.strip()
        if t.startswith("///"):
            doc.insert(0, t[3:].strip())
        elif not t.startswith("@"):
            break
    return re.split(r"(?<=\.)\s", " ".join(doc), maxsplit=1)[0][:140]


def tests_of(path):
    name = os.path.basename(path)
    return f"Tests for {name[:-11]}." if name.endswith("Tests.swift") else ""


def scan(path):
    with open(os.path.join(ROOT, path), encoding="utf-8", errors="replace") as f:
        text = f.read()
    ext = os.path.splitext(path)[1]
    if ext in (".js", ".mjs"):
        return text, list(dict.fromkeys(JS_TYPE.findall(text))), sorted(set(JS_IMPORT.findall(text)))
    if ext == ".py":
        return text, list(dict.fromkeys(PY_TYPE.findall(text))), sorted({a or b for a, b in PY_IMPORT.findall(text)})
    if ext != ".swift":
        return text, [], []
    found = TYPE.findall(text)
    defined = [n for kind, n in found if kind != "extension"]
    extended = ["+" + n for kind, n in found if kind == "extension" and n not in defined]
    return text, list(dict.fromkeys(defined + extended)), sorted(set(IMPORT.findall(text)))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    old = {}
    if os.path.exists(MAP):
        with open(MAP) as f:
            old = json.load(f)["files"]
    paths = files()
    hashes = {p: digest(p) for p in paths}
    changed = [p for p in paths if old.get(p, {}).get("sha256") != hashes[p]]
    gone = sorted(set(old) - set(paths))
    if mode in ("--changed", "--check"):
        print("\n".join(changed + [p + " (deleted)" for p in gone]))
        sys.exit(1 if mode == "--check" and (changed or gone) else 0)

    redo = paths if mode == "--all" else changed
    new = {p: old[p] for p in paths if p in old}
    texts = {}
    for p in redo:
        texts[p], types, imports = scan(p)
        new[p] = {"sha256": hashes[p], "purpose": new.get(p, {}).get("purpose") or header(texts[p], p.endswith(".swift")) or title(texts[p]) or first_doc(texts[p]) or tests_of(p),
                  "types": types, "imports": imports}
    owner = {t: p for p, e in new.items() for t in e.get("types", []) if not t.startswith("+")}
    for p in redo:
        if p.endswith(".swift"):
            own = {t.lstrip("+") for t in new[p]["types"]}
            new[p]["uses"] = sorted({w for w in WORD.findall(texts[p]) if w in owner and w not in own and owner[w] != p})[:MAX_USES]

    os.makedirs(os.path.dirname(MAP), exist_ok=True)
    with open(MAP, "w") as f:  # One entry per line: small diffs, few tokens.
        rows = (f"{json.dumps(p)}: {json.dumps({k: v for k, v in new[p].items() if v or k == 'purpose'}, ensure_ascii=False)}"
                for p in sorted(new))
        f.write('{"version": 1, "files": {\n' + ",\n".join(rows) + "\n}}\n")
    print(f"codemap: {len(redo)} updated, {len(gone)} removed, {len(new)} files")
    blank = [p for p in sorted(new) if not new[p]["purpose"]]
    if blank:
        print("no purpose yet (write one):\n  " + "\n  ".join(blank))


if __name__ == "__main__":
    main()
