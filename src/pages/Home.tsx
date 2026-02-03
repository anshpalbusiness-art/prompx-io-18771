import { useEffect, useState, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Zap, Shield, Users, TrendingUp, Brain, Workflow, GitBranch, TestTube, FileText, Activity, Plug, Lock, CheckCircle, Star, Clock, Target, Code, MessageSquare, BarChart, Sparkles, Building2, Layers, Laptop, Share2 } from "lucide-react";
import Starfield from "@/components/Starfield";
import TrustedBy from "@/components/TrustedBy";

// Simplified feature card - instant render without observer overhead
const FeatureCard = memo(({ feature, user, navigate }: any) => {
  return (
    <Card
      className="group cursor-pointer border border-border/40 bg-card/40 backdrop-blur-md hover:bg-card/60 hover:border-primary/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 active:translate-y-0 active:scale-[0.98] overflow-hidden touch-manipulation will-change-transform rounded-2xl h-full flex flex-col relative"
      onClick={() => user ? navigate(feature.link) : navigate("/auth")}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Subtle glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />

      <CardHeader className="pb-4 p-6 md:p-7 flex-grow relative z-10">
        <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-2xl w-fit mb-5 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-all duration-300 group-hover:scale-110 shadow-sm ring-1 ring-white/10">
          <feature.icon className="w-8 h-8 md:w-9 md:h-9 text-primary" strokeWidth={2.5} />
        </div>
        <CardTitle className="text-foreground text-xl md:text-2xl font-bold leading-tight mb-3 group-hover:text-primary transition-colors duration-300">{feature.title}</CardTitle>
        <CardDescription className="text-foreground/70 dark:text-muted-foreground text-base md:text-lg leading-relaxed font-medium">
          {feature.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 md:p-7 pt-0 mt-auto relative z-10">
        <div className="flex items-center gap-2 text-primary/80 font-bold text-base md:text-lg group-hover:gap-3 group-hover:text-primary transition-all duration-300">
          Learn more <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
        </div>
      </CardContent>
    </Card>
  );
});

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [sectionsVisible, setSectionsVisible] = useState({
    hero: true,
    trustedBy: true,
    trust: true,
    features: true,
    howItWorks: true,
    showcase: true,
    useCases: true,
    pricing: true,
    faq: true,
    cta: true
  });

  const heroRef = useRef<HTMLElement>(null);
  const trustedByRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const howItWorksRef = useRef<HTMLElement>(null);
  const showcaseRef = useRef<HTMLElement>(null);
  const useCasesRef = useRef<HTMLElement>(null);
  const pricingRef = useRef<HTMLElement>(null);
  const faqRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Check for existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Then set up listener for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Intersection Observer for smooth animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -10% 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          setSectionsVisible(prev => ({ ...prev, [id]: true }));
        }
      });
    }, observerOptions);

    if (heroRef.current) observer.observe(heroRef.current);
    if (trustedByRef.current) observer.observe(trustedByRef.current);
    if (trustRef.current) observer.observe(trustRef.current);
    if (featuresRef.current) observer.observe(featuresRef.current);
    if (howItWorksRef.current) observer.observe(howItWorksRef.current);
    if (showcaseRef.current) observer.observe(showcaseRef.current);
    if (useCasesRef.current) observer.observe(useCasesRef.current);
    if (pricingRef.current) observer.observe(pricingRef.current);
    if (faqRef.current) observer.observe(faqRef.current);
    if (ctaRef.current) observer.observe(ctaRef.current);

    return () => observer.disconnect();
  }, []);

  const coreFeatures = [
    {
      icon: Brain,
      title: "AI-Powered Prompts",
      description: "Generate optimized prompts with advanced AI assistance and smart suggestions",
      link: "/dashboard"
    },
    {
      icon: Sparkles,
      title: "Prompt Optimization",
      description: "Automatically enhance your prompts for better results and efficiency",
      link: "/optimization-lab"
    },
    {
      icon: Layers,
      title: "Template Library",
      description: "Access 500+ pre-built templates for common use cases and industries",
      link: "/templates"
    },
    {
      icon: TestTube,
      title: "A/B Testing",
      description: "Compare prompt variations and identify the best performing options",
      link: "/optimization-lab"
    },
  ];

  const collaborationFeatures = [
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Work seamlessly with your team with real-time collaboration features",
      link: "/team"
    },
    {
      icon: GitBranch,
      title: "Version Control",
      description: "Track changes and manage prompt versions with Git-like workflows",
      link: "/dashboard"
    },
    {
      icon: MessageSquare,
      title: "Comments & Feedback",
      description: "Collaborate with inline comments and feedback loops",
      link: "/team"
    },
    {
      icon: Workflow,
      title: "Workflow Builder",
      description: "Create automated prompt workflows and reusable processes",
      link: "/workflow"
    },
  ];

  const analyticsFeatures = [
    {
      icon: TrendingUp,
      title: "Advanced Analytics",
      description: "Track performance, ROI, and usage with comprehensive dashboards",
      link: "/analytics"
    },
    {
      icon: Activity,
      title: "Real-time Monitoring",
      description: "Monitor prompt performance and usage in real-time with live metrics",
      link: "/analytics"
    },
    {
      icon: BarChart,
      title: "Custom Reports",
      description: "Generate detailed reports tailored to your specific needs",
      link: "/analytics"
    },
    {
      icon: Target,
      title: "Benchmark Testing",
      description: "Compare performance against industry standards and best practices",
      link: "/benchmark"
    },
  ];

  const securityFeatures = [
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption and security features for your sensitive data",
      link: "/compliance"
    },
    {
      icon: Lock,
      title: "Compliance Controls",
      description: "Ensure your prompts meet industry standards and regulations",
      link: "/compliance"
    },
    {
      icon: Plug,
      title: "Secure Integrations",
      description: "Connect safely with your favorite tools through encrypted channels",
      link: "/integrations"
    },
    {
      icon: Code,
      title: "API Access",
      description: "Secure API access with granular permissions and rate limiting",
      link: "/api-keys"
    },
  ];

  const stats = [
    { value: "50K+", label: "Active Users" },
    { value: "10M+", label: "Prompts Generated" },
    { value: "99.9%", label: "Uptime" },
    { value: "2.5x", label: "Average ROI" },
  ];

  const steps = [
    {
      number: "01",
      title: "Create Your Prompt",
      description: "Start with a template or create from scratch using our intuitive editor"
    },
    {
      number: "02",
      title: "Optimize & Test",
      description: "Use AI suggestions and A/B testing to refine your prompt for best results"
    },
    {
      number: "03",
      title: "Deploy & Monitor",
      description: "Launch your prompt and track performance with real-time analytics"
    },
    {
      number: "04",
      title: "Iterate & Improve",
      description: "Continuously improve based on data-driven insights and team feedback"
    },
  ];

  const useCases = [
    {
      icon: Laptop,
      title: "Developers",
      description: "Streamline code generation, documentation, and debugging with optimized prompts",
      benefits: ["Code completion", "Bug fixing", "Documentation generation"]
    },
    {
      icon: Share2,
      title: "Marketers",
      description: "Create compelling content, ad copy, and campaigns that convert",
      benefits: ["Ad copy generation", "Content marketing", "SEO optimization"]
    },
    {
      icon: Users,
      title: "Teams",
      description: "Collaborate on prompts with version control and feedback loops",
      benefits: ["Team collaboration", "Shared templates", "Workflow automation"]
    },
    {
      icon: Building2,
      title: "Enterprises",
      description: "Scale AI operations with enterprise-grade security and compliance",
      benefits: ["SSO integration", "Advanced security", "Dedicated support"]
    },
  ];

  const faqs = [
    {
      question: "What is prompt engineering?",
      answer: "Prompt engineering is the practice of designing and optimizing inputs (prompts) for AI models to achieve desired outputs. It's essential for getting the best results from AI systems."
    },
    {
      question: "How does PromptX help improve my prompts?",
      answer: "PromptX uses AI-powered analysis to suggest improvements, provides A/B testing capabilities, offers access to proven templates, and gives you analytics to measure performance objectively."
    },
    {
      question: "Can I collaborate with my team?",
      answer: "Yes! PromptX includes robust team collaboration features including real-time editing, version control, comments, and shared template libraries."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use bank-level encryption, comply with industry standards (SOC 2, GDPR), and offer enterprise-grade security features including SSO and role-based access control."
    },
    {
      question: "What integrations do you support?",
      answer: "PromptX integrates with major AI platforms (OpenAI, Anthropic, Google), development tools (GitHub, VS Code), and collaboration platforms (Slack, Teams). Check our integrations page for the full list."
    },
    {
      question: "Can I try before purchasing?",
      answer: "Yes! We offer a 14-day free trial with full access to all features. No credit card required to start."
    },
  ];

  return (
    <div className="min-h-screen w-full bg-background overflow-x-hidden">
      {/* Global Starfield Background - Fixed to viewport */}
      <Starfield speed={0.3} density={0.8} className="fixed inset-0 z-0 pointer-events-none" />

      {/* ===== HERO SECTION ===== */}
      <section
        id="hero"
        ref={heroRef}
        className="relative px-4 sm:px-6 md:px-8 lg:px-10 py-20 sm:py-24 md:py-28 lg:py-36 overflow-hidden min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] flex items-center justify-center"
      >
        {/* Hero Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 z-10 flex items-center justify-center select-none">
            <div className="text-[clamp(5rem,15vw,20vw)] sm:text-[clamp(6rem,16vw,18vw)] md:text-[clamp(8rem,17vw,20vw)] lg:text-[clamp(10rem,18vw,22vw)] font-black whitespace-nowrap tracking-[-0.05em] animate-pulse-subtle bg-gradient-to-br from-foreground/[0.08] via-foreground/[0.15] to-foreground/[0.08] bg-clip-text text-transparent">
              PromptX
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-6xl relative z-20 w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-5xl mx-auto">
            {/* Tagline */}
            <p className="text-sm sm:text-base md:text-lg font-bold tracking-[0.3em] uppercase mb-6 bg-gradient-to-r from-slate-800 via-blue-500 to-slate-800 dark:from-slate-500 dark:via-white dark:to-slate-500 bg-clip-text text-transparent animate-text-shimmer bg-[length:200%_auto]">
              UNIVERSE IS YOURS
            </p>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-10 sm:mb-12 md:mb-14 leading-[0.9] tracking-tighter overflow-visible select-none max-w-[90vw] mx-auto">
              <span className="text-foreground block whitespace-nowrap">
                Professional Prompt
              </span>
              <span className="bg-gradient-to-b from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent block pb-4 whitespace-nowrap">
                Engineering Platform
              </span>
            </h1>
            <p className="text-xl sm:text-2xl md:text-3xl text-foreground/80 dark:text-foreground/70 mb-10 sm:mb-12 lg:mb-14 font-medium max-w-4xl mx-auto leading-relaxed">
              Create, optimize, and manage AI prompts with <span className="text-foreground font-semibold">enterprise-grade tools</span>. Boost productivity by <span className="font-bold text-primary inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md">10x <TrendingUp className="w-5 h-5" /></span> with AI-powered suggestions.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-stretch sm:items-center max-w-xl mx-auto mb-14">
              {user ? (
                <Button
                  size="lg"
                  onClick={() => navigate("/dashboard")}
                  className="gap-3 bg-primary text-primary-foreground hover:bg-primary/90 font-bold transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30 h-16 lg:h-[4.5rem] px-10 lg:px-12 text-lg lg:text-xl rounded-2xl hover:scale-[1.03] active:scale-95 w-full sm:w-auto"
                >
                  Go to Dashboard <ArrowRight className="w-6 h-6" />
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate("/auth")}
                    className="relative overflow-hidden bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-xl shadow-primary/20 transition-all duration-300 rounded-2xl hover:scale-[1.03] active:scale-95 h-16 px-10 text-lg flex items-center justify-center gap-3 w-full sm:w-auto group"
                  >
                    <span className="relative z-10 flex items-center gap-3">Start Free Trial <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /></span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-indigo-600 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/pricing")}
                    className="border-2 border-border/80 bg-background/50 backdrop-blur hover:bg-accent hover:border-primary/50 font-bold transition-all duration-300 rounded-2xl hover:scale-[1.03] active:scale-95 h-16 px-10 text-lg w-full sm:w-auto shadow-sm"
                  >
                    View Pricing
                  </Button>
                </>
              )}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-base font-medium text-foreground/70 dark:text-foreground/60">
              <div className="flex items-center gap-2.5 bg-muted/40 px-4 py-2 rounded-full border border-border/30 backdrop-blur-sm">
                <CheckCircle className="w-5 h-5 text-primary" strokeWidth={2.5} />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2.5 bg-muted/40 px-4 py-2 rounded-full border border-border/30 backdrop-blur-sm">
                <CheckCircle className="w-5 h-5 text-primary" strokeWidth={2.5} />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2.5 bg-muted/40 px-4 py-2 rounded-full border border-border/30 backdrop-blur-sm">
                <CheckCircle className="w-5 h-5 text-primary" strokeWidth={2.5} />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRUSTED BY MARQUEE ===== */}
      <div id="trustedBy" ref={trustedByRef}>
        <TrustedBy />
      </div>

      {/* ===== TRUST INDICATORS ===== */}
      <section
        id="trust"
        ref={trustRef}
        className="relative z-10 py-20 sm:py-24 border-b border-border/50"
      >
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 sm:gap-16">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center"
              >
                <div className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/50 mb-3 tracking-tight">{stat.value}</div>
                <div className="text-base sm:text-lg text-foreground/70 dark:text-muted-foreground font-semibold uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CORE FEATURES ===== */}
      <section
        id="features"
        ref={featuresRef}
        className="relative z-10 py-24 sm:py-28 md:py-32"
      >
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-20 sm:mb-24">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground mb-6 tracking-tight">
              Powerful Features for <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/50 bg-clip-text text-transparent">Every Need</span>
            </h2>
            <p className="text-xl sm:text-2xl text-foreground/70 dark:text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed">
              Everything you need to create, optimize, and manage professional AI prompts
            </p>
          </div>

          {/* Core Features */}
          <div className="mb-32 relative">
            <div className="absolute -left-20 top-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
            <div className="text-center mb-12">
              <h3 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center justify-center gap-3">
                <Brain className="w-10 h-10 text-primary" strokeWidth={2} />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Core Capabilities</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {coreFeatures.map((feature, index) => (
                <FeatureCard key={index} feature={feature} user={user} navigate={navigate} />
              ))}
            </div>
          </div>

          {/* Collaboration Features */}
          <div className="mb-32 relative">
            <div className="absolute -right-20 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
            <div className="text-center mb-12">
              <h3 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center justify-center gap-3">
                <Users className="w-10 h-10 text-primary" strokeWidth={2} />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Collaboration Tools</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {collaborationFeatures.map((feature, index) => (
                <FeatureCard key={index} feature={feature} user={user} navigate={navigate} />
              ))}
            </div>
          </div>

          {/* Analytics Features */}
          <div className="mb-32">
            <div className="text-center mb-12">
              <h3 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center justify-center gap-3">
                <TrendingUp className="w-10 h-10 text-primary" strokeWidth={2} />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Analytics & Insights</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {analyticsFeatures.map((feature, index) => (
                <FeatureCard key={index} feature={feature} user={user} navigate={navigate} />
              ))}
            </div>
          </div>

          {/* Security Features */}
          <div>
            <div className="text-center mb-12">
              <h3 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center justify-center gap-3">
                <Shield className="w-10 h-10 text-foreground" strokeWidth={2} />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Security & Compliance</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {securityFeatures.map((feature, index) => (
                <FeatureCard key={index} feature={feature} user={user} navigate={navigate} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section
        id="howItWorks"
        ref={howItWorksRef}
        className="relative z-10 py-24 sm:py-28 md:py-32 bg-muted/30 dark:bg-muted/10 border-y border-border/50 backdrop-blur-sm"
      >
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 sm:mb-20">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground mb-6 tracking-tight">
              From Idea to <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Optimization</span>
            </h2>
            <p className="text-xl sm:text-2xl text-foreground/70 dark:text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed">
              Get started in minutes with our simple four-step process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative"
              >
                <Card className="h-full border border-border/50 bg-card/60 backdrop-blur-md hover:border-primary/40 transition-all duration-300 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
                  <CardHeader className="pb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-foreground/5 to-foreground/10 mb-6 shadow-inner ring-1 ring-white/10">
                      <span className="text-3xl font-extrabold text-foreground">{step.number}</span>
                    </div>
                    <CardTitle className="text-2xl sm:text-3xl mb-4 text-foreground font-bold">{step.title}</CardTitle>
                    <CardDescription className="text-base sm:text-lg leading-relaxed text-foreground/70 dark:text-muted-foreground font-medium">
                      {step.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-1 bg-gradient-to-r from-foreground/20 to-transparent rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== USE CASES ===== */}
      <section
        id="useCases"
        ref={useCasesRef}
        className="relative z-10 py-24 sm:py-28 md:py-32"
      >
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 sm:mb-20">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground mb-6 tracking-tight">
              Built for <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Every Team</span>
            </h2>
            <p className="text-xl sm:text-2xl text-foreground/70 dark:text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed">
              Tailored solutions for developers, marketers, teams, and enterprises
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {useCases.map((useCase, index) => (
              <Card
                key={index}
                className="border border-border/50 bg-card/50 backdrop-blur-md hover:border-primary/40 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2 rounded-2xl"
              >
                <CardHeader className="p-7">
                  <div className="p-4 bg-foreground/5 dark:bg-foreground/10 rounded-2xl w-fit mb-5 shadow-sm ring-1 ring-white/10">
                    <useCase.icon className="w-9 h-9 text-foreground" strokeWidth={2.5} />
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl mb-4 text-foreground font-bold">{useCase.title}</CardTitle>
                  <CardDescription className="text-base sm:text-lg leading-relaxed mb-6 text-foreground/70 dark:text-muted-foreground font-medium">
                    {useCase.description}
                  </CardDescription>
                  <div className="space-y-3">
                    {useCase.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-base text-foreground/80 dark:text-muted-foreground">
                        <CheckCircle className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span className="font-medium">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING PREVIEW ===== */}
      <section
        id="pricing"
        ref={pricingRef}
        className="relative z-10 py-24 sm:py-28 md:py-32 bg-muted/30 dark:bg-muted/10 border-y border-border/50 backdrop-blur-sm"
      >
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground mb-6 tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl sm:text-2xl text-foreground/70 dark:text-muted-foreground max-w-3xl mx-auto mb-10 font-medium leading-relaxed">
              Start free, scale as you grow. All plans include a 14-day free trial.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/pricing")}
              className="bg-foreground text-background hover:bg-foreground/90 font-bold text-xl px-12 h-16 rounded-2xl hover:scale-[1.03] transition-all duration-300 shadow-xl shadow-foreground/20"
            >
              View All Plans <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section
        id="faq"
        ref={faqRef}
        className="relative z-10 py-24 sm:py-28 md:py-32"
      >
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 sm:mb-20">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground mb-6 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xl sm:text-2xl text-foreground/70 dark:text-muted-foreground font-medium leading-relaxed">
              Everything you need to know about PromptX
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-5">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border/50 rounded-2xl px-7 bg-card/50 backdrop-blur-md shadow-sm hover:border-primary/30 transition-all duration-300"
              >
                <AccordionTrigger className="text-left text-lg sm:text-xl font-bold hover:text-foreground transition-colors py-7 text-foreground">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-base sm:text-lg text-foreground/70 dark:text-muted-foreground leading-relaxed pb-7 font-medium">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section
        id="cta"
        ref={ctaRef}
        className="relative py-28 sm:py-32 md:py-40 overflow-hidden border-t border-border/50"
      >
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-foreground mb-8 tracking-tight leading-tight">
              Ready to <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Transform</span> Your<br />Prompt Engineering?
            </h2>
            <p className="text-xl sm:text-2xl md:text-3xl text-foreground/80 dark:text-foreground/70 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
              Join thousands of teams already using PromptX to boost their AI productivity
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              {!user && (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate("/auth")}
                    className="bg-foreground text-background hover:bg-foreground/90 font-bold text-xl sm:text-2xl px-14 h-20 rounded-2xl hover:scale-[1.03] transition-all duration-300 shadow-2xl shadow-foreground/30"
                  >
                    Start Free Trial <ArrowRight className="w-7 h-7 ml-3" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="border-2 border-border/80 bg-background/50 backdrop-blur hover:bg-accent hover:border-foreground/50 text-xl px-12 h-20 rounded-2xl hover:scale-[1.03] transition-all duration-300 font-bold shadow-sm"
                  >
                    View Demo
                  </Button>
                </>
              )}
              {user && (
                <Button
                  size="lg"
                  onClick={() => navigate("/dashboard")}
                  className="bg-foreground text-background hover:bg-foreground/90 font-bold text-2xl px-14 h-20 rounded-2xl hover:scale-[1.03] transition-all duration-300 shadow-2xl shadow-foreground/30"
                >
                  Go to Dashboard <ArrowRight className="w-7 h-7 ml-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Home;
