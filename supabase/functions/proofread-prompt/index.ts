import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log(`${req.method} ${req.url}`);
  
  if (req.method === "OPTIONS") {
    console.log("CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing proofread request...");
    const { text } = await req.json();
    console.log("Input text:", text);

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
    if (!GROK_API_KEY) {
      throw new Error("GROK_API_KEY is not configured");
    }

    const prompt = `You are an expert proofreading AI. Your job is to correct spelling mistakes, grammar errors, and improve sentence structure while preserving the original meaning and intent. Return ONLY the corrected text without any explanations or additional commentary. Fix:
- Spelling errors (typos, misspellings, homophones)
- Grammar issues (subject-verb agreement, tense, punctuation, articles)
- Sentence structure (run-ons, fragments, clarity)
- Capitalization and formatting
- Professional tone improvements (remove slang, fix contractions if inappropriate)

Important: If the text is already correct, return it unchanged. Always maintain the original language and meaning.

Text to proofread: ${text}`;

    // Call Grok API
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-2-1212",
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid or missing GROK_API_KEY. Please check your Grok API key in Secrets." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Grok API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI proofreading failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const correctedText = data.choices?.[0]?.message?.content?.trim() || text;

    console.log(`Proofread: "${text}" → "${correctedText}"`);

    return new Response(
      JSON.stringify({ 
        corrected: correctedText,
        changed: correctedText !== text
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Proofread error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
