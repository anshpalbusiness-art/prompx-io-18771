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
    console.log('Processing prompt optimization request...');
    const { text, platform, modelName, provider, category } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!platform || typeof platform !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Platform is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const modelInfo = modelName && provider ? `${modelName} (${provider})` : platform;

    const systemPrompt = `You are an ELITE prompt optimization AI. Transform vague or basic requests into EXCELLENT, production-ready prompts optimized for ${modelInfo}.

CRITICAL QUALITY STANDARDS:
1. Always maintain the user's CORE INTENT
2. Add necessary context and constraints for clarity
3. Specify expected output format when relevant
4. Include examples or clarifications when helpful
5. Optimize for ${modelInfo}'s specific capabilities

Generate 3 distinct, HIGH-QUALITY prompt variations.`;

    const userPrompt = `Optimize this prompt for ${modelInfo}: "${text}"

Category: ${category || 'text'}

Return ONLY a valid JSON array:
[
  {"title": "Quick & Direct", "prompt": "concise optimized prompt"},
  {"title": "Detailed & Professional", "prompt": "detailed optimized prompt"},
  {"title": "Creative & Enhanced", "prompt": "creative optimized prompt"}
]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Insufficient credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'AI prompt optimization failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('No content returned from AI');
    }

    let prompts;
    try {
      const cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
      prompts = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleanContent);
      
      if (!Array.isArray(prompts) || prompts.length === 0) {
        throw new Error('Invalid prompts array');
      }

      prompts = prompts.map((p: any, idx: number) => {
        if (typeof p === 'string') {
          const titles = ['Quick & Direct', 'Detailed & Professional', 'Creative & Enhanced'];
          return { title: titles[idx] || 'Optimized Prompt', prompt: p };
        }
        if (!p.title || !p.prompt) throw new Error('Missing title or prompt');
        if (typeof p.prompt !== 'string') p.prompt = JSON.stringify(p.prompt);
        return p;
      });

      while (prompts.length < 3) {
        const titles = ['Quick & Direct', 'Detailed & Professional', 'Creative & Enhanced'];
        prompts.push({
          title: titles[prompts.length],
          prompt: `${text}\n\nPlease provide a ${titles[prompts.length].toLowerCase()} response optimized for ${modelInfo}.`
        });
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      prompts = [
        { title: 'Quick & Direct', prompt: `${text}\n\nProvide a clear, concise response.` },
        { title: 'Detailed & Professional', prompt: `Request: "${text}"\n\nProvide a comprehensive, professional response.` },
        { title: 'Creative & Enhanced', prompt: `Core request: "${text}"\n\nProvide an innovative, engaging response.` }
      ];
    }

    console.log(`Generated ${prompts.length} optimized prompts for ${modelInfo}`);

    return new Response(
      JSON.stringify({ prompts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Optimize prompt error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
