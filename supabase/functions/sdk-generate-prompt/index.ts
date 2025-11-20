import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required. Include it in the x-api-key header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract key prefix from provided API key
    const keyPrefix = apiKey.substring(0, 12);
    
    // Find API key by prefix first
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, is_active, rate_limit_per_hour, requests_count, api_key_hash, expires_at')
      .eq('key_prefix', keyPrefix)
      .single();

    if (keyError || !keyData) {
      // Log failed authentication attempt
      console.error('API key not found:', keyError);
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the full API key using hash
    const { data: isValid, error: validateError } = await supabase
      .rpc('validate_api_key_hash', { 
        _api_key: apiKey, 
        _api_key_hash: keyData.api_key_hash 
      });

    if (validateError || !isValid) {
      // Log failed authentication attempt
      await supabase.from('api_key_audit_logs').insert({
        api_key_id: keyData.id,
        user_id: keyData.user_id,
        action: 'authentication_failed',
        success: false,
        error_message: 'Invalid API key hash',
        metadata: { attempted_prefix: keyPrefix }
      });
      
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if key has expired
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      await supabase.from('api_key_audit_logs').insert({
        api_key_id: keyData.id,
        user_id: keyData.user_id,
        action: 'authentication_failed',
        success: false,
        error_message: 'API key has expired',
      });
      
      return new Response(
        JSON.stringify({ error: 'API key has expired' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!keyData.is_active) {
      await supabase.from('api_key_audit_logs').insert({
        api_key_id: keyData.id,
        user_id: keyData.user_id,
        action: 'authentication_failed',
        success: false,
        error_message: 'API key is inactive',
      });
      
      return new Response(
        JSON.stringify({ error: 'API key is inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful authentication
    await supabase.from('api_key_audit_logs').insert({
      api_key_id: keyData.id,
      user_id: keyData.user_id,
      action: 'prompt_generation',
      success: true,
      metadata: { tool_type: 'text' }
    });

    // Update usage stats
    await supabase
      .from('api_keys')
      .update({ 
        requests_count: keyData.requests_count + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', keyData.id);

    // Parse request body
    const { 
      prompt, 
      toolType = 'text',
      model,
      temperature,
      maxTokens 
    } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call AI optimization
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const systemPrompt = `You are an expert prompt engineer. Given a user's prompt and the intended tool type (${toolType}), optimize and enhance it to get the best results. Make it clear, specific, and effective.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Optimize this prompt for ${toolType}: ${prompt}` }
    ];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'google/gemini-2.5-flash',
        messages,
        temperature: temperature || 0.7,
        max_tokens: maxTokens || 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      // Handle specific error cases
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again shortly.',
            code: 'RATE_LIMIT',
            retry_after: 60
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient credits. Please top up your Lovable AI workspace.',
            code: 'INSUFFICIENT_CREDITS'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to optimize prompt. Please try again.',
          status: aiResponse.status,
          details: errorText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const optimizedPrompt = aiData.choices[0].message.content;

    return new Response(
      JSON.stringify({
        success: true,
        original: prompt,
        optimized: optimizedPrompt,
        toolType,
        model: model || 'google/gemini-2.5-flash',
        usage: {
          requests_today: keyData.requests_count + 1,
          rate_limit: keyData.rate_limit_per_hour
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in sdk-generate-prompt:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
