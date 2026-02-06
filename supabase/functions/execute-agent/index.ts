import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { agentId, userInput, conversationHistory = [], conversationId, userId } = await req.json();
    console.log(`Agent Execution - Agent: ${agentId}`);

    if (!agentId || !userInput) {
      return new Response(
        JSON.stringify({ error: 'Agent ID and user input are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: agent, error: agentError } = await supabase
      .from('prompt_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      console.error('Agent not found:', agentError?.message);
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiMessages: Array<{ role: string; content: string }> = [];
    if (agent.system_prompt) {
      aiMessages.push({ role: 'system', content: agent.system_prompt });
    }
    if (conversationHistory && conversationHistory.length > 0) {
      aiMessages.push(...conversationHistory.filter((msg: any) => msg.role !== 'system'));
    }
    aiMessages.push({ role: 'user', content: userInput });

    const startTime = Date.now();

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        max_tokens: agent.max_tokens || 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (userId) {
        await supabase.from('agent_analytics').insert({
          agent_id: agentId,
          user_id: userId,
          conversation_id: conversationId,
          success: false,
          error_message: `HTTP ${response.status}: ${errorText}`,
          model_used: 'google/gemini-2.5-flash',
        });
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'No response generated';
    const responseTime = Date.now() - startTime;
    const tokensUsed = (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);
    
    console.log(`Response generated in ${responseTime}ms, ${tokensUsed} tokens`);

    await supabase
      .from('prompt_agents')
      .update({ usage_count: (agent.usage_count || 0) + 1 })
      .eq('id', agentId);

    if (userId) {
      await supabase.from('agent_analytics').insert({
        agent_id: agentId,
        user_id: userId,
        conversation_id: conversationId,
        response_time_ms: responseTime,
        tokens_used: tokensUsed,
        model_used: 'google/gemini-2.5-flash',
        success: true,
      });
    }

    if (conversationId && userId) {
      const updatedMessages = [
        ...conversationHistory,
        { role: 'user', content: userInput },
        { role: 'assistant', content: aiResponse }
      ];
      
      await supabase
        .from('agent_conversations')
        .upsert({
          id: conversationId,
          user_id: userId,
          agent_id: agentId,
          messages: updatedMessages,
          title: userInput.substring(0, 100),
        });
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        responseTime,
        tokensUsed,
        model: 'google/gemini-2.5-flash',
        conversationId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error executing agent:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
