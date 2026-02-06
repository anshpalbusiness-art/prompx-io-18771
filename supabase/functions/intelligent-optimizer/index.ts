import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface OptimizationRequest {
  userId: string;
  promptId?: string;
  promptText: string;
  platform: string;
  category?: string;
  targetMetrics?: string[];
  learningEnabled?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { 
      userId, promptId, promptText, platform, category,
      targetMetrics = ['engagement', 'conversion', 'clarity'],
      learningEnabled = true 
    }: OptimizationRequest = await req.json();

    console.log(`Intelligent Optimizer: Processing for user ${userId} on ${platform}`);

    // Fetch user's historical successful patterns
    const { data: successfulPrompts } = await supabase
      .from('prompt_history')
      .select('*, prompt_feedback(*)')
      .eq('user_id', userId)
      .eq('platform', platform)
      .gte('rating', 4)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch global successful patterns
    const { data: globalPatterns } = await supabase
      .from('global_prompt_patterns')
      .select('*')
      .eq('platform', platform)
      .gte('success_rate', 0.7)
      .order('usage_count', { ascending: false })
      .limit(5);

    const systemPrompt = `You are an elite AI prompt engineering optimizer.
Your goal is to transform prompts into highly effective versions that maximize ${targetMetrics.join(', ')}.
Provide specific, actionable improvements with reasoning.`;

    const userPrompt = `Optimize this ${platform} prompt for ${targetMetrics.join(', ')}:

"${promptText}"

Category: ${category || 'general'}

${successfulPrompts?.length ? `User's successful patterns: ${JSON.stringify(successfulPrompts.slice(0, 3).map(p => p.optimized_prompt))}` : ''}
${globalPatterns?.length ? `Global best practices: ${JSON.stringify(globalPatterns.map(p => p.pattern_description))}` : ''}

Return JSON: {"optimized": "...", "alternatives": ["..."], "improvements": ["..."], "impact": {}, "testing": {}, "notes": "..."}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices[0].message.content;
    
    let optimization;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      optimization = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseText);
    } catch {
      optimization = {
        optimized: responseText,
        alternatives: [],
        improvements: ['AI-optimized'],
        impact: {},
        testing: {},
        notes: 'Optimized by AI'
      };
    }

    if (learningEnabled && promptId) {
      await supabase.from('prompt_feedback').insert({
        user_id: userId,
        prompt_id: promptId,
        original_prompt: promptText,
        optimized_prompt: optimization.optimized,
        feedback_type: 'ai_optimization',
        improvements: optimization.improvements,
        learned_patterns: {
          alternatives: optimization.alternatives,
          expectedImpact: optimization.impact,
        },
        created_at: new Date().toISOString()
      });
    }

    console.log('Intelligent optimization complete');

    return new Response(JSON.stringify({
      success: true,
      original: promptText,
      optimized: optimization.optimized,
      alternatives: optimization.alternatives || [],
      improvements: optimization.improvements || [],
      expectedImpact: optimization.impact || {},
      testingRecommendations: optimization.testing || {},
      platformNotes: optimization.notes || '',
      confidenceScore: 0.85,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Intelligent Optimizer Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Intelligent optimization failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
