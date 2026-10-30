import SwiftUI

// Brand colours live in the asset catalog with light and dark variants;
// Xcode generates Color.obsidian, .pearl, .icy, .violet and .nacre.

extension GraphicsContext {
    /// Glass body, opal sheen and a fine rim, drawn back to front.
    func drawPearl(at c: CGPoint, radius r: CGFloat) {
        let body = Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r))
        fill(body, with: .radialGradient(
            Gradient(colors: [.pearl, .pearl.opacity(0.35), .obsidian]),
            center: CGPoint(x: c.x - r * 0.35, y: c.y - r * 0.4),
            startRadius: 0, endRadius: r * 1.4))

        var sheen = self
        sheen.blendMode = .softLight
        sheen.fill(body, with: .conicGradient(
            Gradient(colors: [.nacre, .violet, .icy, .nacre]),
            center: c, angle: .degrees(-30)))

        stroke(body, with: .color(.pearl.opacity(0.5)), lineWidth: 1)
    }

    /// The 3:2 Lissajous signal: x = r·sin(3t + phase), y = r·sin(2t).
    func drawSignal(at c: CGPoint, radius r: CGFloat, phase: Double) {
        var path = Path()
        for step in 0...360 {
            let t = Double(step) / 360 * 2 * .pi
            let point = CGPoint(x: c.x + r * sin(3 * t + phase), y: c.y + r * sin(2 * t))
            if step == 0 { path.move(to: point) } else { path.addLine(to: point) }
        }
        stroke(path, with: .linearGradient(
            Gradient(colors: [.violet, .icy]),
            startPoint: CGPoint(x: c.x - r, y: c.y),
            endPoint: CGPoint(x: c.x + r, y: c.y)), lineWidth: 1)
    }
}
