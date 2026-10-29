import Combine
import Foundation

/// Drives the pearl. The view reports what it knows; the model decides when to animate.
@MainActor
final class PearlViewModel: ObservableObject {
    @Published var reduceMotion = false
    @Published var isOnScreen = false
    @Published private(set) var isPaused = true

    init() {
        $reduceMotion
            .combineLatest($isOnScreen)
            .map { reduceMotion, isOnScreen in reduceMotion || !isOnScreen }
            .removeDuplicates()
            .assign(to: &$isPaused)
    }

    /// The signal's phase at a moment. Near π/2 the curve crosses the core.
    func phase(at date: Date) -> Double {
        Double.pi / 2 + 0.22 * sin(date.timeIntervalSinceReferenceDate * 0.35)
    }
}
