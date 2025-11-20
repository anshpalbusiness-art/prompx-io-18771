import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdaptiveRequest {
  userId: string;
  action: 'train_model' | 'predict' | 'get_insights';
  modelType?: 'recommendation' | 'optimization' | 'prediction';
  inputData?: any;
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
    const { userId, action, modelType, inputData }: AdaptiveRequest = await req.json();

    console.log(`Adaptive Learning: ${action} for user ${userId}`);

    switch (action) {
      case 'train_model': {
        // Fetch all user behavior for training
        const { data: allBehavior, error: behaviorError } = await supabase
          .from('user_behavior')
          .select('*')
          .eq('user_id', userId)
          .order('recorded_at', { ascending: false })
          .limit(500);

        if (behaviorError) throw behaviorError;

        if (!allBehavior || allBehavior.length < 10) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Insufficient data for training (need at least 10 data points)',
            dataPoints: allBehavior?.length || 0
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Use AI to analyze patterns and create model
        const trainingResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro',
            messages: [
              {
                role: 'system',
                content: `You are a machine learning expert that analyzes user behavior patterns to create predictive models.
                Analyze the behavior data and extract:
                1. Key success indicators
                2. Common patterns in successful behaviors
                3. Feature importance (which factors matter most)
                4. Recommendations for future optimization
                5. Confidence scores for predictions`
              },
              {
                role: 'user',
                content: `Analyze this user behavior data and create a ${modelType || 'recommendation'} model:
                
                Behavior Data (${allBehavior.length} samples):
                ${JSON.stringify(allBehavior.slice(0, 100))}
                
                Create a model with:
                - patterns: key success patterns identified
                - features: important features and their weights
                - rules: decision rules for predictions
                - accuracy: estimated model accuracy
                - insights: actionable insights
                
                Format as JSON.`
              }
            ],
            temperature: 0.5,
            response_format: { type: "json_object" }
          }),
        });

        if (!trainingResponse.ok) {
          throw new Error(`Model training failed: ${trainingResponse.status}`);
        }

        const trainingData = await trainingResponse.json();
        const model = JSON.parse(trainingData.choices[0].message.content);

        // Check if model already exists
        const { data: existingModel } = await supabase
          .from('adaptive_models')
          .select('*')
          .eq('user_id', userId)
          .eq('model_type', modelType || 'recommendation')
          .eq('is_active', true)
          .maybeSingle();

        let newVersion = 1;
        if (existingModel) {
          newVersion = existingModel.model_version + 1;
          // Deactivate old model
          await supabase
            .from('adaptive_models')
            .update({ is_active: false })
            .eq('id', existingModel.id);
        }

        // Store new model
        const { data: newModel, error: modelError } = await supabase
          .from('adaptive_models')
          .insert({
            user_id: userId,
            model_type: modelType || 'recommendation',
            model_version: newVersion,
            model_data: model,
            accuracy_score: model.accuracy || 0.75,
            training_samples: allBehavior.length,
            is_active: true,
            metadata: {
              trainedAt: new Date().toISOString(),
              features: model.features,
              insights: model.insights
            }
          })
          .select()
          .single();

        if (modelError) throw modelError;

        return new Response(JSON.stringify({
          success: true,
          model: newModel,
          message: `Model v${newVersion} trained successfully`,
          trainingData: allBehavior.length,
          accuracy: model.accuracy || 0.75
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'predict': {
        // Get active model
        const { data: model, error: modelError } = await supabase
          .from('adaptive_models')
          .select('*')
          .eq('user_id', userId)
          .eq('model_type', modelType || 'recommendation')
          .eq('is_active', true)
          .maybeSingle();

        if (modelError) throw modelError;

        if (!model) {
          return new Response(JSON.stringify({
            success: false,
            message: 'No trained model found. Train a model first.'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Use AI with model context to make prediction
        const predictionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                content: `You are a prediction AI. Use the trained model rules and patterns to predict outcomes.
                Provide confidence scores and explain your reasoning.`
              },
              {
                role: 'user',
                content: `Make a prediction using this model:
                
                Model: ${JSON.stringify(model.model_data)}
                Input Data: ${JSON.stringify(inputData)}
                
                Predict:
                1. Expected outcome (success/failure)
                2. Confidence score (0-1)
                3. Key factors influencing prediction
                4. Recommendations to improve outcome
                
                Format as JSON: { prediction, confidence, factors, recommendations }`
              }
            ],
            temperature: 0.3,
            response_format: { type: "json_object" }
          }),
        });

        const predData = await predictionResponse.json();
        const prediction = JSON.parse(predData.choices[0].message.content);

        return new Response(JSON.stringify({
          success: true,
          prediction: prediction.prediction,
          confidence: prediction.confidence,
          factors: prediction.factors,
          recommendations: prediction.recommendations,
          modelVersion: model.model_version
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_insights': {
        // Get all active models
        const { data: models } = await supabase
          .from('adaptive_models')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true);

        // Get learned patterns
        const { data: patterns } = await supabase
          .from('learned_patterns')
          .select('*')
          .eq('user_id', userId)
          .order('success_rate', { ascending: false })
          .limit(10);

        // Get recent behavior stats
        const { data: recentBehavior } = await supabase
          .from('user_behavior')
          .select('success_score')
          .eq('user_id', userId)
          .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        const avgSuccess = recentBehavior && recentBehavior.length > 0
          ? recentBehavior.reduce((acc, b) => acc + (b.success_score || 0), 0) / recentBehavior.length
          : 0;

        return new Response(JSON.stringify({
          success: true,
          insights: {
            models: models || [],
            topPatterns: patterns || [],
            recentPerformance: {
              avgSuccessScore: avgSuccess,
              dataPoints: recentBehavior?.length || 0,
              trend: avgSuccess > 0.7 ? 'improving' : avgSuccess > 0.5 ? 'stable' : 'declining'
            }
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Adaptive Learning error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Adaptive learning operation failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
