import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { 
      userId, 
      promptId,
      promptText, 
      platform, 
      category,
      targetMetrics = ['engagement', 'conversion', 'clarity'],
      learningEnabled = true 
    }: OptimizationRequest = await req.json();

    console.log(`Intelligent Optimizer: Processing prompt for user ${userId} on ${platform}`);

    // Fetch user's historical successful patterns
    const { data: successfulPrompts, error: historyError } = await supabase
      .from('prompt_history')
      .select('*, prompt_feedback(*)')
      .eq('user_id', userId)
      .eq('platform', platform)
      .gte('rating', 4)
      .order('created_at', { ascending: false })
      .limit(20);

    if (historyError) console.error('History fetch error:', historyError);

    // Fetch global successful patterns
    const { data: globalPatterns, error: patternsError } = await supabase
      .from('global_prompt_patterns')
      .select('*')
      .eq('platform', platform)
      .gte('success_rate', 0.7)
      .order('usage_count', { ascending: false })
      .limit(10);

    if (patternsError) console.error('Patterns fetch error:', patternsError);

    // Fetch optimization insights
    const { data: insights, error: insightsError } = await supabase
      .from('optimization_insights')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('platform', platform)
      .order('confidence_level', { ascending: false })
      .limit(15);

    if (insightsError) console.error('Insights fetch error:', insightsError);

    // Fetch AI-generated insights for this user
    const { data: aiInsights } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('insight_type', 'optimization')
      .order('created_at', { ascending: false })
      .limit(5);

    // Build intelligent optimization prompt
    const systemPrompt = `You are an elite AI prompt engineering optimizer with deep expertise across all platforms.
    Your goal is to transform prompts into highly effective versions that maximize ${targetMetrics.join(', ')}.
    
    Use proven patterns, psychological principles, and data-driven insights to create optimized prompts.
    Consider: clarity, engagement, specificity, emotional resonance, and platform-specific best practices.
    
    IMPORTANT: 
    - Provide specific, actionable improvements
    - Explain the reasoning behind each change
    - Include multiple variations when beneficial
    - Quantify expected improvements
    - Consider A/B testing opportunities`;

    const userPrompt = `Optimize this ${platform} prompt for maximum ${targetMetrics.join(', ')}:

ORIGINAL PROMPT:
"${promptText}"

CONTEXT:
- Platform: ${platform}
- Category: ${category || 'general'}
- Target Metrics: ${targetMetrics.join(', ')}

USER'S SUCCESSFUL PATTERNS:
${JSON.stringify(successfulPrompts?.slice(0, 5).map(p => ({
  prompt: p.optimized_prompt,
  rating: p.rating,
  feedback: p.prompt_feedback?.[0]
})) || [])}

GLOBAL BEST PRACTICES:
${JSON.stringify(globalPatterns?.map(p => ({
  pattern: p.pattern_description,
  successRate: p.success_rate,
  avgImprovement: p.avg_improvement
})) || [])}

OPTIMIZATION INSIGHTS:
${JSON.stringify(insights?.slice(0, 5).map(i => ({
  pattern: i.pattern_description,
  improvement: i.avg_improvement,
  confidence: i.confidence_level
})) || [])}

PREVIOUS AI INSIGHTS:
${JSON.stringify(aiInsights?.map(i => i.analysis_data) || [])}

Provide:
1. OPTIMIZED_PROMPT: The best optimized version
2. ALTERNATIVE_VERSIONS: 2-3 alternative optimizations for A/B testing
3. IMPROVEMENTS: Specific changes made and why
4. EXPECTED_IMPACT: Quantified predictions for each metric
5. A_B_TEST_RECOMMENDATIONS: Which variations to test and why
6. IMPLEMENTATION_NOTES: Platform-specific considerations

Format as JSON with: optimized, alternatives (array), improvements (array), impact, testing, notes`;

    // Use Grok for superior optimization
    const GROK_API_KEY = Deno.env.get('GROK_API_KEY');
    
    if (!GROK_API_KEY) {
      throw new Error('GROK_API_KEY is not configured');
    }
    
    const aiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2-1212',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Grok API Error:', errorText);
      throw new Error(`Grok API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices[0].message.content;
    
    // Parse JSON response
    let optimization;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      optimization = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseText);
    } catch (e) {
      optimization = {
        optimized: responseText,
        alternatives: [],
        improvements: ['Claude-optimized'],
        impact: {},
        testing: {},
        notes: 'Optimized by Claude AI'
      };
    }

    // Store optimization for learning
    if (learningEnabled) {
      const { error: learningError } = await supabase
        .from('prompt_feedback')
        .insert({
          user_id: userId,
          prompt_id: promptId,
          original_prompt: promptText,
          optimized_prompt: optimization.optimized,
          feedback_type: 'ai_optimization',
          improvements: optimization.improvements,
          learned_patterns: {
            alternatives: optimization.alternatives,
            expectedImpact: optimization.impact,
            testingRecommendations: optimization.testing
          },
          created_at: new Date().toISOString()
        });

      if (learningError) console.error('Learning storage error:', learningError);
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
