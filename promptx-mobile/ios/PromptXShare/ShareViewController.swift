import UIKit
import Social

/**
 * PromptX Share Extension
 *
 * Lets users select text anywhere in iOS → Share → PromptX to enhance it.
 * The enhanced text is copied to clipboard for easy pasting back.
 */
class ShareViewController: UIViewController {

    // MARK: - UI Elements
    private var titleLabel: UILabel!
    private var inputTextView: UITextView!
    private var resultTextView: UITextView!
    private var enhanceButton: UIButton!
    private var copyButton: UIButton!
    private var closeButton: UIButton!
    private var statusLabel: UILabel!

    // MARK: - Constants
    private let supabaseURL = "https://tplfjmitflhxuttixqjq.supabase.co"
    private let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwbGZqbWl0ZmxoeHV0dGl4cWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MTY5NDQsImV4cCI6MjA1MjA5Mjk0NH0.L9MfjhFwCbGSqVFBJFsfWMVhNlMYEyN12cXMX2BZLvY"

    // MARK: - Colors
    private let bgColor = UIColor(red: 0.02, green: 0.03, blue: 0.09, alpha: 1.0)
    private let cardColor = UIColor(red: 0.04, green: 0.05, blue: 0.15, alpha: 1.0)
    private let accentColor = UIColor(red: 0.51, green: 0.55, blue: 0.97, alpha: 1.0)
    private let textColor = UIColor.white
    private let mutedColor = UIColor(white: 1.0, alpha: 0.45)
    private let borderColor = UIColor(white: 1.0, alpha: 0.12)

