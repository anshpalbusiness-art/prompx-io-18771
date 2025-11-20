import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PromptEngineer } from "@/components/PromptEngineer";
import Layout from "@/components/Layout";
import { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin" />
          <p className="text-sm text-zinc-400 font-medium animate-pulse-subtle">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user}>
      <div className="w-full min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black">
        <PromptEngineer />
      </div>
    </Layout>
  );
};

export default Dashboard;
