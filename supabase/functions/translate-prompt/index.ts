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
    const { prompt, targetLanguage, culturalContext } = await req.json();

    if (!prompt || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: prompt and targetLanguage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_AI_KEY = Deno.env.get('GOOGLE_AI_STUDIO_API_KEY');
    if (!GOOGLE_AI_KEY) {
      throw new Error('GOOGLE_AI_STUDIO_API_KEY is not configured');
    }

    const languageNames: Record<string, string> = {
      'hi': 'Hindi',
      'es': 'Spanish',
      'zh': 'Mandarin Chinese',
      'ar': 'Arabic',
      'fr': 'French',
      'de': 'German',
      'ja': 'Japanese',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ko': 'Korean'
    };

    const languageName = languageNames[targetLanguage] || targetLanguage;

    const systemPrompt = `You are an expert translator and cultural adaptation specialist for AI prompts. 
Your task is to translate the given prompt into ${languageName} while also adapting it for cultural context.

Important guidelines:
1. Translate the prompt accurately while maintaining its technical intent
2. Adapt idioms, metaphors, and cultural references to be meaningful in the target culture
3. Consider local customs, values, and communication styles
4. Ensure the translated prompt will produce culturally appropriate and relevant AI responses
5. Maintain the technical precision and clarity of the original prompt
6. If the prompt contains specific technical terms, keep them or provide appropriate equivalents

Return ONLY the translated and culturally adapted prompt without any explanations or additional text.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GOOGLE_AI_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nTranslate and culturally adapt this prompt:\n\n${prompt}${culturalContext ? `\n\nAdditional cultural context: ${culturalContext}` : ''}`
          }]
        }],
        generationConfig: {
          temperature: 0.7
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Insufficient credits. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway request failed: ${response.status}`);
    }

    const data = await response.json();
    const translatedPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log(`Successfully translated prompt to ${languageName}`);

    return new Response(
      JSON.stringify({ translatedPrompt, language: languageName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in translate-prompt function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
