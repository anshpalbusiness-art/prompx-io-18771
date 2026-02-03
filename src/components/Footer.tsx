import React from 'react';
import { Github, Twitter, Linkedin, Mail, Sparkles } from 'lucide-react';
import { Logo } from '@/components/Logo';

export const Footer = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer className="relative border-t border-border bg-background w-full overflow-hidden flex-shrink-0">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-transparent to-muted/20 pointer-events-none"></div>

      <div className="container-responsive max-w-7xl relative z-10 py-16 sm:py-20 lg:py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-14 mb-12 lg:mb-16">
          {/* Brand Section */}
          <div className="space-y-6 sm:col-span-2 lg:col-span-1">
            <Logo size="lg" />
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xs font-medium">
              Advanced AI prompt engineering platform for creating perfect prompts with intelligent suggestions.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-6">
            <h4 className="text-xs sm:text-sm font-extrabold text-foreground tracking-[0.2em] uppercase flex items-center gap-2">
              <div className="h-px w-4 bg-gradient-to-r from-foreground to-transparent"></div>
              Product
            </h4>
            <ul className="space-y-3.5">
              <li>
                <button onClick={() => window.location.href = '/dashboard'} className="group text-sm sm:text-base text-muted-foreground hover:text-foreground transition-all duration-300 block py-1.5 hover:translate-x-2 font-semibold relative">
                  <span className="relative z-10">Dashboard</span>
                  <div className="absolute left-0 bottom-0 h-px w-0 bg-gradient-to-r from-foreground to-transparent group-hover:w-full transition-all duration-300"></div>
                </button>
              </li>
              <li>
                <button onClick={() => window.location.href = '/marketplace'} className="group text-sm sm:text-base text-muted-foreground hover:text-foreground transition-all duration-300 block py-1.5 hover:translate-x-2 font-semibold relative">
                  <span className="relative z-10">Marketplace</span>
                  <div className="absolute left-0 bottom-0 h-px w-0 bg-gradient-to-r from-foreground to-transparent group-hover:w-full transition-all duration-300"></div>
                </button>
              </li>
              <li>
                <button onClick={() => window.location.href = '/analytics'} className="group text-sm sm:text-base text-muted-foreground hover:text-foreground transition-all duration-300 block py-1.5 hover:translate-x-2 font-semibold relative">
                  <span className="relative z-10">Analytics</span>
                  <div className="absolute left-0 bottom-0 h-px w-0 bg-gradient-to-r from-foreground to-transparent group-hover:w-full transition-all duration-300"></div>
                </button>
              </li>
            </ul>
          </div>

          {/* Resources Links */}
          <div className="space-y-6">
            <h4 className="text-xs sm:text-sm font-extrabold text-foreground tracking-[0.2em] uppercase flex items-center gap-2">
              <div className="h-px w-4 bg-gradient-to-r from-foreground to-transparent"></div>
              Resources
            </h4>
            <ul className="space-y-3.5">
              <li>
                <button onClick={() => window.location.href = '/team'} className="group text-sm sm:text-base text-muted-foreground hover:text-foreground transition-all duration-300 block py-1.5 hover:translate-x-2 font-semibold relative">
                  <span className="relative z-10">Team</span>
                  <div className="absolute left-0 bottom-0 h-px w-0 bg-gradient-to-r from-foreground to-transparent group-hover:w-full transition-all duration-300"></div>
                </button>
              </li>
              <li>
                <button onClick={() => window.location.href = '/compliance'} className="group text-sm sm:text-base text-muted-foreground hover:text-foreground transition-all duration-300 block py-1.5 hover:translate-x-2 font-semibold relative">
                  <span className="relative z-10">Compliance</span>
                  <div className="absolute left-0 bottom-0 h-px w-0 bg-gradient-to-r from-foreground to-transparent group-hover:w-full transition-all duration-300"></div>
                </button>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-6">
            <h4 className="text-xs sm:text-sm font-extrabold text-foreground tracking-[0.2em] uppercase flex items-center gap-2">
              <div className="h-px w-4 bg-gradient-to-r from-foreground to-transparent"></div>
              Legal
            </h4>
            <ul className="space-y-3.5">
              <li>
                <button onClick={() => scrollToSection('privacy')} className="group text-sm sm:text-base text-muted-foreground hover:text-foreground transition-all duration-300 block py-1.5 hover:translate-x-2 font-semibold relative">
                  <span className="relative z-10">Privacy Policy</span>
                  <div className="absolute left-0 bottom-0 h-px w-0 bg-gradient-to-r from-foreground to-transparent group-hover:w-full transition-all duration-300"></div>
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('terms')} className="group text-sm sm:text-base text-muted-foreground hover:text-foreground transition-all duration-300 block py-1.5 hover:translate-x-2 font-semibold relative">
                  <span className="relative z-10">Terms of Service</span>
                  <div className="absolute left-0 bottom-0 h-px w-0 bg-gradient-to-r from-foreground to-transparent group-hover:w-full transition-all duration-300"></div>
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('cookies')} className="group text-sm sm:text-base text-muted-foreground hover:text-foreground transition-all duration-300 block py-1.5 hover:translate-x-2 font-semibold relative">
                  <span className="relative z-10">Cookie Policy</span>
                  <div className="absolute left-0 bottom-0 h-px w-0 bg-gradient-to-r from-foreground to-transparent group-hover:w-full transition-all duration-300"></div>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-10 sm:pt-12 border-t border-border">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-sm text-muted-foreground text-center sm:text-left font-semibold">
              © {new Date().getFullYear()} <span className="text-foreground font-bold">PromptX</span>. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground/80 text-center sm:text-right font-medium">
              Engineered with precision for AI excellence
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;