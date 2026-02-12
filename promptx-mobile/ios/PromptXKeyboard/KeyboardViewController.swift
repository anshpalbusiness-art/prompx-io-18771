import UIKit

/**
 * PromptX Custom Keyboard Extension
 *
 * Since iOS doesn't allow floating overlays like Android, this keyboard extension
 * lets users enhance prompts from any app by switching to the PromptX keyboard.
 *
 * Flow:
 * 1. User is typing in any app (ChatGPT, Claude, Messages, etc.)
 * 2. User switches to PromptX keyboard
 * 3. Current text is shown + "Enhance" button
 * 4. Enhanced text replaces the original
 */
class KeyboardViewController: UIInputViewController {

    // MARK: - UI Elements
    private var enhanceButton: UIButton!
    private var resultLabel: UILabel!
    private var statusLabel: UILabel!
    private var nextKeyboardButton: UIButton!
    private var topBar: UIView!
    private var mainContainer: UIView!

    // MARK: - Constants
    private let supabaseURL = "https://tplfjmitflhxuttixqjq.supabase.co"
    private let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwbGZqbWl0ZmxoeHV0dGl4cWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MTY5NDQsImV4cCI6MjA1MjA5Mjk0NH0.L9MfjhFwCbGSqVFBJFsfWMVhNlMYEyN12cXMX2BZLvY"