    // MARK: - Data
    private var originalText = ""
    private var enhancedText = ""

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        extractSharedText()
    }

    // MARK: - UI Setup

    private func setupUI() {
        view.backgroundColor = bgColor

        // Title
        titleLabel = UILabel()
        titleLabel.text = "⚡ PromptX Enhance"
        titleLabel.textColor = textColor
        titleLabel.font = UIFont.boldSystemFont(ofSize: 20)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(titleLabel)

        // Close button
        closeButton = UIButton(type: .system)
        closeButton.setTitle("✕", for: .normal)
        closeButton.setTitleColor(mutedColor, for: .normal)
        closeButton.titleLabel?.font = UIFont.systemFont(ofSize: 20)
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(closeButton)

        // Input text area
        inputTextView = UITextView()
        inputTextView.backgroundColor = cardColor
        inputTextView.textColor = textColor
        inputTextView.font = UIFont.systemFont(ofSize: 14)
        inputTextView.layer.cornerRadius = 12
        inputTextView.layer.borderWidth = 1
        inputTextView.layer.borderColor = borderColor.cgColor
        inputTextView.isEditable = true
        inputTextView.textContainerInset = UIEdgeInsets(top: 12, left: 8, bottom: 12, right: 8)
        inputTextView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(inputTextView)

        // Status
        statusLabel = UILabel()
        statusLabel.text = "Paste or type your prompt above"
        statusLabel.textColor = mutedColor
        statusLabel.font = UIFont.systemFont(ofSize: 12)
        statusLabel.textAlignment = .center
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(statusLabel)

        // Enhance button
        enhanceButton = UIButton(type: .system)
        enhanceButton.setTitle("⚡ Enhance Prompt", for: .normal)
        enhanceButton.setTitleColor(.white, for: .normal)
        enhanceButton.backgroundColor = accentColor
        enhanceButton.titleLabel?.font = UIFont.boldSystemFont(ofSize: 16)
        enhanceButton.layer.cornerRadius = 12
        enhanceButton.addTarget(self, action: #selector(enhanceTapped), for: .touchUpInside)
        enhanceButton.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(enhanceButton)

        // Result text area
        resultTextView = UITextView()
        resultTextView.backgroundColor = cardColor
        resultTextView.textColor = textColor
        resultTextView.font = UIFont.systemFont(ofSize: 14)
        resultTextView.layer.cornerRadius = 12
        resultTextView.layer.borderWidth = 1
        resultTextView.layer.borderColor = accentColor.withAlphaComponent(0.3).cgColor
        resultTextView.isEditable = false
        resultTextView.textContainerInset = UIEdgeInsets(top: 12, left: 8, bottom: 12, right: 8)
        resultTextView.isHidden = true
        resultTextView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(resultTextView)

        // Copy button
        copyButton = UIButton(type: .system)
        copyButton.setTitle("📋 Copy Enhanced Prompt", for: .normal)
        copyButton.setTitleColor(.white, for: .normal)
        copyButton.backgroundColor = UIColor(red: 0.20, green: 0.83, blue: 0.60, alpha: 1.0) // success
        copyButton.titleLabel?.font = UIFont.boldSystemFont(ofSize: 16)
        copyButton.layer.cornerRadius = 12
        copyButton.addTarget(self, action: #selector(copyTapped), for: .touchUpInside)
        copyButton.isHidden = true
        copyButton.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(copyButton)

        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            titleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),

            closeButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            closeButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            closeButton.widthAnchor.constraint(equalToConstant: 40),
            closeButton.heightAnchor.constraint(equalToConstant: 40),

            inputTextView.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 16),
            inputTextView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            inputTextView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            inputTextView.heightAnchor.constraint(equalToConstant: 100),

            statusLabel.topAnchor.constraint(equalTo: inputTextView.bottomAnchor, constant: 8),
            statusLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),

            enhanceButton.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 12),
            enhanceButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            enhanceButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            enhanceButton.heightAnchor.constraint(equalToConstant: 50),

            resultTextView.topAnchor.constraint(equalTo: enhanceButton.bottomAnchor, constant: 16),
            resultTextView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            resultTextView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            resultTextView.heightAnchor.constraint(equalToConstant: 120),

            copyButton.topAnchor.constraint(equalTo: resultTextView.bottomAnchor, constant: 12),
            copyButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            copyButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            copyButton.heightAnchor.constraint(equalToConstant: 50),
        ])
    }

    // MARK: - Extract shared text

    private func extractSharedText() {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else { return }

        for item in extensionItems {
            guard let attachments = item.attachments else { continue }
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier("public.plain-text") {
                    attachment.loadItem(forTypeIdentifier: "public.plain-text", options: nil) { [weak self] (data, error) in
                        DispatchQueue.main.async {
                            if let text = data as? String {
                                self?.inputTextView.text = text
                                self?.originalText = text
                                self?.statusLabel.text = "Text loaded — tap Enhance!"
                            }
                        }
                    }
                    return
                }
            }
        }
    }

    // MARK: - Actions

    @objc private func enhanceTapped() {
        let text = inputTextView.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard text.count >= 5 else {
            statusLabel.text = "⚠️ Enter at least 5 characters"
            return
        }

        enhanceButton.isEnabled = false
        enhanceButton.setTitle("⏳ Enhancing...", for: .normal)
        statusLabel.text = "Calling PromptX AI..."

        enhanceViaAPI(prompt: text) { [weak self] result in
            DispatchQueue.main.async {
                self?.enhanceButton.isEnabled = true
                self?.enhanceButton.setTitle("⚡ Re-enhance", for: .normal)

                if let enhanced = result {
                    self?.enhancedText = enhanced
                    self?.resultTextView.text = enhanced
                    self?.resultTextView.isHidden = false
                    self?.copyButton.isHidden = false
                    self?.statusLabel.text = "✨ Enhanced! Copy and paste it back."
                } else {
                    self?.statusLabel.text = "❌ Failed. Check internet and try again."
                }
            }
        }
    }

    @objc private func copyTapped() {
        UIPasteboard.general.string = enhancedText
        copyButton.setTitle("✅ Copied to Clipboard!", for: .normal)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        }
    }

    @objc private func closeTapped() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
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

        URLSession.shared.dataTask(with: request) { data, _, error in
            guard let data = data, error == nil else {
                completion(nil)
                return
            }

            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                let enhanced = json["optimized"] as? String ?? json["enhanced"] as? String
                completion(enhanced)
            } else {
                completion(nil)
            }
        }.resume()
    }
}
