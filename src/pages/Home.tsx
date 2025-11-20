import { useEffect, useState, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Zap, Shield, Users, TrendingUp, Brain, Workflow, GitBranch, TestTube, FileText, Activity, Plug, Lock } from "lucide-react";

// Memoized feature card for performance
const FeatureCard = memo(({ feature, user, navigate }: any) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`transition-opacity duration-700 ${isVisible ? "opacity-100" : "opacity-0"}`}
    >
      <Card 
        className="group cursor-pointer border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl hover:bg-zinc-900/90 hover:border-white/20 transition-all duration-500 hover:shadow-2xl hover:shadow-white/[0.08] hover:-translate-y-1 sm:hover:-translate-y-2 active:translate-y-0 active:scale-[0.98] overflow-hidden touch-manipulation will-change-transform rounded-2xl h-full flex flex-col min-h-[280px] sm:min-h-[320px]" 
        onClick={() => user ? navigate(feature.link) : navigate("/auth")}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader className="pb-3 p-5 sm:p-6 md:p-7 flex-1">
          <div className="p-3 sm:p-3.5 bg-white/[0.06] rounded-xl sm:rounded-2xl w-fit mb-4 sm:mb-5 group-hover:bg-white/[0.12] transition-all duration-300 group-hover:scale-110">
            <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" strokeWidth={2} />
          </div>
          <CardTitle className="text-white text-xl sm:text-xl md:text-2xl font-bold leading-tight mb-3 sm:mb-3">{feature.title}</CardTitle>
          <CardDescription className="text-zinc-400 text-base sm:text-base md:text-lg leading-relaxed">
            {feature.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 md:p-7 pt-0">
          <Button 
            variant="ghost" 
            className="gap-2 p-0 text-zinc-300 hover:text-white hover:bg-transparent transition-all duration-300 text-base sm:text-base md:text-lg font-medium group/btn h-auto touch-manipulation min-h-[44px] flex items-center"
          >
            Learn more <ArrowRight className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 group-hover/btn:translate-x-1 transition-transform duration-300" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [sectionsVisible, setSectionsVisible] = useState({
    hero: false,
    features: false,
    cta: false
  });

  const heroRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Check for existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Home - Initial session check:', session?.user?.email || 'No user');
      setUser(session?.user ?? null);
    });

    // Then set up listener for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Home - Auth state changed:', event, session?.user?.email || 'No user');
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
    if (featuresRef.current) observer.observe(featuresRef.current);
    if (ctaRef.current) observer.observe(ctaRef.current);

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Prompts",
      description: "Generate optimized prompts with advanced AI assistance",
      link: "/dashboard"
    },
    {
      icon: TrendingUp,
      title: "Analytics Dashboard",
      description: "Track performance and ROI with detailed analytics",
      link: "/analytics"
    },
    {
      icon: Shield,
      title: "Compliance Checking",
      description: "Ensure your prompts meet industry standards",
      link: "/compliance"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Work together seamlessly with your team",
      link: "/team"
    },
    {
      icon: Workflow,
      title: "Workflow Builder",
      description: "Create automated prompt workflows",
      link: "/dashboard"
    },
    {
      icon: Zap,
      title: "Prompt Marketplace",
      description: "Discover and share prompt templates",
      link: "/marketplace"
    },
    {
      icon: GitBranch,
      title: "Version Control",
      description: "Track changes and manage prompt versions effortlessly",
      link: "/dashboard"
    },
    {
      icon: TestTube,
      title: "A/B Testing",
      description: "Test and compare prompt variations for optimal results",
      link: "/optimization-lab"
    },
    {
      icon: FileText,
      title: "Prompt Templates",
      description: "Access pre-built templates for common use cases",
      link: "/marketplace"
    },
    {
      icon: Activity,
      title: "Real-time Monitoring",
      description: "Monitor prompt performance and usage in real-time",
      link: "/analytics"
    },
    {
      icon: Plug,
      title: "Integration Hub",
      description: "Connect seamlessly with your favorite tools and platforms",
      link: "/integrations"
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "Advanced security features and compliance controls",
      link: "/compliance"
    }
  ];

  return (
    <Layout user={user}>
      {/* Hero Section with Optimized Animated Background - Mobile Enhanced */}
      <section 
        id="hero"
        ref={heroRef}
        className={`relative px-4 sm:px-6 md:px-8 lg:px-10 py-12 sm:py-16 md:py-20 lg:py-24 xl:py-28 overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-black min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] flex items-center justify-center transition-opacity duration-1000 ${sectionsVisible.hero ? 'opacity-100' : 'opacity-0'}`}
        style={{ contentVisibility: 'auto' }}
      >
        {/* Animated PrompX background text - Enhanced like Auth page */}
        <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
          <div 
            className="text-[clamp(5.5rem,19vw,24vw)] sm:text-[clamp(8rem,19vw,22vw)] md:text-[clamp(11rem,20vw,24vw)] lg:text-[clamp(13rem,22vw,27vw)] font-extrabold whitespace-nowrap tracking-tighter animate-pulse-subtle"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.12) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.05em'
            }}
          >
            PrompX
          </div>
        </div>

        {/* Enhanced animated gradient orbs with glow - Like Auth page */}
        <div className="absolute top-0 -left-24 sm:-left-48 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse-subtle pointer-events-none -z-10" />
        <div className="absolute bottom-0 -right-24 sm:-right-48 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-gradient-to-tl from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse-subtle pointer-events-none -z-10" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 sm:w-72 sm:h-72 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-full blur-3xl animate-pulse-subtle pointer-events-none -z-10" style={{ animationDelay: '0.5s' }} />
        
        {/* Enhanced grid pattern with shimmer effect - Like Auth page */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none -z-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}
        />

        <div className="container mx-auto max-w-7xl relative z-10 w-full px-4 sm:px-6 lg:px-8">
          <div className={`text-center max-w-4xl mx-auto transition-all duration-1000 delay-300 ${sectionsVisible.hero ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-5 md:mb-6 lg:mb-8 leading-[1.1] sm:leading-tight px-0">
              <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent block leading-[1.15] pb-1 relative z-10">
                Professional Prompt Engineering Platform
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-zinc-400 mb-8 sm:mb-10 lg:mb-12 font-light max-w-3xl mx-auto leading-relaxed px-0">
              Create, optimize, and manage AI prompts with enterprise-grade tools
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-4 justify-center items-stretch sm:items-center max-w-xl mx-auto px-0">
              {user ? (
                <Button 
                  size="lg" 
                  onClick={() => navigate("/dashboard")} 
                  className="gap-2 bg-gradient-to-r from-white to-zinc-100 text-zinc-900 hover:from-zinc-50 hover:to-white font-bold transition-all duration-300 hover:shadow-2xl hover:shadow-white/30 min-h-[52px] sm:h-16 lg:h-[4.5rem] px-8 sm:px-10 lg:px-12 text-base sm:text-lg lg:text-xl rounded-xl sm:rounded-2xl hover:scale-105 active:scale-95 w-full sm:w-auto touch-manipulation"
                >
                  Go to Dashboard <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </Button>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    onClick={() => navigate("/auth")} 
                    className="bg-gradient-to-r from-white to-zinc-100 text-black hover:from-zinc-50 hover:to-white font-bold shadow-[0_4px_20px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_32px_rgba(255,255,255,0.35)] transition-all duration-300 rounded-xl sm:rounded-2xl hover:scale-[1.02] active:scale-95 min-h-[52px] px-8 sm:px-10 text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto touch-manipulation"
                  >
                    Get Started <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={() => navigate("/auth")}
                    className="border-2 border-white/[0.25] text-white hover:bg-white/[0.12] hover:text-white hover:border-white/[0.35] bg-transparent font-bold shadow-[0_2px_8px_rgba(255,255,255,0.1)] hover:shadow-[0_4px_16px_rgba(255,255,255,0.18)] transition-all duration-300 rounded-xl sm:rounded-2xl hover:scale-[1.02] active:scale-95 min-h-[52px] px-8 sm:px-10 text-base sm:text-lg w-full sm:w-auto touch-manipulation flex items-center justify-center"
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Mobile Optimized */}
      <section 
        id="features" 
        ref={featuresRef}
        className={`py-16 sm:py-20 md:py-24 lg:py-28 px-4 sm:px-6 md:px-8 lg:px-10 bg-gradient-to-b from-black via-zinc-950 to-zinc-900 transition-opacity duration-1000 ${sectionsVisible.features ? 'opacity-100' : 'opacity-0'}`}
        style={{ contentVisibility: 'auto' }}
      >
        {/* Lightweight background elements */}
        {sectionsVisible.features && (
          <>
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/[0.03] rounded-full blur-[100px] pointer-events-none will-change-transform" />
            <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-500/[0.03] rounded-full blur-[100px] pointer-events-none will-change-transform" />
          </>
        )}
        
        <div className="container mx-auto max-w-7xl relative z-10 px-0">
          <div className={`text-center mb-12 sm:mb-14 md:mb-16 lg:mb-20 transition-all duration-1000 delay-200 ${sectionsVisible.features ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} px-0`}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-5 sm:mb-6 lg:mb-8">
              <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-zinc-400 font-light max-w-3xl mx-auto leading-relaxed px-4">
              Everything you need to create, test, and deploy AI prompts at scale
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-7 lg:gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} user={user} navigate={navigate} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Mobile Optimized */}
      <section 
        id="cta"
        ref={ctaRef}
        className={`relative px-4 sm:px-6 md:px-8 lg:px-10 py-16 sm:py-20 md:py-24 lg:py-28 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black overflow-hidden transition-opacity duration-1000 ${sectionsVisible.cta ? 'opacity-100' : 'opacity-0'}`}
        style={{ contentVisibility: 'auto' }}
      >
        {/* Lightweight background elements */}
        {sectionsVisible.cta && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[700px] md:h-[700px] lg:w-[900px] lg:h-[900px] bg-gradient-to-r from-blue-500/[0.06] to-purple-500/[0.06] rounded-full blur-[120px] will-change-transform" />
          </div>
        )}
        
        {/* Lightweight grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.015] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        <div className="container mx-auto max-w-5xl text-center relative z-10 px-0">
          <div className={`space-y-6 sm:space-y-8 md:space-y-10 transition-all duration-700 delay-200 ${sectionsVisible.cta ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent leading-[1.1] sm:leading-tight">
              Ready to Get Started?
            </h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-zinc-400 font-light max-w-3xl mx-auto leading-relaxed px-4">
              Join thousands of professionals using our platform to create better AI prompts
            </p>
            <div className="pt-4 sm:pt-6 flex justify-center px-4">
              <Button 
                size="lg" 
                onClick={() => navigate(user ? "/dashboard" : "/auth")} 
                className="gap-2 bg-gradient-to-r from-white to-zinc-100 text-zinc-900 hover:from-zinc-50 hover:to-white font-bold transition-all duration-300 hover:shadow-2xl hover:shadow-white/30 min-h-[52px] sm:h-16 md:h-[4.5rem] px-8 sm:px-10 md:px-12 text-base sm:text-lg md:text-xl rounded-xl sm:rounded-2xl hover:scale-105 active:scale-95 w-full sm:w-auto max-w-md touch-manipulation flex items-center justify-center"
              >
                {user ? "Go to Dashboard" : "Start Free Trial"} <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Home;
