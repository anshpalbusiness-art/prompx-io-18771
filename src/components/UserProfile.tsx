import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Settings, Sparkles } from "lucide-react";

interface UserPreferences {
  niche: string;
  style: string;
  preferred_tone: string;
  preferred_length: string;
}

interface UserProfileProps {
  userId: string;
  onPreferencesUpdate?: (prefs: UserPreferences) => void;
}

export const UserProfile = ({ userId, onPreferencesUpdate }: UserProfileProps) => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    niche: '',
    style: '',
    preferred_tone: '',
    preferred_length: 'moderate'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          niche: data.niche || '',
          style: data.style || '',
          preferred_tone: data.preferred_tone || '',
          preferred_length: data.preferred_length || 'moderate'
        });
      }
    } catch (error: any) {
      console.error('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences
        });

      if (error) throw error;

      toast({
        title: "✅ Preferences Saved!",
        description: "PromptX will now personalize prompts based on your profile",
      });

      onPreferencesUpdate?.(preferences);
    } catch (error: any) {
      toast({
        title: "Error Saving Preferences",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const NICHES = [
    'Trading & Finance',
    'Marketing & Sales',
    'Software Development',
    'Healthcare',
    'Education',
    'E-commerce',
    'Legal',
    'Content Creation',
    'Design & Art',
    'Data Science',
    'Other'
  ];

  const STYLES = [
    'Professional',
    'Casual',
    'Technical',
    'Creative',
    'Academic',
    'Conversational'
  ];

  const TONES = [
    'Formal',
    'Friendly',
    'Authoritative',
    'Empathetic',
    'Persuasive',
    'Informative'
  ];

  const LENGTHS = [
    { value: 'brief', label: 'Brief & Concise' },
    { value: 'moderate', label: 'Moderate Detail' },
    { value: 'detailed', label: 'Comprehensive & Detailed' }
  ];

  return (
    <Card className="bg-gradient-to-br from-background to-secondary/5 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <CardTitle>User Profile & Preferences</CardTitle>
        </div>
        <CardDescription>
          Customize PromptX to learn your style and generate hyper-personalized prompts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading preferences...</div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="niche" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Your Niche / Industry
              </Label>
              <Select
                value={preferences.niche}
                onValueChange={(value) => setPreferences({ ...preferences, niche: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry..." />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map((niche) => (
                    <SelectItem key={niche} value={niche.toLowerCase().replace(/\s+/g, '-')}>
                      {niche}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Writing Style</Label>
              <Select
                value={preferences.style}
                onValueChange={(value) => setPreferences({ ...preferences, style: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your preferred style..." />
                </SelectTrigger>
                <SelectContent>
                  {STYLES.map((style) => (
                    <SelectItem key={style} value={style.toLowerCase()}>
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Preferred Tone</Label>
              <Select
                value={preferences.preferred_tone}
                onValueChange={(value) => setPreferences({ ...preferences, preferred_tone: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your preferred tone..." />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((tone) => (
                    <SelectItem key={tone} value={tone.toLowerCase()}>
                      {tone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="length">Prompt Length</Label>
              <Select
                value={preferences.preferred_length}
                onValueChange={(value) => setPreferences({ ...preferences, preferred_length: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select preferred length..." />
                </SelectTrigger>
                <SelectContent>
                  {LENGTHS.map((length) => (
                    <SelectItem key={length.value} value={length.value}>
                      {length.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={savePreferences}
              disabled={isSaving}
              className="w-full"
            >
              <Settings className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
