"""Refreshes the Swift shown on the page from native/.

Every <code data-src="native/…"> in index.html is refilled with that file, highlighted
as static spans (Xcode-style token classes), one <span class="line"> per line.
Run after editing a file in native/:  python3 tools/highlight-swift.py
"""
import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
KEYWORDS = set('''import final class struct extension func var let private set init return if else for in some
static self Self true false nil where guard throws async await'''.split())
TOKEN = re.compile(r'''
  (?P<com>//[^\n]*)
| (?P<str>"(?:\\.|[^"\\\n])*")
| (?P<attr>[@\#][A-Za-z]+)
| (?P<num>\b\d+(?:\.\d+)?\b)
| (?P<key>\\\.[A-Za-z]+|\$[A-Za-z]+)
| (?P<id>[A-Za-z_][A-Za-z0-9_]*)
| (?P<other>[\s\S])
''', re.X)
CLASSES = {'com': 'c', 'str': 's', 'attr': 'a', 'num': 'n', 'key': 'k', 'kw': 'kw', 'ty': 't', 'fn': 'f', 'mem': 'm'}


def highlight(src):
    out, prev = [], ''
    for m in TOKEN.finditer(src):
        kind, text = m.lastgroup, m.group()
        if kind == 'id':
            if text in KEYWORDS: kind = 'kw'
            elif text[0].isupper(): kind = 'ty'
            elif src[m.end():m.end() + 1] == '(' or prev == 'func': kind = 'fn'
            elif prev == '.': kind = 'mem'
            else: kind = None
        if text.strip(): prev = text
        cls, esc = CLASSES.get(kind), html.escape(text, quote=False)
        out.append(f'<span class="{cls}">{esc}</span>' if cls else esc)
    # tokens never span lines, so the output splits cleanly into numbered lines
    return '\n'.join(f'<span class="line">{line}</span>' for line in ''.join(out).split('\n'))


def main():
    page = ROOT / 'index.html'
    text = page.read_text(encoding='utf-8')
    fill = lambda m: m.group(1) + highlight((ROOT / m.group(2)).read_text(encoding='utf-8').rstrip('\n')) + m.group(3)
    page.write_text(re.sub(r'(<code data-src="([^"]+)">)(?:.*?)(</code>)', fill, text, flags=re.S), encoding='utf-8')


if __name__ == '__main__':
    main()
