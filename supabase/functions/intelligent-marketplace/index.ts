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
    const { action, data } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Intelligent marketplace action: ${action}`);
    
    let prompt = '';
    
    if (action === 'enhance_listing') {
      prompt = `Enhance this marketplace listing. Title: ${data.title}, Description: ${data.description}, Prompt: ${data.prompt}, Category: ${data.category}. Return JSON: {"title": "...", "description": "...", "prompt": "...", "tags": [...], "suggestedPrice": number, "uniqueSellingPoints": [...]}`;
    } else if (action === 'personalized_recommendations') {
      prompt = `Recommend items for this user profile: ${JSON.stringify(data)}. Return JSON: {"recommendations": [{"listingId": "...", "relevanceScore": number, "reasoning": "...", "benefits": [...]}]}`;
    } else if (action === 'quality_score') {
      prompt = `Evaluate this listing quality: ${JSON.stringify(data)}. Return JSON: {"overallScore": number, "scores": {"clarity": number, "usefulness": number, "value": number, "uniqueness": number, "presentation": number}, "strengths": [...], "improvements": [...]}`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 4096,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const responseData = await response.json();
    const resultText = responseData.choices?.[0]?.message?.content || '';
    
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { text: resultText };
    
    console.log('Intelligent marketplace action completed');

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in intelligent-marketplace:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
