import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metricsData, activityData, userGoals } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    console.log('Generating intelligent analytics insights with Claude...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: `As an expert data analyst and business intelligence specialist, analyze this user's performance data and provide actionable insights.

**Metrics Data:**
${JSON.stringify(metricsData, null, 2)}

**Activity Patterns:**
${JSON.stringify(activityData, null, 2)}

**User Goals:**
${userGoals || 'Improve productivity and optimize workflows'}

**Analysis Framework:**

1. **Performance Trends**
   - Identify growth patterns and trends
   - Spot anomalies or concerning patterns
   - Calculate velocity and acceleration
   - Determine seasonality effects

2. **Efficiency Assessment**
   - Calculate ROI and productivity metrics
   - Identify time-wasters and bottlenecks
   - Measure workflow optimization opportunities
   - Assess resource allocation effectiveness

3. **Predictive Insights**
   - Forecast next 30-day performance
   - Predict likely outcomes of current trajectory
   - Identify risk factors and opportunities
   - Calculate confidence intervals

4. **Actionable Recommendations**
   - Prioritized list of specific actions
   - Quick wins vs long-term strategies
   - Resource reallocation suggestions
   - Process improvement opportunities

5. **Competitive Benchmarking**
   - Compare to industry standards
   - Identify areas of excellence
   - Highlight gaps and weaknesses
   - Set realistic improvement targets

Provide a comprehensive yet digestible analysis in JSON format:
{
  "summary": "2-3 sentence executive summary",
  "keyMetrics": {
    "timeSaved": { "value": number, "trend": "up/down/stable", "change": number },
    "efficiency": { "score": number, "benchmark": number, "percentile": number },
    "productivity": { "index": number, "trend": "improving/declining/stable" }
  },
  "insights": [
    {
      "title": "Insight title",
      "description": "Detailed insight",
      "impact": "high/medium/low",
      "category": "opportunity/risk/achievement"
    }
  ],
  "predictions": {
    "next30Days": {
      "timeSaved": { "best": number, "likely": number, "worst": number },
      "productivity": { "best": number, "likely": number, "worst": number },
      "confidence": number
    }
  },
  "recommendations": [
    {
      "action": "Specific action to take",
      "impact": "high/medium/low",
      "effort": "low/medium/high",
      "priority": number,
      "expectedOutcome": "What will improve"
    }
  ],
  "anomalies": [
    {
      "type": "Performance drop/spike/irregularity",
      "description": "What was detected",
      "severity": "critical/warning/info",
      "recommendation": "How to address it"
    }
  ]
}`
          }
        ]
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.content[0].text;
    
    // Extract JSON from response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: analysisText };
    
    console.log('Intelligent analytics completed successfully');

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in intelligent-analytics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
