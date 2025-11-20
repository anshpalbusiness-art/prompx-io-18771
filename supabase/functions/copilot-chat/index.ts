import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
    
    if (!GROK_API_KEY) {
      throw new Error("GROK_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert prompt engineering co-pilot. Your role is to help users craft the perfect prompt through interactive conversation.

Guidelines:
- Ask 2-3 clarifying questions at a time (never overwhelm with too many)
- Be conversational and friendly
- Focus on: target audience, desired tone, output format, key requirements, constraints
- After gathering enough information, synthesize it into a well-structured prompt
- When ready to generate the final prompt, start your response with "FINAL_PROMPT:" followed by the complete prompt

Context about the user's request: ${context || "General prompt creation"}`;

    // Build messages with system prompt for Grok
    const grokMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter((msg: any) => msg.role !== 'system')
    ];

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-2-1212",
        messages: grokMessages,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid Grok API key." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Grok API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return Grok streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Copilot chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
