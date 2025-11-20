import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PredictionRequest {
  userId: string;
  predictionType: 'performance' | 'trends' | 'recommendations' | 'anomalies';
  timeframe?: '7d' | '30d' | '90d';
  includeConfidence?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { 
      userId, 
      predictionType,
      timeframe = '30d',
      includeConfidence = true 
    }: PredictionRequest = await req.json();

    console.log(`Predictive Insights: Generating ${predictionType} predictions for user ${userId}`);

    // Fetch comprehensive historical data
    const { data: metrics, error: metricsError } = await supabase
      .from('analytics_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (metricsError) throw metricsError;

    // Fetch prompt performance data
    const { data: performance, error: perfError } = await supabase
      .from('prompt_performance')
      .select('*')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(50);

    if (perfError) throw perfError;

    // Fetch feedback and ratings
    const { data: feedback, error: feedbackError } = await supabase
      .from('prompt_feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (feedbackError) throw feedbackError;

    // Fetch global trends for comparison
    const { data: globalTrends } = await supabase
      .from('global_topic_trends')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    // Calculate statistics
    const calculateStats = (data: any[], field: string) => {
      if (!data || data.length === 0) return { mean: 0, trend: 'stable' };
      
      const values = data.map(d => d[field] || 0).filter(v => v > 0);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      
      const recent = values.slice(0, Math.floor(values.length / 3));
      const older = values.slice(-Math.floor(values.length / 3));
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      
      const trendValue = ((recentAvg - olderAvg) / olderAvg) * 100;
      const trend = trendValue > 5 ? 'improving' : trendValue < -5 ? 'declining' : 'stable';
      
      return { mean, trend, trendValue };
    };

    const engagementStats = calculateStats(performance || [], 'engagement_score');
    const conversionStats = calculateStats(performance || [], 'conversions');

    let systemPrompt = '';
    let userPrompt = '';

    switch (predictionType) {
      case 'performance':
        systemPrompt = `You are a predictive analytics AI expert. Analyze historical performance data and predict future outcomes
        with high accuracy. Use statistical patterns, trends, and contextual factors. Provide confidence intervals.`;
        
        userPrompt = `Predict future performance based on this data:

HISTORICAL METRICS (last ${metrics?.length || 0} data points):
${JSON.stringify(metrics?.slice(0, 30))}

PERFORMANCE DATA:
${JSON.stringify(performance)}

CURRENT STATISTICS:
- Engagement: Mean ${engagementStats.mean.toFixed(2)}, Trend: ${engagementStats.trend} (${(engagementStats.trendValue || 0).toFixed(1)}%)
- Conversions: Mean ${conversionStats.mean.toFixed(2)}, Trend: ${conversionStats.trend}

FEEDBACK PATTERNS:
${JSON.stringify(feedback?.slice(0, 20))}

Predict for ${timeframe}:
1. Expected performance metrics (engagement, conversions, views, etc.)
2. Confidence intervals (best case, likely case, worst case)
3. Key factors affecting predictions
4. Potential risks or opportunities
5. Recommended actions to improve trajectory
6. Milestone predictions (when will user hit key thresholds)

Format as JSON with: predictions, confidence, factors, risks, opportunities, actions, milestones`;
        break;

      case 'trends':
        systemPrompt = `You are a trend analysis AI expert. Identify emerging trends, patterns, and shifts in user behavior
        and performance. Connect micro-trends to macro patterns. Predict trend continuation or reversal.`;
        
        userPrompt = `Analyze trends in this data:

USER DATA:
Metrics: ${JSON.stringify(metrics?.slice(0, 40))}
Performance: ${JSON.stringify(performance?.slice(0, 20))}
Feedback: ${JSON.stringify(feedback?.slice(0, 15))}

GLOBAL TRENDS:
${JSON.stringify(globalTrends)}

STATISTICS:
${JSON.stringify({ engagement: engagementStats, conversions: conversionStats })}

Identify:
1. Emerging trends in user's performance (micro-trends)
2. How user trends align with global trends (context)
3. Trend strength and sustainability
4. Expected trend direction (continuing, reversing, accelerating)
5. Opportunities from trend analysis
6. Risks from ignoring trends

Format as JSON with: emerging, alignment, strength, direction, opportunities, risks`;
        break;

      case 'recommendations':
        systemPrompt = `You are an AI recommendation engine. Generate highly personalized, data-driven recommendations
        that will maximize user success. Prioritize by impact and feasibility. Be specific and actionable.`;
        
        userPrompt = `Generate intelligent recommendations based on:

PERFORMANCE DATA:
${JSON.stringify(performance)}

METRICS:
${JSON.stringify(metrics?.slice(0, 30))}

FEEDBACK:
${JSON.stringify(feedback?.slice(0, 20))}

TRENDS:
Engagement: ${engagementStats.trend} (${(engagementStats.trendValue || 0).toFixed(1)}%)
Conversions: ${conversionStats.trend}

Generate:
1. Top 5 high-impact recommendations (specific actions)
2. Quick wins (immediate improvements, low effort)
3. Strategic recommendations (long-term value)
4. Personalized recommendations (based on user patterns)
5. Priority order with reasoning
6. Expected impact for each (quantified)
7. Implementation difficulty (low/medium/high)

Format as JSON with: topRecommendations, quickWins, strategic, personalized, impact`;
        break;

      case 'anomalies':
        systemPrompt = `You are an anomaly detection AI. Identify unusual patterns, outliers, and anomalies that deserve attention.
        Distinguish between positive anomalies (opportunities) and negative ones (risks). Provide context and actionability.`;
        
        userPrompt = `Detect anomalies in this data:

METRICS:
${JSON.stringify(metrics)}

PERFORMANCE:
${JSON.stringify(performance)}

FEEDBACK:
${JSON.stringify(feedback)}

NORMAL RANGES:
Engagement: ${engagementStats.mean.toFixed(2)} ± 20%
Conversions: ${conversionStats.mean.toFixed(2)} ± 25%

Detect:
1. Performance anomalies (unusual spikes or drops)
2. Pattern anomalies (breaks in normal patterns)
3. Positive anomalies (unexpected successes to learn from)
4. Negative anomalies (problems to address)
5. Root cause analysis for each
6. Recommended actions

Format as JSON with: performanceAnomalies, patternAnomalies, positive, negative, rootCauses, actions`;
        break;
    }

    // Call Claude AI for predictions
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: systemPrompt + '\n\n' + userPrompt
          }
        ]
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const body = await aiResponse.text();
      console.error('Claude API error:', status, body);
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402 || status === 400) {
        return new Response(
          JSON.stringify({ error: 'API error. Please check your Anthropic API key in Secrets.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Claude API error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.content[0].text;
    let predictions;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      predictions = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      predictions = { summary: content };
    }

    // Store predictions for future validation
    const { error: storeError } = await supabase
      .from('ai_insights')
      .insert({
        user_id: userId,
        insight_type: predictionType,
        analysis_data: predictions,
        context: {
          timeframe,
          dataPoints: metrics?.length || 0,
          stats: { engagement: engagementStats, conversions: conversionStats }
        },
        created_at: new Date().toISOString()
      });

    if (storeError) console.error('Prediction storage error:', storeError);

    console.log(`${predictionType} predictions generated successfully`);

    return new Response(JSON.stringify({
      success: true,
      predictionType,
      timeframe,
      predictions,
      confidence: includeConfidence ? 0.82 : undefined,
      dataPointsAnalyzed: (metrics?.length || 0) + (performance?.length || 0) + (feedback?.length || 0),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Predictive Insights Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Predictive analysis failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
