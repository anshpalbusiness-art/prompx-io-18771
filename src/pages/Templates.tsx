import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import AgentTemplates from "@/components/AgentTemplates";
import { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Sparkles,
  ShoppingCart,
  Mail,
  Youtube,
  TrendingUp,
  Code2,
  BarChart3,
  Globe,
  FileText,
  ArrowRight,
} from "lucide-react";

// ── Seeded workflow templates ────────────────────────────────────────────────
const workflowTemplates = [
  {
    id: "wt-ecommerce",
    title: "E-commerce Launch",
    description: "Product listing, pricing strategy, marketing campaign, and launch checklist.",
    category: "Business",
    icon: ShoppingCart,
    agents: 5,
    color: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30",
    tags: ["shopify", "marketing", "launch"],
  },
  {
    id: "wt-email",
    title: "Email Campaign Automation",
    description: "Segment audiences, write copy, schedule sends, and track opens/clicks.",
    category: "Marketing",
    icon: Mail,
    agents: 4,
    color: "from-blue-500/20 to-indigo-500/20",
    border: "border-blue-500/30",
    tags: ["email", "automation", "crm"],
  },
  {
    id: "wt-youtube",
    title: "YouTube Channel Growth",
    description: "Research trending topics, script videos, optimize SEO, and schedule uploads.",
    category: "Content",
    icon: Youtube,
    agents: 6,
    color: "from-red-500/20 to-rose-500/20",
    border: "border-red-500/30",
    tags: ["youtube", "video", "growth"],
  },
  {
    id: "wt-seo",
    title: "SEO Blog Pipeline",
    description: "Keyword research, outline generation, blog writing, and publishing.",
    category: "Marketing",
    icon: TrendingUp,
    agents: 4,
    color: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
    tags: ["seo", "blog", "content"],
  },
  {
    id: "wt-dev",
    title: "Feature Sprint Planner",
    description: "Gather requirements, break into tasks, assign agents, and track progress.",
    category: "Engineering",
    icon: Code2,
    agents: 5,
    color: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-500/30",
    tags: ["dev", "agile", "sprint"],
  },
  {
    id: "wt-analytics",
    title: "Weekly KPI Report",
    description: "Pull metrics from integrations, summarize trends, and generate a PDF report.",
    category: "Analytics",
    icon: BarChart3,
    agents: 3,
    color: "from-cyan-500/20 to-sky-500/20",
    border: "border-cyan-500/30",
    tags: ["analytics", "reporting", "kpi"],
  },
  {
    id: "wt-social",
    title: "Social Media Content Calendar",
    description: "Plan a month of content, generate captions, create images, and schedule posts.",
    category: "Marketing",
    icon: Globe,
    agents: 5,
    color: "from-pink-500/20 to-fuchsia-500/20",
    border: "border-pink-500/30",
    tags: ["social", "content", "scheduling"],
  },
  {
    id: "wt-legal",
    title: "Contract Review Pipeline",
    description: "Upload contracts, extract key terms, flag risks, and generate summaries.",
    category: "Legal",
    icon: FileText,
    agents: 4,
    color: "from-zinc-400/20 to-slate-400/20",
    border: "border-zinc-500/30",
    tags: ["legal", "contracts", "review"],
  },
];

const categories = ["All", ...Array.from(new Set(workflowTemplates.map((t) => t.category)))];

const Templates = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"workflow" | "prompt">("workflow");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const filtered =
    selectedCategory === "All"
      ? workflowTemplates
      : workflowTemplates.filter((t) => t.category === selectedCategory);

  const handleUseTemplate = (template: (typeof workflowTemplates)[0]) => {
    // Navigate to workflow with template ID for offline loading (no API call needed)
    navigate("/workflow", { state: { templateId: template.id } });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-subtle">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} showHeader={false}>
      <div className="w-full min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="container-responsive mx-auto max-w-6xl py-8 sm:py-12 md:py-16 lg:py-20">
          {/* Header */}
          <div className="mb-6 sm:mb-8 md:mb-10 space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Templates
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Start fast with pre-built workflows and prompt templates
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-1 mb-8 w-fit">
            <button
              onClick={() => setActiveTab("workflow")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "workflow"
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                }`}
            >
              <Layers className="w-4 h-4" />
              Workflow Templates
            </button>
            <button
              onClick={() => setActiveTab("prompt")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "prompt"
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                }`}
            >
              <Sparkles className="w-4 h-4" />
              Prompt Templates
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "workflow" ? (
              <motion.div
                key="workflow"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedCategory === cat
                        ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                        : "bg-zinc-900/40 text-zinc-500 border border-zinc-800/40 hover:text-zinc-300 hover:border-zinc-700/40"
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Template Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map((template, i) => {
                    const Icon = template.icon;
                    return (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`group relative bg-gradient-to-br ${template.color} border ${template.border} rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all duration-300`}
                        onClick={() => handleUseTemplate(template)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-white/80" />
                          </div>
                          <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                            {template.category}
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-white mb-1.5">
                          {template.title}
                        </h3>
                        <p className="text-xs text-white/50 leading-relaxed mb-4 line-clamp-2">
                          {template.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-white/40">{template.agents} agents</span>
                          <div className="flex items-center gap-1 text-xs text-white/50 group-hover:text-white/80 transition-colors">
                            Use <ArrowRight className="w-3 h-3" />
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mt-3">
                          {template.tags.map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 text-white/40">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="prompt"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <AgentTemplates onSelectTemplate={() => { }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
};

export default Templates;
