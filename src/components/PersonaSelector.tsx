import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, TrendingUp, Code2, Scale, Feather, Database, Users, Target, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PersonaTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  avatar_icon: string;
  personality_traits: any;
  communication_style: string;
  expertise_areas: string[];
  prompt_prefix: string;
  example_phrases: string[];
  color_theme: string;
}

interface PersonaSelectorProps {
  selectedPersonaId: string | null;
  onPersonaSelect: (personaId: string | null, promptPrefix: string) => void;
}

const iconMap: Record<string, any> = {
  Sparkles,
  TrendingUp,
  Code2,
  Scale,
  Feather,
  Database,
  Users,
  Target,
};

export const PersonaSelector = ({ selectedPersonaId, onPersonaSelect }: PersonaSelectorProps) => {
  const [personas, setPersonas] = useState<PersonaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    try {
      const { data, error } = await supabase
        .from("persona_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setPersonas(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading personas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPersona = (persona: PersonaTemplate) => {
    if (selectedPersonaId === persona.id) {
      onPersonaSelect(null, "");
      toast({
        title: "Persona Deselected",
        description: "Switched back to standard mode",
      });
    } else {
      onPersonaSelect(persona.id, persona.prompt_prefix);
      toast({
        title: `${persona.title} Activated`,
        description: persona.description,
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading personas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Persona Layer</h3>
          <p className="text-sm text-muted-foreground">
            Choose a persona to enhance your prompts with specialized expertise
          </p>
        </div>
        {selectedPersonaId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPersonaSelect(null, "")}
          >
            Clear Selection
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personas.map((persona) => {
            const IconComponent = iconMap[persona.avatar_icon] || Sparkles;
            const isSelected = selectedPersonaId === persona.id;

            return (
              <Card
                key={persona.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleSelectPersona(persona)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-${persona.color_theme}-100 dark:bg-${persona.color_theme}-900/20`}>
                        <IconComponent className={`h-5 w-5 text-${persona.color_theme}-600 dark:text-${persona.color_theme}-400`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{persona.title}</CardTitle>
                        {isSelected && (
                          <Badge variant="default" className="mt-1">
                            <Check className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardDescription className="mt-2">
                    {persona.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Expertise Areas
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {persona.expertise_areas.slice(0, 3).map((area, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Example Phrases
                      </p>
                      <p className="text-xs italic text-muted-foreground">
                        "{persona.example_phrases[0]}"
                      </p>
                    </div>

                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Style:</span> {persona.communication_style}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
