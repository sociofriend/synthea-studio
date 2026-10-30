import SwiftUI

/// The live Synthetic Pearl: drawn every frame while visible, still for Reduce Motion.
struct PearlView: View {
    @StateObject private var model = PearlViewModel()
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(.animation(paused: model.isPaused)) { timeline in
            Canvas { context, size in
                let center = CGPoint(x: size.width / 2, y: size.height / 2)
                let radius = min(size.width, size.height) * 0.36
                context.drawPearl(at: center, radius: radius)
                context.drawSignal(at: center, radius: radius * 0.56,
                                   phase: model.phase(at: timeline.date))
            }
        }
        .onChange(of: reduceMotion, initial: true) { model.reduceMotion = $1 }
        .onAppear { model.isOnScreen = true }
        .onDisappear { model.isOnScreen = false }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Synthéa, a glass pearl with a signal inside")
        .accessibilityAddTraits(.isImage)
    }
}

#Preview {
    PearlView()
        .frame(width: 320, height: 320)
        .background(Color.obsidian)
}
