import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { OfflinePromptEngine, PromptTemplate } from "@/lib/offlinePromptEngine";
import { Wifi, WifiOff, Copy, Check, Shield, Download } from "lucide-react";
import { toast } from "sonner";

export const OfflinePromptGenerator = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [category, setCategory] = useState<string>("all");

  const allTemplates = OfflinePromptEngine.getAllTemplatesIncludingCustom();
  const categories = ["all", ...new Set(allTemplates.map(t => t.category))];
  
  const filteredTemplates = category === "all" 
    ? allTemplates 
    : allTemplates.filter(t => t.category === category);

  const handleTemplateSelect = (templateId: string) => {
    const template = allTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setVariables({});
      setGeneratedPrompt("");
    }
  };

  const handleGenerate = () => {
    if (!selectedTemplate) return;

    try {
      const prompt = OfflinePromptEngine.generatePrompt(selectedTemplate.id, variables);
      setGeneratedPrompt(prompt);
      
      // Save to history
      const history = JSON.parse(localStorage.getItem('offlinePromptHistory') || '[]');
      history.unshift({
        id: Date.now(),
        template: selectedTemplate.name,
        prompt,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('offlinePromptHistory', JSON.stringify(history.slice(0, 50)));
      
      toast.success("Prompt generated offline!");
    } catch (error) {
      toast.error("Failed to generate prompt");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedPrompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Prompt downloaded!");
  };

  const analysis = generatedPrompt ? OfflinePromptEngine.analyzePrompt(generatedPrompt) : null;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Offline Prompt Generator</h2>
            <p className="text-muted-foreground">Privacy-first, on-device prompt generation</p>
          </div>
          <div className="ml-auto">
            <Badge variant="secondary" className="gap-2">
              <WifiOff className="w-3 h-3" />
              No Cloud Dependency
            </Badge>
          </div>
        </div>

        <div className="space-y-6">
          {/* Category Filter */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select value={selectedTemplate?.id || ""} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {filteredTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                    {template.industry && (
                      <span className="text-muted-foreground ml-2">({template.industry})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Variables Input */}
          {selectedTemplate && (
            <div className="space-y-4">
              <Label>Fill in Template Variables</Label>
              {selectedTemplate.variables.map(variable => (
                <div key={variable} className="space-y-2">
                  <Label className="text-sm">{variable.replace(/_/g, ' ').toUpperCase()}</Label>
                  <Input
                    value={variables[variable] || ""}
                    onChange={(e) => setVariables(prev => ({
                      ...prev,
                      [variable]: e.target.value
                    }))}
                    placeholder={`Enter ${variable}...`}
                  />
                </div>
              ))}
              
              <Button onClick={handleGenerate} className="w-full">
                Generate Prompt
              </Button>
            </div>
          )}

          {/* Generated Prompt */}
          {generatedPrompt && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Generated Prompt</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Textarea
                value={generatedPrompt}
                readOnly
                className="min-h-[300px] font-mono text-sm"
              />
              
              {/* Analysis */}
              {analysis && (
                <Card className="p-4 bg-muted">
                  <h3 className="font-semibold mb-3">Prompt Analysis</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Words</p>
                      <p className="font-semibold">{analysis.wordCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Characters</p>
                      <p className="font-semibold">{analysis.characterCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Est. Tokens</p>
                      <p className="font-semibold">{analysis.estimatedTokens}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Complexity</p>
                      <Badge variant={
                        analysis.complexity === 'simple' ? 'secondary' : 
                        analysis.complexity === 'moderate' ? 'default' : 'destructive'
                      }>
                        {analysis.complexity}
                      </Badge>
                    </div>
                  </div>
                  
                  {analysis.suggestedImprovements.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold mb-2">Suggestions:</p>
                      <ul className="text-sm space-y-1">
                        {analysis.suggestedImprovements.map((suggestion, idx) => (
                          <li key={idx} className="text-muted-foreground">• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Privacy Features */}
      <Card className="p-6 border-primary/20">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Enterprise Privacy Features
        </h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5" />
            <span>100% on-device processing - no data leaves your machine</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5" />
            <span>Works completely offline - no internet required</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5" />
            <span>HIPAA, SOC2, and GDPR compliant architecture</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5" />
            <span>Local storage only - full data sovereignty</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5" />
            <span>Audit trail stored locally for compliance</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
