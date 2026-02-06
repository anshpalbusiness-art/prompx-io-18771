import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AnalyticsRequest {
  userId: string;
  analysisType: 'performance' | 'prediction' | 'optimization' | 'insights';
  dataPoints?: any[];
  context?: Record<string, any>;
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
    const { userId, analysisType, dataPoints, context }: AnalyticsRequest = await req.json();

    console.log(`AI Analytics Engine: Processing ${analysisType} for user ${userId}`);

    const { data: historicalData } = await supabase
      .from('prompt_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: performanceData } = await supabase
      .from('analytics_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(30);

    const prompts: Record<string, { system: string; user: string }> = {
      performance: {
        system: 'You are an expert AI analytics system for prompt engineering performance analysis.',
        user: `Analyze performance data:\nHistorical: ${JSON.stringify(historicalData?.slice(0, 10))}\nMetrics: ${JSON.stringify(performanceData?.slice(0, 10))}\nContext: ${JSON.stringify(context)}\n\nProvide JSON with: insights, patterns, recommendations, predictions, risks`
      },
      prediction: {
        system: 'You are a predictive AI analytics expert.',
        user: `Predict future performance:\nData: ${JSON.stringify(historicalData?.slice(0, 10))}\nMetrics: ${JSON.stringify(performanceData?.slice(0, 10))}\n\nProvide JSON with: predictions, trends, opportunities, actions, ranges`
      },
      optimization: {
        system: 'You are an AI optimization specialist.',
        user: `Provide optimization recommendations:\nPerformance: ${JSON.stringify(performanceData?.slice(0, 10))}\nData Points: ${JSON.stringify(dataPoints)}\n\nProvide JSON with: optimizations, quickWins, longTerm`
      },
      insights: {
        system: 'You are an intelligent insights generator.',
        user: `Generate insights:\nPerformance: ${JSON.stringify(performanceData?.slice(0, 10))}\nHistorical: ${JSON.stringify(historicalData?.slice(0, 10))}\n\nProvide JSON with: patterns, anomalies, comparisons, discoveries, trends`
      }
    };

    const p = prompts[analysisType] || prompts.insights;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: p.system },
          { role: 'user', content: p.user }
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let analysis;
    try {
      const content = aiData.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { insights: [{ title: 'Analysis Complete', description: content.slice(0, 500), insight: content }] };
    } catch {
      analysis = { insights: [{ title: 'Data Analysis', description: 'Analysis generated', insight: aiData.choices?.[0]?.message?.content || '' }] };
    }

    await supabase.from('ai_insights').insert({
      user_id: userId,
      insight_type: analysisType,
      analysis_data: analysis,
      context: context,
      created_at: new Date().toISOString()
    });

    console.log(`Analysis complete for ${analysisType}`);

    return new Response(JSON.stringify({
      success: true, analysisType, analysis,
      dataPointsAnalyzed: (historicalData?.length || 0) + (performanceData?.length || 0),
      timestamp: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('AI Analytics Engine Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'AI analytics processing failed'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
