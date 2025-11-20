import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search, Shield, Copy, CheckCircle, FileText, Building2, Heart, Scale, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LegalPrompt {
  id: string;
  pack_name: string;
  industry: string;
  compliance_standards: string[];
  prompt_title: string;
  prompt_content: string;
  use_case: string;
  compliance_notes: string;
}

export default function LegalPromptPacks() {
  const [prompts, setPrompts] = useState<LegalPrompt[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<LegalPrompt[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLegalPrompts();
  }, []);

  useEffect(() => {
    filterPrompts();
  }, [prompts, searchQuery, selectedIndustry]);

  const fetchLegalPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from("legal_prompt_packs")
        .select("*")
        .eq("is_verified", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching legal prompts",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filterPrompts = () => {
    let filtered = prompts;

    if (selectedIndustry !== "all") {
      filtered = filtered.filter((p) => p.industry === selectedIndustry);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.prompt_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.use_case.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.compliance_standards.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredPrompts(filtered);
  };

  const handleCopy = async (prompt: LegalPrompt) => {
    try {
      await navigator.clipboard.writeText(prompt.prompt_content);
      setCopiedId(prompt.id);
      toast({
        title: "Copied!",
        description: "Legal prompt copied to clipboard",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const getIndustryIcon = (industry: string) => {
    switch (industry) {
      case "finance": return Building2;
      case "healthcare": return Heart;
      case "legal": return Scale;
      default: return Globe;
    }
  };

  const industries = ["all", ...new Set(prompts.map((p) => p.industry))];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Legal Prompt Packs
        </h2>
        <p className="text-muted-foreground">Pre-approved, compliant prompts for regulated industries</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search legal prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Industry Tabs */}
      <Tabs value={selectedIndustry} onValueChange={setSelectedIndustry}>
        <TabsList>
          <TabsTrigger value="all">All Industries</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="healthcare">Healthcare</TabsTrigger>
          <TabsTrigger value="legal">Legal</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredPrompts.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No legal prompts found</p>
            </CardContent>
          </Card>
        ) : (
          filteredPrompts.map((prompt) => {
            const Icon = getIndustryIcon(prompt.industry);
            return (
              <Card key={prompt.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{prompt.prompt_title}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {prompt.industry}
                    </Badge>
                  </div>
                  <CardDescription>{prompt.use_case}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-foreground line-clamp-4">{prompt.prompt_content}</p>
                  </div>

                  {/* Compliance Standards */}
                  <div className="flex flex-wrap gap-2">
                    {prompt.compliance_standards.map((standard) => (
                      <Badge key={standard} variant="secondary" className="text-xs">
                        <Shield className="mr-1 h-3 w-3" />
                        {standard}
                      </Badge>
                    ))}
                  </div>

                  {/* Compliance Notes */}
                  {prompt.compliance_notes && (
                    <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-xs text-green-800 dark:text-green-200">
                        <CheckCircle className="inline h-3 w-3 mr-1" />
                        {prompt.compliance_notes}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleCopy(prompt)} 
                      className="flex-1"
                      variant={copiedId === prompt.id ? "outline" : "default"}
                    >
                      {copiedId === prompt.id ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Prompt
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Pack Name */}
                  <div className="text-xs text-muted-foreground">
                    Pack: {prompt.pack_name}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Compliance Info Footer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Compliance Guarantee</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <p>All prompts are verified by compliance experts</p>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <p>Regular updates to match current regulations</p>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <p>Bias-free and ethically reviewed</p>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <p>Designed for SOC2, GDPR, HIPAA, and CCPA compliance</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
