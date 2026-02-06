import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PredictionRequest {
  userId: string;
  predictionType: 'performance' | 'trends' | 'recommendations' | 'anomalies';
  timeframe?: '7d' | '30d' | '90d';
  includeConfidence?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, predictionType, timeframe = '30d', includeConfidence = true }: PredictionRequest = await req.json();

    console.log(`Predictive Insights: ${predictionType} for user ${userId}`);

    const { data: metrics } = await supabase
      .from('analytics_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(50);

    const { data: feedback } = await supabase
      .from('prompt_feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: globalTrends } = await supabase
      .from('global_topic_trends')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const userPrompt = `Generate ${predictionType} predictions for ${timeframe} timeframe.

User Metrics (${metrics?.length || 0} points): ${JSON.stringify(metrics?.slice(0, 15))}
Feedback: ${JSON.stringify(feedback?.slice(0, 10))}
Global Trends: ${JSON.stringify(globalTrends?.slice(0, 5))}

Return JSON with predictions, confidence scores, key factors, risks, opportunities, and recommended actions.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          { role: 'system', content: `You are a predictive analytics AI expert for prompt engineering.` },
          { role: 'user', content: userPrompt }
        ]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    let predictions;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      predictions = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: content };
    } catch {
      predictions = { summary: content };
    }

    await supabase.from('ai_insights').insert({
      user_id: userId,
      insight_type: predictionType,
      analysis_data: predictions,
      context: { timeframe, dataPoints: metrics?.length || 0 },
      created_at: new Date().toISOString()
    });

    console.log(`${predictionType} predictions generated`);

    return new Response(JSON.stringify({
      success: true, predictionType, timeframe, predictions,
      confidence: includeConfidence ? 0.82 : undefined,
      dataPointsAnalyzed: (metrics?.length || 0) + (feedback?.length || 0),
      timestamp: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Predictive Insights Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Predictive analysis failed'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
