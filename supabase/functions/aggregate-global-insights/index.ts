import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PromptData {
  id: string;
  prompt_text: string;
  category: string;
  platform: string;
  keywords: string[];
  created_at: string;
}

interface FeedbackData {
  rating: number;
  engagement_score: number;
  conversion_rate: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch successful prompts (rating >= 4, engagement_score > 50)
    const { data: successfulPrompts, error: promptError } = await supabase
      .from('prompt_nodes')
      .select(`
        id,
        prompt_text,
        category,
        platform,
        keywords,
        created_at
      `)
      .limit(100);

    if (promptError) throw promptError;

    const { data: feedback, error: feedbackError } = await supabase
      .from('prompt_feedback')
      .select('rating, engagement_score, conversion_rate, prompt_id')
      .gte('rating', 4)
      .gte('engagement_score', 50)
      .limit(100);

    if (feedbackError) throw feedbackError;

    // Filter prompts with good feedback
    const promptsWithFeedback = successfulPrompts?.filter(p => 
      feedback?.some(f => f.prompt_id === p.id)
    ) || [];

    if (promptsWithFeedback.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No successful prompts found to analyze' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Anonymize and prepare data for AI analysis
    const anonymizedData = promptsWithFeedback.map(p => ({
      category: p.category,
      platform: p.platform,
      keywords: p.keywords,
      structure: p.prompt_text?.length || 0,
    }));

    const systemPrompt = `You are a Prompt Intelligence Analyst for a global community platform.
Analyze anonymized prompt data to extract patterns, trends, and insights that benefit all users.

Your goal is to identify:
1. PATTERNS: Common structures, techniques, and formats that lead to success
2. TRENDS: Emerging topics, growing categories, and shifting preferences
3. INSIGHTS: Best practices, warnings, and opportunities for users

Output a JSON object with:
{
  "patterns": [
    {
      "pattern_type": "structure|keyword|technique|format",
      "pattern_name": "short name",
      "pattern_description": "what makes this effective",
      "success_rate": 0.8,
      "usage_count": 45,
      "avg_improvement": 25.5,
      "category": "marketing",
      "platform": "facebook",
      "example_pattern": { "structure": "question + benefit + CTA" }
    }
  ],
  "insights": [
    {
      "insight_type": "trend|best_practice|warning|opportunity",
      "title": "short title",
      "description": "detailed description",
      "confidence_score": 0.85,
      "impact_score": 0.9,
      "supporting_data": { "sample_size": 50 },
      "category": "marketing",
      "platform": "facebook"
    }
  ],
  "trends": [
    {
      "topic_name": "AI automation",
      "trend_direction": "rising|stable|declining",
      "popularity_score": 85,
      "growth_rate": 15.5,
      "related_topics": ["machine learning", "automation"],
      "category": "technology",
      "platform": "linkedin"
    }
  ]
}

Be specific, actionable, and focus on patterns that can help users improve their prompts.`;

    console.log('Calling AI for global insight analysis...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Analyze these ${anonymizedData.length} successful prompts and extract global insights:\n\n${JSON.stringify(anonymizedData, null, 2)}` 
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Insufficient credits. Please add credits to your Lovable AI workspace.');
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid AI response format');
    }

    // Store patterns
    if (analysis.patterns?.length > 0) {
      const { error: patternsError } = await supabase
        .from('global_prompt_patterns')
        .upsert(
          analysis.patterns.map((p: any) => ({
            pattern_type: p.pattern_type,
            pattern_name: p.pattern_name,
            pattern_description: p.pattern_description,
            success_rate: p.success_rate,
            usage_count: p.usage_count,
            avg_improvement: p.avg_improvement,
            category: p.category,
            platform: p.platform,
            example_pattern: p.example_pattern,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'pattern_name' }
        );

      if (patternsError) console.error('Error storing patterns:', patternsError);
    }

    // Store insights
    if (analysis.insights?.length > 0) {
      const { error: insightsError } = await supabase
        .from('global_insights')
        .insert(
          analysis.insights.map((i: any) => ({
            insight_type: i.insight_type,
            title: i.title,
            description: i.description,
            confidence_score: i.confidence_score,
            impact_score: i.impact_score,
            supporting_data: i.supporting_data,
            category: i.category,
            platform: i.platform,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          }))
        );

      if (insightsError) console.error('Error storing insights:', insightsError);
    }

    // Store trends
    if (analysis.trends?.length > 0) {
      const now = new Date();
      const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      const { error: trendsError } = await supabase
        .from('global_topic_trends')
        .insert(
          analysis.trends.map((t: any) => ({
            topic_name: t.topic_name,
            trend_direction: t.trend_direction,
            popularity_score: t.popularity_score,
            growth_rate: t.growth_rate,
            related_topics: t.related_topics,
            category: t.category,
            platform: t.platform,
            period_start: periodStart.toISOString(),
            period_end: now.toISOString(),
          }))
        );

      if (trendsError) console.error('Error storing trends:', trendsError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        patterns: analysis.patterns?.length || 0,
        insights: analysis.insights?.length || 0,
        trends: analysis.trends?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in aggregate-global-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
