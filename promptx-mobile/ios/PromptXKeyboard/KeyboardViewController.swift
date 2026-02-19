import UIKit

/**
 * PromptX Custom Keyboard Extension
 *
 * A Grammarly-style keyboard that monitors typed text in AI chat apps,
 * debounces for 3 seconds after typing stops, then calls the PromptX
 * enhancement API and shows an inline suggestion bar.
 *
 * Setup: Settings → General → Keyboards → Add "PromptX Keyboard" → Allow Full Access
 */
class KeyboardViewController: UIInputViewController {

    // MARK: - UI Elements

    private var enhancementBar: EnhancementBar!
    private var keyboardView: UIView!

    // MARK: - State

    private var currentText = ""
    private var enhancedText = ""
    private var debounceTimer: Timer?
    private var isEnhancing = false
    private let settings = KeyboardSettings.shared

    // AI Chat app bundle IDs for detection
    private let aiChatBundleIDs: Set<String> = [
        "com.openai.chat",
        "com.anthropic.claude",
        "com.google.bard",
        "ai.x.grok",
        "ai.perplexity.app",
        "com.quora.poe",
        "com.microsoft.copilot",
        "com.deepseek.chat"
    ]

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        setupKeyboardView()
        setupEnhancementBar()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
    }

    override func textDidChange(_ textInput: UITextInput?) {
        super.textDidChange(textInput)

        guard settings.isEnabled else { return }

        // Read current text from document proxy
        let proxy = textDocumentProxy
        let beforeCursor = proxy.documentContextBeforeInput ?? ""
        let afterCursor = proxy.documentContextAfterInput ?? ""
        let fullText = beforeCursor + afterCursor

        if fullText != currentText && !fullText.isEmpty {
            currentText = fullText
            startDebounceTimer()
        }
    }

    // MARK: - Debounce Timer

    private func startDebounceTimer() {
        debounceTimer?.invalidate()

        let debounceSeconds = Double(settings.debounceMs) / 1000.0

        debounceTimer = Timer.scheduledTimer(
            withTimeInterval: debounceSeconds,
            repeats: false
        ) { [weak self] _ in
            guard let self = self else { return }
            if self.currentText.count >= 5 {
                self.enhancePrompt(self.currentText)
            }
        }
    }

    // MARK: - Enhancement API

    private func enhancePrompt(_ prompt: String) {
        guard !isEnhancing else { return }
        isEnhancing = true

        enhancementBar.showEnhancing()

        let endpoint = settings.apiEndpoint
        guard let url = URL(string: endpoint) else {
            isEnhancing = false
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 15

        let body: [String: Any] = [
            "prompt": prompt,
            "style": settings.style,
            "privacyMode": settings.privacyMode
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.isEnhancing = false

                guard let data = data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let enhanced = json["enhanced"] as? String else {
                    self.enhancementBar.showError()
                    return
                }

                self.enhancedText = enhanced
                self.enhancementBar.showReady(preview: enhanced)
            }
        }.resume()
    }

    // MARK: - Text Replacement

    func useEnhancedPrompt() {
        guard !enhancedText.isEmpty else { return }

        let proxy = textDocumentProxy

        // Delete all existing text
        let beforeCursor = proxy.documentContextBeforeInput ?? ""
        let afterCursor = proxy.documentContextAfterInput ?? ""

        // Move cursor to end first
        if !afterCursor.isEmpty {
            proxy.adjustTextPosition(byCharacterOffset: afterCursor.count)
        }

        // Delete all text before cursor
        let totalLength = beforeCursor.count + afterCursor.count
        for _ in 0..<totalLength {
            proxy.deleteBackward()
        }

        // Insert enhanced text
        proxy.insertText(enhancedText)

        enhancementBar.showPasted()
        enhancedText = ""
        currentText = ""

        // Reset after 2 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            self?.enhancementBar.showIdle()
        }
    }

    func dismissEnhancement() {
        enhancedText = ""
        enhancementBar.showIdle()
    }

    // MARK: - Keyboard Setup

    private func setupKeyboardView() {
        // Minimal keyboard with "Next Keyboard" button
        // In production, this would be a full QWERTY keyboard
        keyboardView = UIView()
        keyboardView.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(keyboardView)

        NSLayoutConstraint.activate([
            keyboardView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            keyboardView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            keyboardView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            keyboardView.heightAnchor.constraint(equalToConstant: 216)
        ])

        // Next keyboard button
        let nextKeyboardButton = UIButton(type: .system)
        nextKeyboardButton.setTitle("🌐", for: .normal)
        nextKeyboardButton.titleLabel?.font = .systemFont(ofSize: 24)
        nextKeyboardButton.translatesAutoresizingMaskIntoConstraints = false
        nextKeyboardButton.addTarget(self, action: #selector(handleInputModeList(from:with:)), for: .allTouchEvents)

        keyboardView.addSubview(nextKeyboardButton)

        NSLayoutConstraint.activate([
            nextKeyboardButton.leadingAnchor.constraint(equalTo: keyboardView.leadingAnchor, constant: 16),
            nextKeyboardButton.bottomAnchor.constraint(equalTo: keyboardView.bottomAnchor, constant: -8),
            nextKeyboardButton.widthAnchor.constraint(equalToConstant: 44),
            nextKeyboardButton.heightAnchor.constraint(equalToConstant: 44)
        ])

        // Style
        keyboardView.backgroundColor = UIColor(red: 0.04, green: 0.04, blue: 0.06, alpha: 1.0) // #0a0a0f
    }

    private func setupEnhancementBar() {
        enhancementBar = EnhancementBar(frame: .zero)
        enhancementBar.translatesAutoresizingMaskIntoConstraints = false
        enhancementBar.onUse = { [weak self] in self?.useEnhancedPrompt() }
        enhancementBar.onDismiss = { [weak self] in self?.dismissEnhancement() }

        view.addSubview(enhancementBar)

        NSLayoutConstraint.activate([
            enhancementBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            enhancementBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),
            enhancementBar.bottomAnchor.constraint(equalTo: keyboardView.topAnchor, constant: -4),
            enhancementBar.heightAnchor.constraint(greaterThanOrEqualToConstant: 44)
        ])
    }
}