    // MARK: - Colors
    private let bgColor = UIColor(red: 0.02, green: 0.03, blue: 0.09, alpha: 1.0)       // #050816
    private let cardColor = UIColor(red: 0.04, green: 0.05, blue: 0.15, alpha: 1.0)      // #0a0e27
    private let accentColor = UIColor(red: 0.51, green: 0.55, blue: 0.97, alpha: 1.0)    // #818CF8
    private let successColor = UIColor(red: 0.20, green: 0.83, blue: 0.60, alpha: 1.0)   // #34D399
    private let textColor = UIColor.white
    private let mutedColor = UIColor(white: 1.0, alpha: 0.45)
    private let borderColor = UIColor(white: 1.0, alpha: 0.12)

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        // Set keyboard height
        let heightConstraint = view.heightAnchor.constraint(equalToConstant: 260)
        heightConstraint.priority = .defaultHigh
        heightConstraint.isActive = true
    }

    // MARK: - UI Setup

    private func setupUI() {
        view.backgroundColor = bgColor

        // Main container
        mainContainer = UIView()
        mainContainer.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(mainContainer)

        NSLayoutConstraint.activate([
            mainContainer.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
            mainContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            mainContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),
            mainContainer.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -8),
        ])

        // Top bar with logo + switch keyboard button
        topBar = UIView()
        topBar.translatesAutoresizingMaskIntoConstraints = false
        mainContainer.addSubview(topBar)

        let logoLabel = UILabel()
        logoLabel.text = "⚡ PromptX"
        logoLabel.textColor = textColor
        logoLabel.font = UIFont.boldSystemFont(ofSize: 16)
        logoLabel.translatesAutoresizingMaskIntoConstraints = false
        topBar.addSubview(logoLabel)

        // Globe/switch keyboard button (required by Apple)
        nextKeyboardButton = UIButton(type: .system)
        nextKeyboardButton.setTitle("🌐", for: .normal)
        nextKeyboardButton.titleLabel?.font = UIFont.systemFont(ofSize: 20)
        nextKeyboardButton.addTarget(self, action: #selector(handleInputModeList(from:with:)), for: .allTouchEvents)
        nextKeyboardButton.translatesAutoresizingMaskIntoConstraints = false
        topBar.addSubview(nextKeyboardButton)

        NSLayoutConstraint.activate([
            topBar.topAnchor.constraint(equalTo: mainContainer.topAnchor),
            topBar.leadingAnchor.constraint(equalTo: mainContainer.leadingAnchor),
            topBar.trailingAnchor.constraint(equalTo: mainContainer.trailingAnchor),
            topBar.heightAnchor.constraint(equalToConstant: 36),

            logoLabel.leadingAnchor.constraint(equalTo: topBar.leadingAnchor, constant: 8),
            logoLabel.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),

            nextKeyboardButton.trailingAnchor.constraint(equalTo: topBar.trailingAnchor, constant: -8),
            nextKeyboardButton.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
        ])

        // Status label (shows current text preview)
        statusLabel = UILabel()
        statusLabel.text = "Tap 'Enhance' to upgrade your prompt"
        statusLabel.textColor = mutedColor
        statusLabel.font = UIFont.systemFont(ofSize: 12)
        statusLabel.textAlignment = .center
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        mainContainer.addSubview(statusLabel)

        NSLayoutConstraint.activate([
            statusLabel.topAnchor.constraint(equalTo: topBar.bottomAnchor, constant: 8),
            statusLabel.leadingAnchor.constraint(equalTo: mainContainer.leadingAnchor, constant: 8),
            statusLabel.trailingAnchor.constraint(equalTo: mainContainer.trailingAnchor, constant: -8),
        ])

        // Result label (shows enhanced text)
        resultLabel = UILabel()
        resultLabel.text = ""
        resultLabel.textColor = textColor
        resultLabel.font = UIFont.systemFont(ofSize: 13)
        resultLabel.numberOfLines = 4
        resultLabel.backgroundColor = cardColor
        resultLabel.layer.cornerRadius = 8
        resultLabel.layer.masksToBounds = true
        resultLabel.layer.borderWidth = 1
        resultLabel.layer.borderColor = borderColor.cgColor
        resultLabel.translatesAutoresizingMaskIntoConstraints = false
        // Add padding via layoutMargins
        resultLabel.isHidden = true
        mainContainer.addSubview(resultLabel)

        NSLayoutConstraint.activate([
            resultLabel.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 8),
            resultLabel.leadingAnchor.constraint(equalTo: mainContainer.leadingAnchor, constant: 8),
            resultLabel.trailingAnchor.constraint(equalTo: mainContainer.trailingAnchor, constant: -8),
            resultLabel.heightAnchor.constraint(lessThanOrEqualToConstant: 80),
        ])

        // Button row
        let buttonRow = UIStackView()
        buttonRow.axis = .horizontal
        buttonRow.spacing = 8
        buttonRow.distribution = .fillProportionally
        buttonRow.translatesAutoresizingMaskIntoConstraints = false
        mainContainer.addSubview(buttonRow)

        // Enhance button
        enhanceButton = createButton(title: "⚡ Enhance", color: accentColor, action: #selector(enhanceTapped))
        buttonRow.addArrangedSubview(enhanceButton)

        // Insert button
        let insertButton = createButton(title: "📝 Insert", color: cardColor, action: #selector(insertTapped))
        insertButton.layer.borderWidth = 1
        insertButton.layer.borderColor = borderColor.cgColor
        buttonRow.addArrangedSubview(insertButton)

        // Clear button
        let clearButton = createButton(title: "🗑️", color: cardColor, action: #selector(clearTapped))
        clearButton.widthAnchor.constraint(equalToConstant: 50).isActive = true
        clearButton.layer.borderWidth = 1
        clearButton.layer.borderColor = borderColor.cgColor
        buttonRow.addArrangedSubview(clearButton)

        NSLayoutConstraint.activate([
            buttonRow.leadingAnchor.constraint(equalTo: mainContainer.leadingAnchor, constant: 8),
            buttonRow.trailingAnchor.constraint(equalTo: mainContainer.trailingAnchor, constant: -8),
            buttonRow.bottomAnchor.constraint(equalTo: mainContainer.bottomAnchor, constant: -8),
            buttonRow.heightAnchor.constraint(equalToConstant: 44),
        ])

        // Quick category buttons row
        let categoryRow = UIStackView()
        categoryRow.axis = .horizontal
        categoryRow.spacing = 6
        categoryRow.distribution = .fillEqually
        categoryRow.translatesAutoresizingMaskIntoConstraints = false
        mainContainer.addSubview(categoryRow)

        let categories = [
            ("💻", "Code"), ("✍️", "Write"), ("🎨", "Image"), ("📊", "Business")
        ]

        for (emoji, label) in categories {
            let btn = UIButton(type: .system)
            btn.setTitle("\(emoji) \(label)", for: .normal)
            btn.titleLabel?.font = UIFont.systemFont(ofSize: 11, weight: .medium)
            btn.setTitleColor(mutedColor, for: .normal)
            btn.backgroundColor = cardColor
            btn.layer.cornerRadius = 6
            btn.layer.borderWidth = 1
            btn.layer.borderColor = borderColor.cgColor
            categoryRow.addArrangedSubview(btn)
        }

        NSLayoutConstraint.activate([
            categoryRow.leadingAnchor.constraint(equalTo: mainContainer.leadingAnchor, constant: 8),
            categoryRow.trailingAnchor.constraint(equalTo: mainContainer.trailingAnchor, constant: -8),
            categoryRow.bottomAnchor.constraint(equalTo: buttonRow.topAnchor, constant: -8),
            categoryRow.heightAnchor.constraint(equalToConstant: 32),
        ])
    }

    private func createButton(title: String, color: UIColor, action: Selector) -> UIButton {
        let btn = UIButton(type: .system)
        btn.setTitle(title, for: .normal)
        btn.setTitleColor(.white, for: .normal)
        btn.backgroundColor = color
        btn.titleLabel?.font = UIFont.boldSystemFont(ofSize: 14)
        btn.layer.cornerRadius = 10
        btn.addTarget(self, action: action, for: .touchUpInside)
        return btn
    }

    // MARK: - Actions

    @objc private func enhanceTapped() {
        // Get text from the text input proxy (current text field in any app)
        guard let proxy = textDocumentProxy as? UITextDocumentProxy else { return }

        // Read all text before and after cursor
        let beforeCursor = proxy.documentContextBeforeInput ?? ""
        let afterCursor = proxy.documentContextAfterInput ?? ""
        let fullText = beforeCursor + afterCursor

        guard fullText.count >= 5 else {
            statusLabel.text = "⚠️ Type at least 5 characters first"
            return
        }

        statusLabel.text = "⏳ Enhancing..."
        enhanceButton.isEnabled = false
        enhanceButton.setTitle("⏳ ...", for: .normal)

        enhanceViaAPI(prompt: fullText) { [weak self] result in
            DispatchQueue.main.async {
                self?.enhanceButton.isEnabled = true
                self?.enhanceButton.setTitle("⚡ Enhance", for: .normal)

                if let enhanced = result {
                    self?.resultLabel.text = "  \(enhanced)"
                    self?.resultLabel.isHidden = false
                    self?.statusLabel.text = "✨ Enhanced! Tap 'Insert' to use it."
                } else {
                    self?.statusLabel.text = "❌ Enhancement failed. Try again."
                }
            }
        }
    }

    @objc private func insertTapped() {
        guard let text = resultLabel.text?.trimmingCharacters(in: .whitespaces), !text.isEmpty else {
            statusLabel.text = "⚠️ Enhance a prompt first"
            return
        }

        guard let proxy = textDocumentProxy as? UITextDocumentProxy else { return }

        // Delete existing text
        let beforeCursor = proxy.documentContextBeforeInput ?? ""
        let afterCursor = proxy.documentContextAfterInput ?? ""

        // Delete text before cursor
        for _ in 0..<beforeCursor.count {
            proxy.deleteBackward()
        }

        // Move cursor to end and delete after
        if !afterCursor.isEmpty {
            proxy.adjustTextPosition(byCharacterOffset: afterCursor.count)
            for _ in 0..<afterCursor.count {
                proxy.deleteBackward()
            }
        }

        // Insert enhanced text
        proxy.insertText(text)
        statusLabel.text = "✅ Enhanced prompt inserted!"

        // Reset after a moment
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            self?.statusLabel.text = "Tap 'Enhance' to upgrade your prompt"
        }
    }

    @objc private func clearTapped() {
        resultLabel.text = ""
        resultLabel.isHidden = true
        statusLabel.text = "Tap 'Enhance' to upgrade your prompt"
    }

    // MARK: - API

    private func enhanceViaAPI(prompt: String, completion: @escaping (String?) -> Void) {
        guard let url = URL(string: "\(supabaseURL)/functions/v1/sdk-generate-prompt") else {
            completion(nil)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 15

        let body: [String: Any] = [
            "prompt": prompt,
            "toolType": "text",
            "model": "google/gemini-2.5-flash"
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else {
                // Fallback to local enhancement
                completion(self.localEnhance(prompt: prompt))
                return
            }

            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                let enhanced = json["optimized"] as? String ?? json["enhanced"] as? String
                completion(enhanced ?? self.localEnhance(prompt: prompt))
            } else {
                completion(self.localEnhance(prompt: prompt))
            }
        }.resume()
    }

    private func localEnhance(prompt: String) -> String {
        return "\(prompt)\n\nPlease provide a comprehensive, well-structured response with specific details and actionable insights."
    }
}
