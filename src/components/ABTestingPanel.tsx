import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Play, Pause, CheckCircle, TrendingUp } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface ABTestingPanelProps {
  user: User;
}

interface ABTest {
  id: string;
  test_name: string;
  description: string;
  variant_a_prompt: string;
  variant_b_prompt: string;
  status: string;
  created_at: string;
}

interface TestResults {
  variant: string;
  clicks: number;
  conversions: number;
  engagement: number;
}

export default function ABTestingPanel({ user }: ABTestingPanelProps) {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [testName, setTestName] = useState("");
  const [description, setDescription] = useState("");
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTests();
  }, [user]);

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from("ab_tests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching tests",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createTest = async () => {
    if (!testName || !variantA || !variantB) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("ab_tests").insert({
        user_id: user.id,
        test_name: testName,
        description,
        variant_a_prompt: variantA,
        variant_b_prompt: variantB,
        status: "active",
      });

      if (error) throw error;

      toast({
        title: "Test created",
        description: "Your A/B test has been created successfully",
      });

      setShowCreateForm(false);
      setTestName("");
      setDescription("");
      setVariantA("");
      setVariantB("");
      fetchTests();
    } catch (error: any) {
      toast({
        title: "Error creating test",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateTestStatus = async (testId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("ab_tests")
        .update({ 
          status: newStatus,
          completed_at: newStatus === "completed" ? new Date().toISOString() : null
        })
        .eq("id", testId);

      if (error) throw error;

      toast({
        title: "Test updated",
        description: `Test ${newStatus}`,
      });

      fetchTests();
    } catch (error: any) {
      toast({
        title: "Error updating test",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTestResults = async (testId: string): Promise<{ a: TestResults; b: TestResults }> => {
    const { data } = await supabase
      .from("ab_test_results")
      .select("*")
      .eq("test_id", testId);

    const results = { a: { variant: "A", clicks: 0, conversions: 0, engagement: 0 }, b: { variant: "B", clicks: 0, conversions: 0, engagement: 0 } };
    
    data?.forEach((result) => {
      const target = result.variant === "a" ? results.a : results.b;
      if (result.metric_name === "clicks") target.clicks = Number(result.metric_value);
      if (result.metric_name === "conversions") target.conversions = Number(result.metric_value);
      if (result.metric_name === "engagement_time") target.engagement = Number(result.metric_value);
    });

    return results;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">A/B Testing</h2>
          <p className="text-muted-foreground">Test prompt variations and optimize performance</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          New Test
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create A/B Test</CardTitle>
            <CardDescription>Set up a new test to compare two prompt variations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="testName">Test Name</Label>
              <Input
                id="testName"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="E.g., Product Description Test"
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you testing?"
              />
            </div>

            <div>
              <Label htmlFor="variantA">Variant A Prompt</Label>
              <Textarea
                id="variantA"
                value={variantA}
                onChange={(e) => setVariantA(e.target.value)}
                placeholder="Enter first prompt variation..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="variantB">Variant B Prompt</Label>
              <Textarea
                id="variantB"
                value={variantB}
                onChange={(e) => setVariantB(e.target.value)}
                placeholder="Enter second prompt variation..."
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={createTest}>Create Test</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {tests.map((test) => (
          <TestCard
            key={test.id}
            test={test}
            onUpdateStatus={updateTestStatus}
            getResults={getTestResults}
          />
        ))}

        {tests.length === 0 && !showCreateForm && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No A/B tests yet</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Test
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TestCard({ test, onUpdateStatus, getResults }: { 
  test: ABTest; 
  onUpdateStatus: (id: string, status: string) => void;
  getResults: (id: string) => Promise<{ a: TestResults; b: TestResults }>;
}) {
  const [results, setResults] = useState<{ a: TestResults; b: TestResults } | null>(null);

  useEffect(() => {
    getResults(test.id).then(setResults);
  }, [test.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-500";
      case "paused": return "text-yellow-500";
      case "completed": return "text-blue-500";
      default: return "text-muted-foreground";
    }
  };

  const winner = results && results.a.conversions > results.b.conversions ? "A" : "B";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{test.test_name}</CardTitle>
            {test.description && (
              <CardDescription>{test.description}</CardDescription>
            )}
          </div>
          <span className={`text-sm font-medium ${getStatusColor(test.status)}`}>
            {test.status.toUpperCase()}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Variant A</h4>
              {test.status === "completed" && winner === "A" && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">{test.variant_a_prompt}</p>
            {results && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Clicks:</span>
                  <span className="font-medium">{results.a.clicks}</span>
                </div>
                <div className="flex justify-between">
                  <span>Conversions:</span>
                  <span className="font-medium">{results.a.conversions}</span>
                </div>
                <Progress value={(results.a.conversions / Math.max(results.a.clicks, 1)) * 100} className="h-2" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Variant B</h4>
              {test.status === "completed" && winner === "B" && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">{test.variant_b_prompt}</p>
            {results && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Clicks:</span>
                  <span className="font-medium">{results.b.clicks}</span>
                </div>
                <div className="flex justify-between">
                  <span>Conversions:</span>
                  <span className="font-medium">{results.b.conversions}</span>
                </div>
                <Progress value={(results.b.conversions / Math.max(results.b.clicks, 1)) * 100} className="h-2" />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {test.status === "active" && (
            <>
              <Button size="sm" variant="outline" onClick={() => onUpdateStatus(test.id, "paused")}>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
              <Button size="sm" variant="outline" onClick={() => onUpdateStatus(test.id, "completed")}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete
              </Button>
            </>
          )}
          {test.status === "paused" && (
            <Button size="sm" variant="outline" onClick={() => onUpdateStatus(test.id, "active")}>
              <Play className="mr-2 h-4 w-4" />
              Resume
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
