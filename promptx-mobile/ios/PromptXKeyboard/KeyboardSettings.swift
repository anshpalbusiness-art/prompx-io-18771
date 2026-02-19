import Foundation

/**
 * Manages keyboard extension settings using UserDefaults (app group shared container).
 * Settings are synced with the main PromptX app.
 */
class KeyboardSettings {

    static let shared = KeyboardSettings()

    // App group for sharing data between main app and keyboard extension
    private let defaults: UserDefaults

    private init() {
        // Use app group for shared settings between main app and keyboard extension
        if let groupDefaults = UserDefaults(suiteName: "group.com.promptxmobile.keyboard") {
            defaults = groupDefaults
        } else {
            defaults = UserDefaults.standard
        }
    }

    // MARK: - Settings Properties

    var isEnabled: Bool {
        get { defaults.bool(forKey: "overlay_enabled") }
        set { defaults.set(newValue, forKey: "overlay_enabled") }
    }

    var style: String {
        get { defaults.string(forKey: "overlay_style") ?? "professional" }
        set { defaults.set(newValue, forKey: "overlay_style") }
    }

    var autoReplace: Bool {
        get { defaults.bool(forKey: "overlay_auto_replace") }
        set { defaults.set(newValue, forKey: "overlay_auto_replace") }
    }

    var privacyMode: Bool {
        get { defaults.bool(forKey: "overlay_privacy_mode") }
        set { defaults.set(newValue, forKey: "overlay_privacy_mode") }
    }

    var debounceMs: Int {
        get {
            let value = defaults.integer(forKey: "overlay_debounce_ms")
            return value > 0 ? value : 3000
        }
        set { defaults.set(newValue, forKey: "overlay_debounce_ms") }
    }

    var apiEndpoint: String {
        get { defaults.string(forKey: "overlay_api_endpoint") ?? "https://promptx.io/api/overlay-enhance" }
        set { defaults.set(newValue, forKey: "overlay_api_endpoint") }
    }

    // MARK: - Enhancement Style Presets

    static let styles: [(id: String, name: String, icon: String)] = [
        ("professional", "Professional", "💼"),
        ("maximum_detail", "Maximum Detail", "🔬"),
        ("aggressive", "Aggressive", "⚡"),
        ("concise", "Concise & Sharp", "🎯"),
        ("creative", "Creative Storyteller", "🎨"),
    ]
}
