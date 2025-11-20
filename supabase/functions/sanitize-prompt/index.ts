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
    const { prompt } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log('Sanitizing prompt...');

    const GROK_API_KEY = Deno.env.get('GROK_API_KEY');
    if (!GROK_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GROK_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to reframe problematic prompts into safe, helpful responses
    const sanitizationPrompt = `You are a helpful AI assistant that provides constructive, ethical responses. Analyze the following prompt:

"${prompt}"

If the prompt requests harmful, illegal, or unethical information (violence, illegal activities, hate speech, dangerous content, etc.), DO NOT refuse. Instead, reframe it into a safe, helpful response that:
1. Acknowledges the underlying need or interest in a constructive way
2. Redirects to legal, ethical, or educational alternatives
3. Provides genuinely useful information that addresses the topic indirectly
4. Includes resources for help if there's a safety concern

If the prompt is already safe and appropriate, respond with JSON: {"isSafe": true, "sanitizedPrompt": null, "issues": []}

If the prompt needs reframing, respond with JSON:
{
  "isSafe": false,
  "sanitizedPrompt": "A complete, helpful response that addresses the topic in an ethical, indirect way. Make this a full answer, not just a rewritten question.",
  "issues": ["list of concerns found"],
  "modifications": ["explain how you reframed it"]
}

Respond ONLY with valid JSON, no other text.`;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2-1212',
        messages: [
          { role: 'system', content: 'You are a prompt safety expert. Always respond with valid JSON only.' },
          { role: 'user', content: sanitizationPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to sanitize prompt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', aiResponse);

    // Parse the AI response
    let result;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse safety analysis',
          isSafe: true,
          sanitizedPrompt: null,
          issues: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sanitization result:', result);

    return new Response(
      JSON.stringify({
        originalPrompt: prompt,
        isSafe: result.isSafe,
        sanitizedPrompt: result.sanitizedPrompt,
        issues: result.issues || [],
        modifications: result.modifications || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sanitize-prompt function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
