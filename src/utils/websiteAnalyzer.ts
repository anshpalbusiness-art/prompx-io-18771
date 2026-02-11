// Website analyzer utility for extracting design information from URLs

export interface WebsiteAnalysis {
    url: string;
    colors: {
        primary: string[];
        secondary: string[];
        accent: string[];
    };
    layout: {
        hasHeader: boolean;
        hasNav: boolean;
        sections: number;
        hasFooter: boolean;
        layoutType: string; // "single-page", "multi-section", "landing"
    };
    typography: {
        headingFonts: string[];
        bodyFonts: string[];
    };
    style: string; // "modern", "minimalist", "bold", "corporate", etc.
    components: string[]; // "hero", "cards", "forms", "gallery", etc.
}

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 */
export function isValidUrl(url: string): boolean {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Ensures URL has protocol prefix
 */
export function normalizeUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
    }
    return url;
}

/**
 * Analyzes a website and extracts design information
 * Note: This is a simplified analysis that generates reasonable defaults
 * A full implementation would use screenshot analysis or backend parsing
 */
export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
    // Normalize and validate URL
    const normalizedUrl = normalizeUrl(url);

    if (!isValidUrl(normalizedUrl)) {
        throw new Error('Invalid URL provided');
    }

    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // For MVP, we'll generate a reasonable default analysis
    // In production, this would use actual website fetching/screenshot analysis
    const analysis: WebsiteAnalysis = {
        url: normalizedUrl,
        colors: {
            primary: ['#2563eb', '#1e40af', '#3b82f6'],
            secondary: ['#64748b', '#475569', '#94a3b8'],
            accent: ['#f59e0b', '#d97706', '#fbbf24']
        },
        layout: {
            hasHeader: true,
            hasNav: true,
            sections: 4,
            hasFooter: true,
            layoutType: 'multi-section'
        },
        typography: {
            headingFonts: ['Inter', 'Poppins', 'Roboto'],
            bodyFonts: ['System UI', 'Inter', 'Arial']
        },
        style: 'modern',
        components: ['hero', 'features', 'cards', 'cta', 'testimonials', 'footer']
    };

    return analysis;
}

/**
 * Generates a detailed prompt for recreating a website based on analysis
 */
export function generatePrompt(analysis: WebsiteAnalysis): string {
    const { url, colors, layout, typography, style, components } = analysis;

    return `Create a ${style} website inspired by ${url}

**Design Specifications:**

🎨 **Color Palette:**
- Primary Colors: ${colors.primary.join(', ')}
- Secondary Colors: ${colors.secondary.join(', ')}
- Accent Colors: ${colors.accent.join(', ')}

📐 **Layout Structure:**
- Type: ${layout.layoutType}
${layout.hasHeader ? '- Include a professional header with logo and navigation menu\n' : ''}${layout.hasNav ? '- Sticky navigation bar for easy access\n' : ''}- ${layout.sections} main content sections
${layout.hasFooter ? '- Comprehensive footer with links and information\n' : ''}

✍️ **Typography:**
- Heading Fonts: ${typography.headingFonts.join(', ')} or similar modern sans-serif
- Body Fonts: ${typography.bodyFonts.join(', ')} for readability

🧩 **Key Components to Include:**
${components.map(c => `- ${c.charAt(0).toUpperCase() + c.slice(1)} section`).join('\n')}

**Additional Requirements:**
- Fully responsive design (mobile, tablet, desktop)
- Modern CSS with flexbox/grid layouts
- Smooth animations and transitions
- Accessibility best practices (semantic HTML, ARIA labels)
- Fast loading and optimized performance
- Clean, maintainable code structure

**Tech Stack Recommendations:**
- HTML5 for semantic structure
- Modern CSS3 (or Tailwind CSS)
- Vanilla JavaScript or React/Vue
- Responsive images with srcset

Please provide the complete HTML, CSS, and JavaScript code to build this website.`;
}

/**
 * Generates starter code for recreating a website based on analysis
 */
