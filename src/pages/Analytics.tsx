import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Terminal, Activity, Zap, Cpu, Network, Hash, DollarSign } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip
} from "recharts";

const MOCK_ACTIVITY = [
  { id: "task_1x9a", model: "gpt-4-turbo", status: "SUCCESS", latency: 842, time: "Just now" },
  { id: "task_2b8c", model: "claude-3-opus", status: "SUCCESS", latency: 1204, time: "2m ago" },
  { id: "op_3c7d", model: "gpt-3.5-turbo", status: "FAILED", latency: 240, time: "5m ago" },
  { id: "job_4d6e", model: "mixtral-8x7b", status: "SUCCESS", latency: 530, time: "12m ago" },
  { id: "task_5e5f", model: "gpt-4-turbo", status: "SUCCESS", latency: 910, time: "15m ago" },
  { id: "proc_6g7h", model: "claude-3-sonnet", status: "SUCCESS", latency: 450, time: "28m ago" },
];

const MODEL_DATA = [
  { subject: 'Speed', A: 90, fullMark: 100 },
  { subject: 'Cost-Eff', A: 65, fullMark: 100 },
  { subject: 'Accuracy', A: 98, fullMark: 100 },
  { subject: 'Context', A: 100, fullMark: 100 },
  { subject: 'Latency', A: 85, fullMark: 100 },
  { subject: 'Reliability', A: 95, fullMark: 100 },
];

const NODE_DATA = [
  { x: 10, y: 30, z: 200, name: "Data Synthesis" },
  { x: 30, y: 70, z: 500, name: "Logic Reasoning" },
  { x: 50, y: 20, z: 100, name: "System Optimization" },
  { x: 70, y: 80, z: 300, name: "Code Execution" },
  { x: 90, y: 40, z: 400, name: "Vision Analysis" },
];

const Analytics = () => {
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
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="animate-pulse-subtle">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} showHeader={false}>
      <div className="w-full min-h-screen bg-[#050505] text-zinc-300 p-4 md:p-8 font-mono overflow-auto">
        <div className="max-w-[1400px] mx-auto pt-14 lg:pt-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-4">
            <h1 className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-zinc-400" />
              COMMAND CENTER
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-xs text-zinc-500 hidden sm:inline-block">SYSTEM.STATUS: ONLINE</span>
            </div>
          </div>

          {/* Bento Grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[minmax(140px,auto)] gap-4">

            {/* BIG NUMBERS - NEURAL OPS */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="md:col-span-8 lg:col-span-8 row-span-2 bg-[#0a0a0a] border border-zinc-800/50 rounded-3xl p-6 sm:p-8 flex flex-col justify-between"
            >
              <div className="text-zinc-500 text-xs sm:text-sm flex items-center gap-2 tracking-widest font-semibold">
                <Hash className="w-4 h-4 text-zinc-400" /> NEURAL OPERATIONS EXECUTED
              </div>
              <div className="text-6xl sm:text-8xl lg:text-9xl font-black text-white tracking-tighter my-4">
                14.2<span className="text-zinc-700">M</span>
              </div>
              <div className="text-zinc-500 text-xs sm:text-sm flex gap-6 tracking-widest">
                <span><span className="text-zinc-300 font-bold">8.4M</span> ANALYSIS</span>
                <span><span className="text-zinc-300 font-bold">5.8M</span> SYNTHESIS</span>
              </div>
            </motion.div>

            {/* BIG NUMBERS - COST */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="md:col-span-4 lg:col-span-4 row-span-2 bg-[#0a0a0a] border border-zinc-800/50 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rounded-full blur-3xl -mr-10 -mt-10" />
              <div className="text-zinc-500 text-xs sm:text-sm flex items-center gap-2 tracking-widest font-semibold relative z-10">
                <DollarSign className="w-4 h-4 text-zinc-400" /> ESTIMATED COMPUTE COST
              </div>
              <div className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tighter my-4 relative z-10">
                $284<span className="text-zinc-700">.50</span>
              </div>
              <div className="text-zinc-500 text-xs sm:text-sm tracking-widest relative z-10">
                PROJ. EOM: <span className="text-white font-bold">$412.00</span>
              </div>
            </motion.div>

            {/* LIVE ACTIVITY FEED */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="md:col-span-12 lg:col-span-5 row-span-3 bg-[#0a0a0a] border border-zinc-800/50 rounded-3xl p-6 flex flex-col"
            >
              <div className="text-zinc-500 text-xs tracking-widest font-semibold mb-4 flex items-center gap-2 border-b border-zinc-800/50 pb-4">
                <Terminal className="w-4 h-4 text-zinc-400" /> LIVE ACTIVITY STREAM
              </div>
              <div className="flex-1 overflow-auto space-y-3 pr-2 scrollbar-thin">
                {MOCK_ACTIVITY.map((log, i) => (
                  <div key={i} className="flex flex-col gap-1 p-3 rounded-xl bg-black border border-zinc-800/30 hover:border-zinc-700 transition-colors">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500 font-medium">{log.id}</span>
                      <span className="text-zinc-600">{log.time}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-zinc-200 text-sm font-semibold">{log.model}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">{log.latency}ms</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${log.status === 'SUCCESS' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300'}`}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* RADAR CHART */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="md:col-span-6 lg:col-span-4 row-span-3 bg-[#0a0a0a] border border-zinc-800/50 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden"
            >
              <div className="absolute top-6 left-6 text-zinc-500 text-xs tracking-widest font-semibold flex items-center gap-2 z-10 w-[calc(100%-3rem)] border-b border-zinc-800/50 pb-4">
                <Cpu className="w-4 h-4 text-zinc-400" /> MODEL UTILIZATION
              </div>
              <div className="w-full h-[250px] mt-12 sm:mt-16 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={MODEL_DATA}>
                    <PolarGrid stroke="#27272a" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} />
                    <Radar
                      name="Usage Profile"
                      dataKey="A"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      fill="#ffffff"
                      fillOpacity={0.03}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* SCATTER NODE MAP */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="md:col-span-6 lg:col-span-3 row-span-3 bg-[#0a0a0a] border border-zinc-800/50 rounded-3xl p-6 flex flex-col relative"
            >
              <div className="text-zinc-500 text-xs tracking-widest font-semibold mb-4 flex items-center gap-2 border-b border-zinc-800/50 pb-4">
                <Network className="w-4 h-4 text-zinc-400" /> NEURAL TOPOLOGY
              </div>
              <div className="flex-1 w-full h-[220px] mt-2 cursor-crosshair">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <XAxis type="number" dataKey="x" hide domain={[0, 100]} />
                    <YAxis type="number" dataKey="y" hide domain={[0, 100]} />
                    <ZAxis type="number" dataKey="z" range={[100, 800]} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3', stroke: '#52525b' }}
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Scatter name="Tasks" data={NODE_DATA} fill="#ffffff" fillOpacity={0.4} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-[10px] text-zinc-600 text-center tracking-widest uppercase">
                Node size correlates to operation volume
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
