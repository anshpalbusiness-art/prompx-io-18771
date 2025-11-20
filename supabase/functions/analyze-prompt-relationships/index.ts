import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { promptText, promptId, userId, category, platform } = await req.json();

    if (!promptText || !userId) {
      return new Response(
        JSON.stringify({ error: 'Prompt text and user ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch existing prompts from the user's knowledge graph
    const { data: existingNodes, error: nodesError } = await supabase
      .from('prompt_nodes')
      .select('id, prompt_text, category, platform, keywords')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError);
    }

    // Use AI to analyze relationships and extract insights
    const analysisPrompt = `You are an expert knowledge graph analyst specializing in prompt engineering and content strategy.

**NEW PROMPT:**
"${promptText}"
Category: ${category || 'unspecified'}
Platform: ${platform || 'general'}

**EXISTING PROMPTS IN NETWORK (${existingNodes?.length || 0} prompts):**
${existingNodes?.slice(0, 20).map((n, i) => `${i + 1}. "${n.prompt_text.substring(0, 150)}..." [${n.category}/${n.platform}]`).join('\n') || 'No existing prompts'}

**YOUR TASK:**
Analyze semantic relationships between the new prompt and existing prompts. Identify:

1. **Direct Relationships**: Which existing prompts are:
   - derived_from: The new prompt builds upon or extends these
   - similar_to: Share core concepts or goals
   - inspired_by: Influenced by these prompts
   - prerequisite_for: Would logically lead to the new prompt
   - alternative_to: Different approaches to same goal

2. **Topics & Keywords**: Extract 5-10 key concepts, themes, or topics

3. **Network Insights**: Identify patterns, clusters, or opportunities

Return ONLY valid JSON:
{
  "keywords": ["keyword1", "keyword2", ...],
  "topics": [
    {"name": "Topic Name", "description": "Brief description", "relevance": 0.9}
  ],
  "relationships": [
    {
      "targetPromptIndex": 0,
      "type": "similar_to",
      "strength": 0.85,
      "reasoning": "Why these prompts are related"
    }
  ],
  "insights": [
    {
      "type": "cluster",
      "title": "Insight title",
      "description": "What this means",
      "confidence": 0.8,
      "suggestion": "Actionable recommendation"
    }
  ]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert knowledge graph analyst. Return ONLY valid JSON, no markdown or explanations.' 
          },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
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
        JSON.stringify({ error: 'Failed to analyze relationships' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';

    // Parse AI response
    let analysis;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = {
          keywords: ['general', 'prompt', category || 'content'],
          topics: [],
          relationships: [],
          insights: []
        };
      }
    } catch (e) {
      console.error('JSON parse error:', e);
      analysis = {
        keywords: ['general', 'prompt', category || 'content'],
        topics: [],
        relationships: [],
        insights: []
      };
    }

    // Store prompt node if promptId provided
    let nodeId = promptId;
    if (!promptId) {
      const { data: newNode, error: insertError } = await supabase
        .from('prompt_nodes')
        .insert({
          user_id: userId,
          prompt_text: promptText,
          prompt_type: 'original',
          category,
          platform,
          keywords: analysis.keywords || [],
          metadata: { analyzed: true }
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting node:', insertError);
      } else {
        nodeId = newNode.id;
      }
    }

    // Create relationships
    const relationships = [];
    if (nodeId && analysis.relationships && existingNodes) {
      for (const rel of analysis.relationships) {
        if (rel.targetPromptIndex < existingNodes.length) {
          const targetNode = existingNodes[rel.targetPromptIndex];
          
          const { error: relError } = await supabase
            .from('prompt_relationships')
            .insert({
              source_prompt_id: nodeId,
              target_prompt_id: targetNode.id,
              relationship_type: rel.type,
              strength: rel.strength,
              ai_confidence: rel.strength,
              metadata: { reasoning: rel.reasoning }
            });

          if (!relError) {
            relationships.push({
              targetId: targetNode.id,
              type: rel.type,
              strength: rel.strength
            });
          }
        }
      }
    }

    // Store or update topics
    const topicIds = [];
    if (analysis.topics) {
      for (const topic of analysis.topics) {
        const { data: existingTopic } = await supabase
          .from('prompt_topics')
          .select('id')
          .eq('user_id', userId)
          .eq('topic_name', topic.name)
          .single();

        let topicId;
        if (existingTopic) {
          topicId = existingTopic.id;
        } else {
          const { data: newTopic, error: topicError } = await supabase
            .from('prompt_topics')
            .insert({
              user_id: userId,
              topic_name: topic.name,
              description: topic.description
            })
            .select()
            .single();

          if (!topicError && newTopic) {
            topicId = newTopic.id;
          }
        }

        if (topicId && nodeId) {
          await supabase.from('prompt_topic_links').insert({
            prompt_id: nodeId,
            topic_id: topicId,
            relevance_score: topic.relevance || 1.0
          });
          topicIds.push(topicId);
        }
      }
    }

    // Store network insights
    if (analysis.insights) {
      for (const insight of analysis.insights) {
        await supabase.from('prompt_network_insights').insert({
          user_id: userId,
          insight_type: insight.type,
          title: insight.title,
          description: insight.description,
          confidence_score: insight.confidence,
          actionable_suggestion: insight.suggestion,
          affected_prompts: nodeId ? [nodeId] : [],
          affected_topics: topicIds
        });
      }
    }

    console.log(`Analysis complete: ${relationships.length} relationships, ${topicIds.length} topics`);

    return new Response(
      JSON.stringify({
        success: true,
        nodeId,
        keywords: analysis.keywords,
        topics: analysis.topics,
        relationships,
        insights: analysis.insights,
        networkSize: existingNodes?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-prompt-relationships:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
