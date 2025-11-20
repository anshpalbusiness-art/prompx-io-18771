import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ABTestRequest {
  action: 'create' | 'record' | 'analyze' | 'complete';
  experimentId?: string;
  userId?: string;
  testName?: string;
  controlVariant?: string;
  treatmentVariant?: string;
  variant?: 'control' | 'treatment';
  converted?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: ABTestRequest = await req.json();

    console.log('A/B Test Manager:', body.action);

    switch (body.action) {
      case 'create': {
        // Create new A/B test experiment
        const { data: experiment, error } = await supabase
          .from('ab_test_experiments')
          .insert({
            user_id: body.userId!,
            test_name: body.testName!,
            control_variant: body.controlVariant!,
            treatment_variant: body.treatmentVariant!,
            status: 'active',
            started_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          experiment,
          message: 'A/B test created successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'record': {
        // Record conversion for a variant
        if (!body.experimentId) throw new Error('Experiment ID required');

        const { data: experiment, error: fetchError } = await supabase
          .from('ab_test_experiments')
          .select('*')
          .eq('id', body.experimentId)
          .single();

        if (fetchError) throw fetchError;

        const updates: any = {
          sample_size: experiment.sample_size + 1
        };

        if (body.variant === 'control') {
          if (body.converted) {
            updates.control_conversions = experiment.control_conversions + 1;
          }
        } else if (body.variant === 'treatment') {
          if (body.converted) {
            updates.treatment_conversions = experiment.treatment_conversions + 1;
          }
        }

        const { error: updateError } = await supabase
          .from('ab_test_experiments')
          .update(updates)
          .eq('id', body.experimentId);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({
          success: true,
          message: 'Conversion recorded'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'analyze': {
        // Calculate statistical significance
        if (!body.experimentId) throw new Error('Experiment ID required');

        const { data: experiment, error } = await supabase
          .from('ab_test_experiments')
          .select('*')
          .eq('id', body.experimentId)
          .single();

        if (error) throw error;

        const controlRate = experiment.sample_size > 0 
          ? experiment.control_conversions / (experiment.sample_size / 2) 
          : 0;
        
        const treatmentRate = experiment.sample_size > 0
          ? experiment.treatment_conversions / (experiment.sample_size / 2)
          : 0;

        // Simple z-test for proportions
        const pooledRate = (experiment.control_conversions + experiment.treatment_conversions) / experiment.sample_size;
        const se = Math.sqrt(pooledRate * (1 - pooledRate) * (2 / experiment.sample_size));
        const zScore = se > 0 ? Math.abs(controlRate - treatmentRate) / se : 0;
        
        // Convert z-score to p-value (approximate)
        const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
        const isSignificant = pValue < 0.05;

        let winner = 'inconclusive';
        if (isSignificant) {
          winner = treatmentRate > controlRate ? 'treatment' : 'control';
        }

        // Update experiment with results
        await supabase
          .from('ab_test_experiments')
          .update({
            statistical_significance: 1 - pValue,
            winner: winner,
            metadata: {
              controlRate,
              treatmentRate,
              zScore,
              pValue,
              analyzedAt: new Date().toISOString()
            }
          })
          .eq('id', body.experimentId);

        return new Response(JSON.stringify({
          success: true,
          analysis: {
            controlRate,
            treatmentRate,
            isSignificant,
            winner,
            pValue,
            sampleSize: experiment.sample_size,
            confidence: (1 - pValue) * 100
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'complete': {
        // Complete the experiment
        if (!body.experimentId) throw new Error('Experiment ID required');

        const { error } = await supabase
          .from('ab_test_experiments')
          .update({
            status: 'completed',
            ended_at: new Date().toISOString()
          })
          .eq('id', body.experimentId);

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          message: 'Experiment completed'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('A/B Test Manager error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'A/B test operation failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function for normal CDF approximation
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}
