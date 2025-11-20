import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Agent {
  id?: string;
  name: string;
  description: string;
  system_prompt: string;
  category: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  is_public?: boolean;
  tags?: string[];
}

interface AgentBuilderProps {
  userId: string;
  agent?: Agent | null;
  onSave: () => void;
}

const CATEGORIES = [
  "Writing",
  "Education",
  "Business",
  "Marketing",
  "Development",
  "Research",
  "Creative",
  "Other"
];

const MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Fast & Balanced)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Most Capable)" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (Fastest)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (Balanced)" },
  { value: "openai/gpt-5", label: "GPT-5 (Most Powerful)" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano (Cost-Effective)" },
];

const AgentBuilder = ({ userId, agent, onSave }: AgentBuilderProps) => {
  const [formData, setFormData] = useState<Agent>({
    name: "",
    description: "",
    system_prompt: "",
    category: "Writing",
    model: "google/gemini-2.5-flash",
    temperature: 0.7,
    max_tokens: 2000,
    is_public: false,
    tags: [],
  });
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (agent) {
      setFormData({
        ...agent,
        model: agent.model || "google/gemini-2.5-flash",
        temperature: agent.temperature || 0.7,
        max_tokens: agent.max_tokens || 2000,
      });
      setTagsInput(agent.tags?.join(", ") || "");
    }
  }, [agent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tags = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Prepare agent data without id for new agents
      const { id, ...agentDataWithoutId } = formData;
      const agentData = {
        ...agentDataWithoutId,
        tags,
        user_id: userId,
      };

      if (agent?.id) {
        // Update existing agent
        const { error } = await supabase
          .from('prompt_agents')
          .update(agentData)
          .eq('id', agent.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }

        toast({
          title: "Success",
          description: "Agent updated successfully",
        });
      } else {
        // Insert new agent - let database generate the id
        const { error } = await supabase
          .from('prompt_agents')
          .insert([agentData]);

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }

        toast({
          title: "Success",
          description: "Agent created successfully",
        });
      }

      onSave();
    } catch (error) {
      console.error('Error saving agent:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to save agent. Please try again.';
      let errorTitle = 'Error';
      
      if (error instanceof Error) {
        if (error.message.includes('uuid')) {
          errorTitle = 'Invalid Data';
          errorMessage = 'Invalid data format. Please check your input and try again.';
        } else if (error.message.includes('duplicate')) {
          errorTitle = 'Duplicate Name';
          errorMessage = 'An agent with this name already exists. Please use a different name.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorTitle = 'Connection Error';
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Agent Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Cold Email Writer Agent"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Briefly describe what this agent does"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="system_prompt">System Prompt *</Label>
        <Textarea
          id="system_prompt"
          value={formData.system_prompt}
          onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
          placeholder="Define the agent's role, expertise, and behavior. Example: You are an expert cold email writer specializing in B2B sales..."
          rows={6}
          required
        />
        <p className="text-sm text-muted-foreground">
          This is the core instruction that defines how your agent behaves
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g., email, sales, b2b"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">AI Model</Label>
        <Select
          value={formData.model}
          onValueChange={(value) => setFormData({ ...formData, model: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Note: Gemini models are currently free, GPT models use credits
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="temperature">
            Temperature: {formData.temperature?.toFixed(1)}
          </Label>
          <input
            type="range"
            id="temperature"
            min="0"
            max="1"
            step="0.1"
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Lower = more focused, Higher = more creative
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_tokens">Max Tokens</Label>
          <Input
            type="number"
            id="max_tokens"
            value={formData.max_tokens}
            onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
            min="100"
            max="4000"
          />
          <p className="text-xs text-muted-foreground">
            Maximum response length (100-4000)
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_public"
          checked={formData.is_public}
          onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
        />
        <Label htmlFor="is_public">Make this agent public (others can view and use it)</Label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {agent ? 'Update Agent' : 'Create Agent'}
        </Button>
      </div>
    </form>
  );
};

export default AgentBuilder;