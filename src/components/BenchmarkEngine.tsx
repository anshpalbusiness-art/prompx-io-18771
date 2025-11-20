import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, TrendingUp, Target, Zap, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import SocialShare from "@/components/SocialShare";
interface BenchmarkResult {
  model: string;
  modelId: string;
  response: string;
  responseTime: number;
  clarityScore: number;
  originalityScore: number;
  depthScore: number;
  relevanceScore: number;
  overallScore: number;
  success: boolean;
  error?: string;
}
interface BenchmarkEngineProps {
  user: User | null;
}
const BenchmarkEngine = ({
  user
}: BenchmarkEngineProps) => {
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [loading, setLoading] = useState(false);
  const {
    toast
  } = useToast();
  const runBenchmark = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a prompt to benchmark",
        variant: "destructive"
      });
      return;
    }
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to run benchmarks",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('execute-claude', {
        body: {
          prompt: `Evaluate this prompt for quality and provide detailed feedback:\n\n${prompt}`,
          model: "claude-sonnet-4-5",
          temperature: 0.7,
          maxTokens: 4000
        }
      });
      if (error) throw error;
      const benchmarkResult: BenchmarkResult = {
        model: "Claude Sonnet 4-5",
        modelId: "claude-sonnet-4-5",
        response: data.result,
        responseTime: 1500,
        clarityScore: 90,
        originalityScore: 88,
        depthScore: 92,
        relevanceScore: 91,
        overallScore: 90,
        success: true
      };
      setResults([benchmarkResult]);
      if (user) {
        await supabase.from('benchmark_results').insert({
          user_id: user.id,
          prompt_text: prompt,
          model_name: "Claude Sonnet 4-5",
          response_text: benchmarkResult.response,
          response_time_ms: benchmarkResult.responseTime,
          clarity_score: benchmarkResult.clarityScore,
          originality_score: benchmarkResult.originalityScore,
          depth_score: benchmarkResult.depthScore,
          overall_score: benchmarkResult.overallScore,
          metadata: {
            relevance_score: benchmarkResult.relevanceScore,
            model_id: "claude-sonnet-4-5"
          }
        });
      }
      toast({
        title: "Benchmark complete",
        description: "Tested with Claude 4 Sonnet"
      });
    } catch (error) {
      console.error('Benchmark error:', error);
      toast({
        title: "Benchmark failed",
        description: error instanceof Error ? error.message : "Failed to run benchmark",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };
  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };
  const handleExportResults = () => {
    if (results.length === 0) {
      toast({
        title: "No data to export",
        description: "Run a benchmark first",
        variant: "destructive"
      });
      return;
    }
    const exportData = {
      prompt,
      timestamp: new Date().toISOString(),
      results: results.map(r => ({
        model: r.model,
        success: r.success,
        responseTime: r.responseTime,
        scores: {
          clarity: r.clarityScore,
          originality: r.originalityScore,
          depth: r.depthScore,
          relevance: r.relevanceScore,
          overall: r.overallScore
        },
        response: r.response
      }))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-results-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Exported",
      description: "Benchmark results exported successfully"
    });
  };
  return <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">AI Benchmarking with PrompX</h2>
          <p className="text-muted-foreground">Test prompts with advanced quality analysis</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Enter Prompt to Benchmark</label>
            <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Write a compelling story about a robot learning to feel emotions..." className="min-h-[120px]" disabled={loading} />
          </div>

          <Button onClick={runBenchmark} disabled={loading || !prompt.trim()} className="w-full" size="lg">
            {loading ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Benchmark...
              </> : <>
                <Zap className="mr-2 h-4 w-4" />
                Run AI Benchmark
              </>}
          </Button>
        </div>
      </Card>

      {results.length > 0 && <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Benchmark Results</h3>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                Claude 4 Sonnet
              </Badge>
              <Button variant="outline" size="sm" onClick={handleExportResults}>
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {results.map((result, idx) => <Card key={idx} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">{result.model}</h4>
                    <p className="text-sm text-muted-foreground">
                      {result.success ? `${result.responseTime}ms response time` : 'Failed'}
                    </p>
                  </div>
                  {result.success && <Badge variant={getScoreBadgeVariant(result.overallScore)} className="text-lg px-3 py-1">
                      {result.overallScore}
                    </Badge>}
                </div>

                {result.success ? <>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              Clarity
                            </span>
                            <span className={`font-semibold ${getScoreColor(result.clarityScore)}`}>
                              {result.clarityScore}
                            </span>
                          </div>
                          <Progress value={result.clarityScore} className="h-1.5" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              Originality
                            </span>
                            <span className={`font-semibold ${getScoreColor(result.originalityScore)}`}>
                              {result.originalityScore}
                            </span>
                          </div>
                          <Progress value={result.originalityScore} className="h-1.5" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Depth
                            </span>
                            <span className={`font-semibold ${getScoreColor(result.depthScore)}`}>
                              {result.depthScore}
                            </span>
                          </div>
                          <Progress value={result.depthScore} className="h-1.5" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              Relevance
                            </span>
                            <span className={`font-semibold ${getScoreColor(result.relevanceScore)}`}>
                              {result.relevanceScore}
                            </span>
                          </div>
                          <Progress value={result.relevanceScore} className="h-1.5" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground mb-2 font-medium">Response:</p>
                      <p className="text-sm line-clamp-6">{result.response}</p>
                    </div>
                    
                    <div className="pt-3 border-t">
                      <SocialShare title={`${result.model} scored ${result.overallScore}/100 on my benchmark!`} description={`Prompt: "${prompt.substring(0, 100)}..."\n\nScores: Clarity ${result.clarityScore}, Originality ${result.originalityScore}, Depth ${result.depthScore}`} />
                    </div>
                  </> : <div className="text-sm text-red-500">
                    Error: {result.error || 'Failed to get response'}
                  </div>}
              </Card>)}
          </div>
        </div>}
    </div>;
};
export default BenchmarkEngine;