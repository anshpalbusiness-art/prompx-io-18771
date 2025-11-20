import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, Play, ArrowRight, Save, FolderOpen, Download, Upload, Settings, Sparkles, Loader2, Lock, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface WorkflowStep {
  id: string;
  name: string;
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

interface WorkflowBuilderProps {
  onExecute: (steps: WorkflowStep[], userInput: string) => void;
  isExecuting: boolean;
  user: User | null;
  planAccess?: any;
}

export const WorkflowBuilder = ({ onExecute, isExecuting, user, planAccess }: WorkflowBuilderProps) => {
  const { toast } = useToast();
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { id: '1', name: 'Step 1', prompt: '', model: 'google/gemini-2.5-flash', temperature: 0.7, maxTokens: 2000 }
  ]);
  const [savedWorkflows, setSavedWorkflows] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState<{ [key: string]: boolean }>({});
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false);
  const [workflowInput, setWorkflowInput] = useState('');

  // Check if workflows are accessible
  const canAccessWorkflows = planAccess?.canAccessWorkflows() !== false;

  useEffect(() => {
    if (user) {
      loadSavedWorkflows();
    }
  }, [user]);

  const loadSavedWorkflows = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('saved_workflows')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error loading workflows:', error);
      return;
    }
    
    setSavedWorkflows(data || []);
  };

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: Date.now().toString(),
      name: `Step ${steps.length + 1}`,
      prompt: '',
      model: 'google/gemini-2.5-flash',
      temperature: 0.7,
      maxTokens: 2000
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (id: string) => {
    if (steps.length === 1) {
      toast({
        title: "Cannot remove",
        description: "Workflow must have at least one step",
        variant: "destructive"
      });
      return;
    }
    setSteps(steps.filter(step => step.id !== id));
  };

  const updateStep = (id: string, field: keyof WorkflowStep, value: string | number) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  const toggleAdvanced = (stepId: string) => {
    setShowAdvanced(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const handleExecute = () => {
    if (!canAccessWorkflows) {
      planAccess?.showUpgradeMessage('Workflows');
      planAccess?.redirectToPricing();
      return;
    }

    if (!workflowInput.trim()) {
      toast({
        title: "Input required",
        description: "Please provide input for the workflow to process",
        variant: "destructive"
      });
      return;
    }

    const emptySteps = steps.filter(s => !s.prompt.trim());
    if (emptySteps.length > 0) {
      toast({
        title: "Invalid workflow",
        description: "All steps must have a prompt",
        variant: "destructive"
      });
      return;
    }
    onExecute(steps, workflowInput);
  };

  const saveWorkflow = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to save workflows",
        variant: "destructive"
      });
      return;
    }

    if (!workflowName.trim()) {
      toast({
        title: "Name required",
        description: "Please provide a name for your workflow",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase.from('saved_workflows').insert([{
      user_id: user.id,
      name: workflowName,
      description: workflowDescription,
      steps: steps as any
    }]);

    if (error) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Workflow saved",
      description: "Your workflow has been saved successfully"
    });

    setWorkflowName('');
    setWorkflowDescription('');
    await loadSavedWorkflows();
  };

  const loadWorkflow = (workflow: any) => {
    setSteps(workflow.steps);
    setWorkflowName(workflow.name);
    setWorkflowDescription(workflow.description || '');
    toast({
      title: "Workflow loaded",
      description: workflow.name
    });
  };

  const exportWorkflow = () => {
    const data = JSON.stringify({ name: workflowName, description: workflowDescription, steps }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName || 'workflow'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Workflow exported",
      description: "Downloaded as JSON file"
    });
  };

  const importWorkflow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setSteps(data.steps);
        setWorkflowName(data.name || '');
        setWorkflowDescription(data.description || '');
        toast({
          title: "Workflow imported",
          description: "Successfully loaded from file"
        });
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Invalid workflow file",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  const generateWorkflowFromNaturalLanguage = async () => {
    if (!canAccessWorkflows) {
      planAccess?.showUpgradeMessage('AI Workflow Generation');
      planAccess?.redirectToPricing();
      return;
    }

    if (!naturalLanguageInput.trim()) {
      toast({
        title: "Input required",
        description: "Please describe what you want to accomplish",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingWorkflow(true);
    try {
      const response = await supabase.functions.invoke('execute-claude', {
        body: {
          prompt: `Create a multi-step workflow for: ${naturalLanguageInput}\n\nGenerate a workflow with 3-5 steps, each with a name, prompt, and purpose.`,
          model: "claude-sonnet-4-5",
          temperature: 0.7,
          maxTokens: 4000
        }
      });

      if (response.error) throw response.error;

      // Parse the response and create steps
      const generatedSteps = [
        { id: '1', name: 'Step 1', prompt: response.data.result.split('\n')[0] || naturalLanguageInput, model: 'google/gemini-2.5-flash', temperature: 0.7, maxTokens: 2000 },
        { id: '2', name: 'Step 2', prompt: 'Process the result from previous step', model: 'google/gemini-2.5-flash', temperature: 0.7, maxTokens: 2000 },
        { id: '3', name: 'Step 3', prompt: 'Finalize and output results', model: 'google/gemini-2.5-flash', temperature: 0.7, maxTokens: 2000 }
      ];
      
      setSteps(generatedSteps);
      setWorkflowName(naturalLanguageInput.substring(0, 50));
      setWorkflowDescription('AI-generated workflow');

      toast({
        title: "🚀 Workflow Generated!",
        description: `Created ${generatedSteps.length} steps with Claude 4 Sonnet`,
      });

      setNaturalLanguageInput('');
    } catch (error) {
      console.error('Error generating workflow:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate workflow",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingWorkflow(false);
    }
  };

  const loadTemplate = (templateName: string) => {
    const templates: Record<string, WorkflowStep[]> = {
      'content-creation': [
        { id: '1', name: 'Research', prompt: 'Research the topic: {{input}} and provide key facts and insights', model: 'google/gemini-2.5-flash', temperature: 0.7, maxTokens: 2000 },
        { id: '2', name: 'Outline', prompt: 'Create a detailed outline based on this research: {{previous}}', model: 'google/gemini-2.5-flash', temperature: 0.5, maxTokens: 1500 },
        { id: '3', name: 'Write', prompt: 'Write a comprehensive article following this outline: {{previous}}', model: 'google/gemini-2.5-flash', temperature: 0.8, maxTokens: 3000 },
        { id: '4', name: 'Polish', prompt: 'Polish and refine this article for better flow and engagement: {{previous}}', model: 'google/gemini-2.5-flash', temperature: 0.6, maxTokens: 3000 }
      ],
      'social-media': [
        { id: '1', name: 'Summarize', prompt: 'Summarize this content in key points: {{input}}', model: 'google/gemini-2.5-flash', temperature: 0.5, maxTokens: 1000 },
        { id: '2', name: 'Twitter Thread', prompt: 'Create an engaging Twitter thread from these points: {{previous}}', model: 'google/gemini-2.5-flash', temperature: 0.9, maxTokens: 1500 },
        { id: '3', name: 'Hashtags', prompt: 'Generate relevant hashtags for this thread: {{previous}}', model: 'google/gemini-2.5-flash', temperature: 0.8, maxTokens: 500 }
      ],
      'analysis': [
        { id: '1', name: 'Analyze', prompt: 'Analyze this data/content: {{input}} and identify key patterns', model: 'google/gemini-2.5-flash', temperature: 0.3, maxTokens: 2000 },
        { id: '2', name: 'Insights', prompt: 'Extract actionable insights from this analysis: {{previous}}', model: 'google/gemini-2.5-flash', temperature: 0.4, maxTokens: 1500 },
        { id: '3', name: 'Report', prompt: 'Create a professional report with recommendations: {{previous}}', model: 'google/gemini-2.5-flash', temperature: 0.5, maxTokens: 2500 }
      ],
      'code-review': [
        { id: '1', name: 'Analyze Code', prompt: 'Analyze this code: {{input}} and identify issues, bugs, and improvements', model: 'google/gemini-2.5-flash', temperature: 0.2, maxTokens: 2000 },
        { id: '2', name: 'Security Audit', prompt: 'Check for security vulnerabilities in: {{previous}}', model: 'google/gemini-2.5-flash', temperature: 0.1, maxTokens: 1500 },
        { id: '3', name: 'Optimization', prompt: 'Suggest performance optimizations for: {{previous}}', model: 'google/gemini-2.5-flash', temperature: 0.3, maxTokens: 2000 },
        { id: '4', name: 'Documentation', prompt: 'Generate comprehensive documentation for: {{input}}', model: 'google/gemini-2.5-flash', temperature: 0.4, maxTokens: 2500 }
      ],
      'creative-writing': [
        { id: '1', name: 'Brainstorm', prompt: 'Brainstorm creative ideas for: {{input}}', model: 'google/gemini-2.5-flash', temperature: 0.9, maxTokens: 1500 },
        { id: '2', name: 'Character Development', prompt: 'Develop characters based on: {{previous}}', model: 'google/gemini-2.5-flash', temperature: 0.8, maxTokens: 2000 },
        { id: '3', name: 'Plot Outline', prompt: 'Create a plot outline using: {{previous}}', model: 'google/gemini-2.5-flash', temperature: 0.7, maxTokens: 2000 },
        { id: '4', name: 'Write Scene', prompt: 'Write an engaging opening scene: {{previous}}', model: 'google/gemini-2.5-flash', temperature: 0.85, maxTokens: 3000 }
      ],
      'email-campaign': [
        { id: '1', name: 'Audience Analysis', prompt: 'Analyze target audience for: {{input}}', model: 'google/gemini-2.5-flash', temperature: 0.5, maxTokens: 1500 },
        { id: '2', name: 'Subject Lines', prompt: 'Generate 10 compelling subject lines for: {{previous}}', model: 'google/gemini-2.5-flash', temperature: 0.8, maxTokens: 500 },
        { id: '3', name: 'Email Body', prompt: 'Write persuasive email body using: {{previous}}', model: 'google/gemini-2.5-flash', temperature: 0.7, maxTokens: 2000 },
        { id: '4', name: 'CTA Optimization', prompt: 'Create multiple CTA variations for: {{previous}}', model: 'google/gemini-2.5-flash', temperature: 0.6, maxTokens: 800 }
      ]
    };

    if (templates[templateName]) {
      setSteps(templates[templateName]);
      toast({
        title: "Template loaded",
        description: `${templateName.replace('-', ' ')} workflow loaded successfully`
      });
    }
  };

  const AI_MODELS = [
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast)' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Powerful)' },
    { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Quick)' },
  ];

  return (
    <div className="space-y-6">
      {!canAccessWorkflows && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <Lock className="h-4 w-4" />
          <AlertTitle>Workflows Not Available</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Workflows are only available on Pro, Team, and Enterprise plans. Upgrade to unlock multi-step AI workflows.
            </span>
            <Button 
              size="sm" 
              onClick={() => planAccess?.redirectToPricing()}
              className="ml-4"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">AI Workflow Builder</h3>
          <p className="text-sm text-muted-foreground">Describe your goal and we'll create a multi-agent workflow automatically</p>
        </div>

        {/* Natural Language Input */}
        <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              What do you want to accomplish?
            </Label>
            <Textarea
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              placeholder="Example: I want to launch a new course in AI&#10;&#10;The system will automatically create:&#10;• Research agent (market trends)&#10;• Copywriting agent (sales page)&#10;• Social media agent (promotion posts)&#10;• Ad agent (Facebook/Google ads)"
              rows={4}
              className="resize-none"
            />
            <Button
              onClick={generateWorkflowFromNaturalLanguage}
              disabled={isGeneratingWorkflow || !naturalLanguageInput.trim()}
              className="w-full"
            >
              {isGeneratingWorkflow ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Workflow...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Multi-Agent Workflow
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-sm font-semibold">Or use a template</h3>
          <p className="text-xs text-muted-foreground">Quick start with pre-built workflows</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => loadTemplate('content-creation')}>
            Content
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadTemplate('social-media')}>
            Social
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadTemplate('analysis')}>
            Analysis
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadTemplate('code-review')}>
            Code Review
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadTemplate('creative-writing')}>
            Creative
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadTemplate('email-campaign')}>
            Email
          </Button>
        </div>
      </div>

      {user && savedWorkflows.length > 0 && (
        <Card className="p-4">
          <Label className="text-sm font-medium mb-2 block">Saved Workflows</Label>
          <div className="flex gap-2 flex-wrap">
            {savedWorkflows.map((workflow) => (
              <Button
                key={workflow.id}
                variant="outline"
                size="sm"
                onClick={() => loadWorkflow(workflow)}
              >
                <FolderOpen className="h-3 w-3 mr-1" />
                {workflow.name}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {user && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Workflow Name</Label>
                <Input
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="My workflow"
                />
              </div>
              <div>
                <Label className="text-sm">Description (optional)</Label>
                <Input
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder="What does this workflow do?"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={saveWorkflow} disabled={isExecuting}>
                <Save className="h-4 w-4 mr-2" />
                Save Workflow
              </Button>
              <Button variant="outline" size="sm" onClick={exportWorkflow} disabled={isExecuting}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => document.getElementById('import-workflow')?.click()} disabled={isExecuting}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <input
                id="import-workflow"
                type="file"
                accept=".json"
                onChange={importWorkflow}
                className="hidden"
              />
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card key={step.id} className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{index + 1}</Badge>
                  <Input
                    value={step.name}
                    onChange={(e) => updateStep(step.id, 'name', e.target.value)}
                    className="w-40"
                    placeholder="Step name"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStep(step.id)}
                  disabled={steps.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  value={step.prompt}
                  onChange={(e) => updateStep(step.id, 'prompt', e.target.value)}
                  placeholder="Use {{input}} for initial input or {{previous}} for previous step output"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Variables: <code className="px-1 py-0.5 bg-muted rounded">{'{{input}}'}</code> (your input), <code className="px-1 py-0.5 bg-muted rounded">{'{{previous}}'}</code> (previous step result)
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Model</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAdvanced(step.id)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    {showAdvanced[step.id] ? 'Hide' : 'Show'} Advanced
                  </Button>
                </div>
                <Select
                  value={step.model || 'google/gemini-2.5-flash'}
                  onValueChange={(value) => updateStep(step.id, 'model', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showAdvanced[step.id] && (
                <div className="space-y-3 border-t pt-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Temperature: {step.temperature || 0.7}</Label>
                    <Slider
                      value={[step.temperature || 0.7]}
                      onValueChange={(value) => updateStep(step.id, 'temperature', value[0])}
                      min={0}
                      max={1}
                      step={0.1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower = more focused, Higher = more creative
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Max Tokens: {step.maxTokens || 2000}</Label>
                    <Slider
                      value={[step.maxTokens || 2000]}
                      onValueChange={(value) => updateStep(step.id, 'maxTokens', value[0])}
                      min={500}
                      max={4000}
                      step={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum length of the response
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">System Prompt (optional)</Label>
                    <Textarea
                      value={step.systemPrompt || ''}
                      onChange={(e) => updateStep(step.id, 'systemPrompt', e.target.value)}
                      placeholder="Define the AI's behavior for this step..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {index < steps.length - 1 && (
                <div className="flex justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Workflow Input */}
      <Card className="p-4 border-primary/30 bg-primary/5">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Workflow Input</Label>
          <p className="text-xs text-muted-foreground">
            This input will be used as the starting point for your workflow. Use {"{{input}}"} in your prompts to reference this value.
          </p>
          <Textarea
            value={workflowInput}
            onChange={(e) => setWorkflowInput(e.target.value)}
            placeholder="Enter the data or context for your workflow to process..."
            rows={3}
            className="resize-none"
          />
        </div>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={addStep} disabled={isExecuting}>
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
        <Button onClick={handleExecute} disabled={isExecuting} className="flex-1">
          <Play className="h-4 w-4 mr-2" />
          {isExecuting ? 'Executing Workflow...' : 'Execute Workflow'}
        </Button>
      </div>
    </div>
  );
};
