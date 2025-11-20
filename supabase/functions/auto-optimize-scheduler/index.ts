import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutoOptimizeRequest {
  userId?: string;
  forceOptimize?: boolean;
  performanceThreshold?: number;
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
      forceOptimize = false,
      performanceThreshold = 0.6 
    }: AutoOptimizeRequest = await req.json().catch(() => ({}));

    console.log('Auto-optimization scheduler starting...');

    // Find prompts that need optimization
    let query = supabase
      .from('prompt_performance')
      .select('*')
      .order('engagement_score', { ascending: true })
      .limit(10);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: underperforming, error: queryError } = await query;

    if (queryError) throw queryError;

    console.log(`Found ${underperforming?.length || 0} underperforming prompts`);

    const optimizationJobs = [];

    for (const prompt of underperforming || []) {
      // Check if engagement score is below threshold or forceOptimize
      const needsOptimization = forceOptimize || 
        (prompt.engagement_score && prompt.engagement_score < (performanceThreshold * 100));

      if (!needsOptimization) continue;

      // Get original prompt text
      const { data: promptHistory } = await supabase
        .from('prompt_history')
        .select('*')
        .eq('id', prompt.prompt_id)
        .single();

      if (!promptHistory) continue;

      // Create optimization job
      const { data: job, error: jobError } = await supabase
        .from('auto_optimization_jobs')
        .insert({
          user_id: prompt.user_id,
          prompt_id: prompt.prompt_id,
          status: 'running',
          trigger_reason: forceOptimize ? 'manual' : 'scheduled',
          original_prompt: promptHistory.original_prompt
        })
        .select()
        .single();

      if (jobError) {
        console.error('Job creation error:', jobError);
        continue;
      }

      try {
        // Call intelligent optimizer
        const optimizeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                content: `You are an expert prompt optimizer. Analyze the given prompt and improve it for better engagement and conversion. Current engagement score: ${prompt.engagement_score}. Focus on clarity, specificity, and actionability.`
              },
              {
                role: 'user',
                content: `Optimize this prompt:\n\n${promptHistory.original_prompt}\n\nProvide the optimized version and explain key improvements.`
              }
            ],
            temperature: 0.7,
          }),
        });

        if (!optimizeResponse.ok) {
          throw new Error(`Optimization failed: ${optimizeResponse.status}`);
        }

        const optimizeData = await optimizeResponse.json();
        const optimizedPrompt = optimizeData.choices[0].message.content;

        // Calculate improvement score (estimated)
        const improvementScore = Math.min(0.3, (1 - (prompt.engagement_score / 100))) * 100;

        // Update job with results
        await supabase
          .from('auto_optimization_jobs')
          .update({
            status: 'completed',
            optimized_prompt: optimizedPrompt,
            improvement_score: improvementScore,
            optimization_insights: {
              originalScore: prompt.engagement_score,
              estimatedImprovement: improvementScore,
              optimizationReason: 'Low engagement score detected'
            },
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Create predictive alert for user
        await supabase
          .from('predictive_alerts')
          .insert({
            user_id: prompt.user_id,
            alert_type: 'opportunity',
            severity: 'info',
            title: 'Prompt Auto-Optimized',
            description: `We've automatically optimized your prompt with low engagement (${prompt.engagement_score}%). Review the optimized version in your history.`,
            predicted_impact: improvementScore,
            confidence_score: 0.75,
            recommended_actions: [
              { action: 'Review optimized prompt', priority: 'high' },
              { action: 'A/B test against original', priority: 'medium' }
            ]
          });

        optimizationJobs.push({
          jobId: job.id,
          promptId: prompt.prompt_id,
          status: 'completed',
          improvement: improvementScore
        });

      } catch (error: any) {
        console.error('Optimization error:', error);
        
        await supabase
          .from('auto_optimization_jobs')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }
    }

    console.log(`Completed ${optimizationJobs.length} optimization jobs`);

    return new Response(JSON.stringify({
      success: true,
      jobsCompleted: optimizationJobs.length,
      jobs: optimizationJobs,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Auto-optimization scheduler error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Auto-optimization failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
