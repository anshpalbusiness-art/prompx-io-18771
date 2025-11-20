import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PersonalizationRequest {
  userId: string;
  action: 'get_recommendations' | 'learn_pattern' | 'update_preferences' | 'get_suggestions';
  context?: Record<string, any>;
  behaviorData?: {
    type: string;
    context: Record<string, any>;
    successScore?: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, action, context, behaviorData }: PersonalizationRequest = await req.json();

    console.log(`Personalization Engine: ${action} for user ${userId}`);

    // Get user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!preferences?.personalization_enabled && action !== 'update_preferences') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Personalization is disabled for this user'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'get_recommendations': {
        // Fetch user behavior history
        const { data: behavior } = await supabase
          .from('user_behavior')
          .select('*')
          .eq('user_id', userId)
          .order('recorded_at', { ascending: false })
          .limit(50);

        // Fetch learned patterns
        const { data: patterns } = await supabase
          .from('learned_patterns')
          .select('*')
          .eq('user_id', userId)
          .order('success_rate', { ascending: false })
          .limit(10);

        // Fetch global successful patterns
        const { data: globalPatterns } = await supabase
          .from('global_prompt_patterns')
          .select('*')
          .order('success_rate', { ascending: false })
          .limit(20);

        // Generate AI-powered personalized recommendations
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are a personalization AI that generates highly relevant recommendations based on user behavior and preferences. 
                Analyze user patterns and provide 5 personalized recommendations that will help them succeed.
                Focus on actionable, specific suggestions tailored to their usage patterns.`
              },
              {
                role: 'user',
                content: `Generate personalized recommendations:
                
                User Profile:
                - Industry: ${preferences?.industry || 'general'}
                - Experience: ${preferences?.experience_level || 'intermediate'}
                - Goals: ${JSON.stringify(preferences?.optimization_goals || [])}
                - Platforms: ${JSON.stringify(preferences?.preferred_platforms || [])}
                
                Recent Behavior:
                ${JSON.stringify(behavior?.slice(0, 10))}
                
                Successful Patterns:
                ${JSON.stringify(patterns)}
                
                Global Best Practices:
                ${JSON.stringify(globalPatterns?.slice(0, 5))}
                
                Context: ${JSON.stringify(context)}
                
                Provide 5 recommendations with: type, title, description, content, reason, relevance_score (0-1).
                Format as JSON: { recommendations: [...] }`
              }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
          }),
        });

        if (!aiResponse.ok) {
          throw new Error(`AI recommendation failed: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const recommendations = JSON.parse(aiData.choices[0].message.content);

        // Store recommendations in database
        const storedRecs = [];
        for (const rec of recommendations.recommendations || []) {
          const { data: stored, error } = await supabase
            .from('personalized_recommendations')
            .insert({
              user_id: userId,
              recommendation_type: rec.type || 'optimization',
              title: rec.title,
              description: rec.description,
              content: rec.content,
              relevance_score: rec.relevance_score,
              reason: rec.reason,
              based_on: behavior?.slice(0, 5).map(b => b.behavior_type) || [],
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single();

          if (!error && stored) {
            storedRecs.push(stored);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          recommendations: storedRecs,
          count: storedRecs.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'learn_pattern': {
        if (!behaviorData) {
          throw new Error('Behavior data required for learning');
        }

        // Record behavior
        await supabase
          .from('user_behavior')
          .insert({
            user_id: userId,
            behavior_type: behaviorData.type,
            context: behaviorData.context,
            success_score: behaviorData.successScore,
            metadata: context
          });

        // Analyze if this creates a new pattern
        const { data: similarBehavior } = await supabase
          .from('user_behavior')
          .select('*')
          .eq('user_id', userId)
          .eq('behavior_type', behaviorData.type)
          .gte('success_score', 0.7)
          .limit(10);

        if (similarBehavior && similarBehavior.length >= 3) {
          // Detected a pattern - create or update learned pattern
          const patternName = `${behaviorData.type}_success_pattern`;
          
          const { data: existingPattern } = await supabase
            .from('learned_patterns')
            .select('*')
            .eq('user_id', userId)
            .eq('pattern_name', patternName)
            .maybeSingle();

          const avgSuccess = similarBehavior.reduce((acc, b) => acc + (b.success_score || 0), 0) / similarBehavior.length;

          if (existingPattern) {
            await supabase
              .from('learned_patterns')
              .update({
                success_rate: avgSuccess,
                usage_count: existingPattern.usage_count + 1,
                last_successful_at: new Date().toISOString(),
                confidence_score: Math.min(1, existingPattern.confidence_score + 0.05)
              })
              .eq('id', existingPattern.id);
          } else {
            await supabase
              .from('learned_patterns')
              .insert({
                user_id: userId,
                pattern_type: behaviorData.type,
                pattern_name: patternName,
                pattern_data: {
                  commonElements: behaviorData.context,
                  successfulExamples: similarBehavior.slice(0, 3)
                },
                success_rate: avgSuccess,
                usage_count: 1,
                last_successful_at: new Date().toISOString(),
                confidence_score: 0.6
              });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          patternDetected: similarBehavior && similarBehavior.length >= 3,
          message: 'Behavior recorded and analyzed'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_suggestions': {
        // Get context-aware suggestions
        const contextType = context?.type || 'general';
        const contextValue = context?.value || 'default';

        // Check cache first
        const { data: cached } = await supabase
          .from('context_suggestions')
          .select('*')
          .eq('user_id', userId)
          .eq('context_type', contextType)
          .eq('context_value', contextValue)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (cached) {
          return new Response(JSON.stringify({
            success: true,
            suggestions: cached.suggestions,
            cached: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generate new suggestions
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Generate context-aware suggestions for prompt engineering. Be specific and actionable.`
              },
              {
                role: 'user',
                content: `Context: ${contextType} = ${contextValue}
                User preferences: ${JSON.stringify(preferences)}
                
                Provide 5-7 relevant suggestions as JSON array of strings.`
              }
            ],
            temperature: 0.6,
            response_format: { type: "json_object" }
          }),
        });

        const aiData = await aiResponse.json();
        const result = JSON.parse(aiData.choices[0].message.content);

        // Cache suggestions
        await supabase
          .from('context_suggestions')
          .upsert({
            user_id: userId,
            context_type: contextType,
            context_value: contextValue,
            suggestions: result.suggestions || [],
            relevance_score: 0.8,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });

        return new Response(JSON.stringify({
          success: true,
          suggestions: result.suggestions || [],
          cached: false
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Personalization Engine error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Personalization operation failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
