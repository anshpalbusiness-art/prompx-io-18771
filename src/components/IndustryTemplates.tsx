import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Sparkles, TrendingUp, Code, Heart, GraduationCap, ShoppingCart, Scale, DollarSign } from "lucide-react";

interface IndustryTemplate {
  id: string;
  industry: string;
  template_name: string;
  template_prompt: string;
  description: string;
  platform: string;
}

interface IndustryTemplatesProps {
  onTemplateSelect: (template: string) => void;
}

const INDUSTRY_ICONS: { [key: string]: any } = {
  trading: TrendingUp,
  marketing: Sparkles,
  coding: Code,
  healthcare: Heart,
  education: GraduationCap,
  'e-commerce': ShoppingCart,
  legal: Scale,
  finance: DollarSign,
};

export const IndustryTemplates = ({ onTemplateSelect }: IndustryTemplatesProps) => {
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('industry_templates')
        .select('*')
        .order('industry', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error Loading Templates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const industries = ['all', ...Array.from(new Set(templates.map(t => t.industry)))];

  const filteredTemplates = selectedIndustry === 'all' 
    ? templates 
    : templates.filter(t => t.industry === selectedIndustry);

  const handleTemplateClick = (template: IndustryTemplate) => {
    onTemplateSelect(template.template_prompt);
    toast({
      title: "✨ Template Applied!",
      description: `Using ${template.template_name} template`,
    });
  };

  return (
    <Card className="bg-gradient-to-br from-background to-secondary/5 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <CardTitle>Industry Templates</CardTitle>
        </div>
        <CardDescription>
          Pre-built prompt templates optimized for specific industries
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading templates...</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {industries.map((industry) => (
                <Button
                  key={industry}
                  variant={selectedIndustry === industry ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedIndustry(industry)}
                >
                  {industry === 'all' ? 'All' : industry.charAt(0).toUpperCase() + industry.slice(1)}
                </Button>
              ))}
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {filteredTemplates.map((template) => {
                const Icon = INDUSTRY_ICONS[template.industry] || Briefcase;
                return (
                  <Card 
                    key={template.id}
                    className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
                    onClick={() => handleTemplateClick(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1">{template.template_name}</h4>
                            <p className="text-xs text-muted-foreground mb-2">
                              {template.description}
                            </p>
                            <div className="flex gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {template.industry}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {template.platform}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No templates found for this industry
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
