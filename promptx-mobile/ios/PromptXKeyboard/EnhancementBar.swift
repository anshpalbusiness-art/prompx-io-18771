import UIKit

/**
 * Enhancement suggestion bar displayed above the keyboard.
 * Shows enhancement status, preview, and action buttons.
 * Matches PromptX dark theme.
 */
class EnhancementBar: UIView {

    // MARK: - Callbacks

    var onUse: (() -> Void)?
    var onDismiss: (() -> Void)?

    // MARK: - UI Elements

    private let containerView = UIView()
    private let statusIcon = UILabel()
    private let statusLabel = UILabel()
    private let previewLabel = UILabel()
    private let useButton = UIButton(type: .system)
    private let dismissButton = UIButton(type: .system)
    private let buttonStack = UIStackView()

    // MARK: - Colors (PromptX Theme)

    private let bgColor = UIColor(red: 0.07, green: 0.07, blue: 0.12, alpha: 0.95) // #12121f
    private let borderColor = UIColor(red: 0.18, green: 0.18, blue: 0.27, alpha: 1.0) // #2d2d44
    private let accentColor = UIColor(red: 0.49, green: 0.23, blue: 0.93, alpha: 1.0) // #7c3aed
    private let textColor = UIColor(red: 0.89, green: 0.89, blue: 0.91, alpha: 1.0) // #e4e4e7
    private let mutedColor = UIColor(red: 0.44, green: 0.44, blue: 0.48, alpha: 1.0) // #71717a
    private let successColor = UIColor(red: 0.22, green: 0.80, blue: 0.47, alpha: 1.0)

    // MARK: - Init

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupViews()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupViews()
    }

    // MARK: - Setup

    private func setupViews() {
        // Container
        containerView.translatesAutoresizingMaskIntoConstraints = false
        containerView.backgroundColor = bgColor
        containerView.layer.cornerRadius = 12
        containerView.layer.borderWidth = 1
        containerView.layer.borderColor = borderColor.cgColor
        containerView.clipsToBounds = true
        addSubview(containerView)

        // Status row
        let statusStack = UIStackView(arrangedSubviews: [statusIcon, statusLabel])
        statusStack.axis = .horizontal
        statusStack.spacing = 6
        statusStack.alignment = .center
        statusStack.translatesAutoresizingMaskIntoConstraints = false

        statusIcon.font = .systemFont(ofSize: 14)
        statusIcon.text = "✨"

        statusLabel.font = .systemFont(ofSize: 12, weight: .semibold)
        statusLabel.textColor = accentColor
        statusLabel.text = "PromptX"

        containerView.addSubview(statusStack)

        // Preview
        previewLabel.font = .systemFont(ofSize: 11)
        previewLabel.textColor = mutedColor
        previewLabel.numberOfLines = 2
        previewLabel.translatesAutoresizingMaskIntoConstraints = false
        previewLabel.isHidden = true
        containerView.addSubview(previewLabel)

        // Buttons
        useButton.setTitle("✨ Use Enhanced", for: .normal)
        useButton.titleLabel?.font = .systemFont(ofSize: 11, weight: .semibold)
        useButton.setTitleColor(.white, for: .normal)
        useButton.backgroundColor = accentColor
        useButton.layer.cornerRadius = 6
        useButton.contentEdgeInsets = UIEdgeInsets(top: 6, left: 12, bottom: 6, right: 12)
        useButton.addTarget(self, action: #selector(useTapped), for: .touchUpInside)

        dismissButton.setTitle("Dismiss", for: .normal)
        dismissButton.titleLabel?.font = .systemFont(ofSize: 11, weight: .medium)
        dismissButton.setTitleColor(mutedColor, for: .normal)
        dismissButton.addTarget(self, action: #selector(dismissTapped), for: .touchUpInside)

        buttonStack.axis = .horizontal
        buttonStack.spacing = 8
        buttonStack.alignment = .center
        buttonStack.addArrangedSubview(dismissButton)
        buttonStack.addArrangedSubview(useButton)
        buttonStack.translatesAutoresizingMaskIntoConstraints = false
        buttonStack.isHidden = true
        containerView.addSubview(buttonStack)

        // Constraints
        NSLayoutConstraint.activate([
            containerView.topAnchor.constraint(equalTo: topAnchor),
            containerView.leadingAnchor.constraint(equalTo: leadingAnchor),
            containerView.trailingAnchor.constraint(equalTo: trailingAnchor),
            containerView.bottomAnchor.constraint(equalTo: bottomAnchor),

            statusStack.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 8),
            statusStack.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 12),
            statusStack.trailingAnchor.constraint(lessThanOrEqualTo: containerView.trailingAnchor, constant: -12),

            previewLabel.topAnchor.constraint(equalTo: statusStack.bottomAnchor, constant: 6),
            previewLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 12),
            previewLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -12),

            buttonStack.topAnchor.constraint(equalTo: previewLabel.bottomAnchor, constant: 8),
            buttonStack.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -12),
            buttonStack.bottomAnchor.constraint(equalTo: containerView.bottomAnchor, constant: -8),
        ])

        showIdle()
    }

    // MARK: - State Updates

    func showIdle() {
        UIView.animate(withDuration: 0.3) {
            self.statusIcon.text = "✨"
            self.statusLabel.text = "PromptX"
            self.statusLabel.textColor = self.accentColor
            self.previewLabel.isHidden = true
            self.buttonStack.isHidden = true
        }
    }

    func showEnhancing() {
        UIView.animate(withDuration: 0.3) {
            self.statusIcon.text = "⚡"
            self.statusLabel.text = "Enhancing..."
            self.statusLabel.textColor = self.accentColor
            self.previewLabel.isHidden = true
            self.buttonStack.isHidden = true
        }
    }

    func showReady(preview: String) {
        UIView.animate(withDuration: 0.4) {
            self.statusIcon.text = "✅"
            self.statusLabel.text = "Enhanced prompt ready"
            self.statusLabel.textColor = self.successColor
            self.previewLabel.text = String(preview.prefix(150)) + (preview.count > 150 ? "..." : "")
            self.previewLabel.isHidden = false
            self.buttonStack.isHidden = false
        }
    }

    func showPasted() {
        UIView.animate(withDuration: 0.3) {
            self.statusIcon.text = "🎯"
            self.statusLabel.text = "Prompt enhanced & pasted!"
            self.statusLabel.textColor = self.successColor
            self.previewLabel.isHidden = true
            self.buttonStack.isHidden = true
        }
    }

    func showError() {
        UIView.animate(withDuration: 0.3) {
            self.statusIcon.text = "⚠️"
            self.statusLabel.text = "Enhancement failed"
            self.statusLabel.textColor = self.mutedColor
            self.previewLabel.isHidden = true
            self.buttonStack.isHidden = true
        }

        // Auto-reset after 3 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
            self?.showIdle()
        }
    }

    // MARK: - Actions

    @objc private func useTapped() {
        onUse?()
    }

    @objc private func dismissTapped() {
        onDismiss?()
    }
}
