import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const models = [
      { name: 'Gemini 2.5 Flash', id: 'google/gemini-2.5-flash', description: 'Fast & balanced' },
      { name: 'GPT-5 Mini', id: 'openai/gpt-5-mini', description: 'Strong reasoning, lower cost' },
    ];

    const results = await Promise.all(
      models.map(async (model) => {
        const startTime = Date.now();
        try {
          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: model.id,
              max_tokens: 2000,
              messages: [{ role: 'user', content: prompt }],
            }),
          });

          const responseTime = Date.now() - startTime;

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error from ${model.name}:`, response.status, errorText);
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '';
          const scores = calculateQualityScores(content, prompt);

          return {
            model: model.name,
            modelId: model.id,
            response: content,
            responseTime,
            ...scores,
            success: true,
          };
        } catch (error) {
          console.error(`Error with ${model.name}:`, error);
          return {
            model: model.name,
            modelId: model.id,
            response: '',
            responseTime: Date.now() - startTime,
            clarityScore: 0, originalityScore: 0, depthScore: 0, relevanceScore: 0, overallScore: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Benchmark error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateQualityScores(response: string, prompt: string) {
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = response.length / Math.max(sentences.length, 1);
  
  const clarityScore = Math.min(100, Math.round(
    (sentences.length >= 3 ? 15 : sentences.length * 5) +
    (response.split('\n\n').length * 5) +
    (avgSentenceLength > 15 && avgSentenceLength < 35 ? 15 : 5) +
    (response.includes(':') || response.includes('-') ? 10 : 0) +
    (response.length > 150 ? 20 : response.length / 10) + 35
  ));

  const words = response.toLowerCase().match(/\b\w+\b/g) || [];
  const uniqueWordRatio = new Set(words).size / Math.max(words.length, 1);
  const originalityScore = Math.min(100, Math.round(
    (uniqueWordRatio * 40) +
    (/for example|such as|e\.g\./i.test(response) ? 15 : 0) +
    (response.length > 250 ? 15 : response.length / 20) + 30
  ));

  const depthScore = Math.min(100, Math.round(
    (response.length / 8) +
    (/^\d+\.|^[-*•]/m.test(response) ? 20 : 0) +
    (/however|alternatively|on the other hand/i.test(response) ? 15 : 0) +
    (/because|therefore|consequently/i.test(response) ? 10 : 0) + 15
  ));

  const promptWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const responseWords = response.toLowerCase().split(/\s+/);
  const relevanceScore = Math.min(100, Math.round(
    (promptWords.filter(w => responseWords.includes(w)).length / Math.max(promptWords.length, 1) * 50) +
    (response.length > 100 ? 25 : response.length / 5) + 25
  ));

  const overallScore = Math.round(clarityScore * 0.25 + originalityScore * 0.25 + depthScore * 0.3 + relevanceScore * 0.2);

  return { clarityScore, originalityScore, depthScore, relevanceScore, overallScore };
}
