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
    const { naturalLanguageInput } = await req.json();

    if (!naturalLanguageInput) {
      return new Response(
        JSON.stringify({ error: 'Natural language input is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    console.log('Generating intelligent workflow with Claude...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: `As an expert workflow architect and AI system designer, create an intelligent multi-agent workflow based on this user's goal:

**User Goal:**
"${naturalLanguageInput}"

**Workflow Design Principles:**

1. **Task Decomposition**
   - Break down the goal into logical, sequential steps
   - Identify dependencies between steps
   - Determine optimal parallelization opportunities
   - Consider edge cases and failure modes

2. **Agent Specialization**
   - Design specialized agents for each major task
   - Define clear roles and responsibilities
   - Specify required expertise and capabilities
   - Optimize for efficiency and quality

3. **Intelligent Orchestration**
   - Define data flow between agents
   - Specify handoff points and validation
   - Include quality checks and refinement loops
   - Add error handling and recovery

4. **Output Optimization**
   - Define success criteria for each step
   - Specify output format and quality standards
   - Include feedback and iteration mechanisms
   - Add final validation and polish steps

Generate a comprehensive workflow in JSON format:
{
  "workflowName": "Descriptive name",
  "workflowDescription": "Clear description of what this workflow accomplishes",
  "estimatedTime": "Expected completion time",
  "difficulty": "beginner/intermediate/advanced",
  "agents": [
    {
      "id": "unique_id",
      "name": "Agent name (e.g., Research Analyst, Content Writer)",
      "role": "Specific role description",
      "prompt": "Detailed, intelligent prompt for this agent with clear instructions, context, constraints, and quality requirements",
      "systemPrompt": "System-level instructions that define the agent's expertise, behavior, and output standards",
      "model": "claude-sonnet-4-5",
      "temperature": 0.7,
      "dependsOn": ["previous_agent_id"] or [],
      "inputs": ["What data this agent needs"],
      "outputs": ["What this agent produces"],
      "successCriteria": ["How to validate this agent's work"],
      "retryStrategy": "How to handle failures"
    }
  ],
  "dataFlow": {
    "description": "How data flows through the workflow",
    "transformations": ["Key data transformations at each step"]
  },
  "qualityChecks": [
    {
      "step": "agent_id",
      "checks": ["Quality validation steps"],
      "threshold": "Minimum quality score"
    }
  ],
  "expectedOutcomes": {
    "primary": "Main deliverable",
    "secondary": ["Additional outputs"],
    "quality": "Expected quality level"
  },
  "optimizationTips": ["How user can improve results"]
}

Make this workflow intelligent, practical, and production-ready. Each agent should have clear, detailed prompts that will produce high-quality results. Consider real-world constraints and user experience.`
          }
        ]
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const workflowText = data.content[0].text;
    
    // Extract JSON from response
    const jsonMatch = workflowText.match(/\{[\s\S]*\}/);
    const workflow = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    
    if (!workflow) {
      throw new Error('Failed to parse workflow from AI response');
    }

    console.log('Intelligent workflow generated successfully');

    return new Response(
      JSON.stringify({ workflow }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in intelligent-workflow:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