export function generateCode(analysis: WebsiteAnalysis): string {
    const { colors, typography, style, components } = analysis;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${style.charAt(0).toUpperCase() + style.slice(1)} Website</title>
    <style>
        /* CSS Variables - Color Palette */
        :root {
            --primary: ${colors.primary[0]};
            --primary-dark: ${colors.primary[1]};
            --primary-light: ${colors.primary[2]};
            --secondary: ${colors.secondary[0]};
            --secondary-dark: ${colors.secondary[1]};
            --accent: ${colors.accent[0]};
            --text-dark: #1f2937;
            --text-light: #6b7280;
            --bg-light: #ffffff;
            --bg-gray: #f9fafb;
        }

        /* Reset & Base Styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: ${typography.bodyFonts[0]}, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: var(--text-dark);
            background: var(--bg-light);
        }

        h1, h2, h3, h4, h5, h6 {
            font-family: ${typography.headingFonts[0]}, -apple-system, BlinkMacSystemFont, sans-serif;
            font-weight: 700;
            line-height: 1.2;
            margin-bottom: 1rem;
        }

        /* Header & Navigation */
        .header {
            background: var(--bg-light);
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .nav {
            max-width: 1280px;
            margin: 0 auto;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--primary);
        }

        .nav-links {
            display: flex;
            gap: 2rem;
            list-style: none;
        }

        .nav-links a {
            text-decoration: none;
            color: var(--text-dark);
            font-weight: 500;
            transition: color 0.3s;
        }

        .nav-links a:hover {
            color: var(--primary);
        }

        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            padding: 6rem 2rem;
            text-align: center;
        }

        .hero h1 {
            font-size: 3rem;
            margin-bottom: 1.5rem;
            color: white;
        }

        .hero p {
            font-size: 1.25rem;
            margin-bottom: 2rem;
            opacity: 0.95;
        }

        /* Features Section */
        .features {
            max-width: 1280px;
            margin: 4rem auto;
            padding: 2rem;
        }

        .section-title {
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 3rem;
        }

        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }

        .feature-card {
            background: var(--bg-light);
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            transition: transform 0.3s, box-shadow 0.3s;
        }

        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        /* Button Styles */
        .btn {
            padding: 0.875rem 2rem;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            display: inline-block;
        }

        .btn-primary {
            background: var(--accent);
            color: white;
        }

        .btn-primary:hover {
            background: var(--primary-dark);
            transform: scale(1.05);
        }

        /* Footer */
        .footer {
            background: var(--text-dark);
            color: white;
            padding: 3rem 2rem;
            margin-top: 4rem;
        }

        .footer-content {
            max-width: 1280px;
            margin: 0 auto;
            text-align: center;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .hero h1 {
                font-size: 2rem;
            }
            
            .nav-links {
                flex-direction: column;
                gap: 1rem;
            }
        }
    </style>
</head>
<body>
    <!-- Header & Navigation -->
    <header class="header">
        <nav class="nav">
            <div class="logo">Your Brand</div>
            <ul class="nav-links">
                <li><a href="#home">Home</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>

    <!-- Hero Section -->
    <section class="hero" id="home">
        <h1>Welcome to Your ${style.charAt(0).toUpperCase() + style.slice(1)} Website</h1>
        <p>Transform your ideas into reality with our innovative solutions</p>
        <a href="#features" class="btn btn-primary">Get Started</a>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
        <h2 class="section-title">Our Features</h2>
        <div class="feature-grid">
            <div class="feature-card">
                <h3>Feature One</h3>
                <p>Description of your first amazing feature that solves user problems.</p>
            </div>
            <div class="feature-card">
                <h3>Feature Two</h3>
                <p>Description of your second amazing feature that adds value.</p>
            </div>
            <div class="feature-card">
                <h3>Feature Three</h3>
                <p>Description of your third amazing feature that stands out.</p>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="footer-content">
            <p>&copy; 2026 Your Brand. All rights reserved.</p>
            <p>Built with modern web technologies</p>
        </div>
    </footer>

    <script>
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Add scroll-based header shadow
        window.addEventListener('scroll', () => {
            const header = document.querySelector('.header');
            if (window.scrollY > 50) {
                header.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            } else {
                header.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
            }
        });
    </script>
</body>
</html>

<!-- 
    This is a starter template based on the analyzed website.
    
    Next Steps:
    1. Replace placeholder content with your actual text and images
    2. Customize colors in CSS variables to match your brand
    3. Add more sections as needed (testimonials, CTA, pricing, etc.)
    4. Optimize images and add lazy loading
    5. Test responsive design on various devices
    6. Add meta tags for SEO
    7. Consider using a framework like React or Vue for complex interactions
-->`;
}
