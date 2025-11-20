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
    const { userInput, toolType, platform, context } = await req.json();

    if (!userInput) {
      return new Response(
        JSON.stringify({ error: 'User input is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    console.log('Generating intelligent prompts with Claude...');
    
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
        temperature: 0.8,
        messages: [
          {
            role: 'user',
            content: `As an expert prompt engineer, create 3 highly optimized prompts for different use cases.

**User Request:** "${userInput}"
**Tool Type:** ${toolType || 'general'}
**Platform:** ${platform || 'any AI model'}
**Additional Context:** ${context || 'none'}

**Analysis & Enhancement Guidelines:**

1. **Intent Analysis**
   - What is the user really trying to achieve?
   - What are the implicit requirements?
   - What context might be missing?
   - What edge cases should be considered?

2. **Prompt Engineering Best Practices**
   - Use clear, specific instructions
   - Include relevant constraints and requirements
   - Specify desired output format and structure
   - Add quality criteria and validation steps
   - Include examples where helpful
   - Use appropriate temperature/tone guidance

3. **Optimization Strategies**
   - Quick & Simple: Fast, direct, efficient (for rapid prototyping)
   - Detailed & Professional: Comprehensive, production-ready (for serious use)
   - Creative & Innovative: Exploratory, pushing boundaries (for ideation)

4. **Platform-Specific Adaptations**
   - Optimize for the target AI platform's strengths
   - Use platform-specific features and capabilities
   - Adjust complexity based on platform limitations
   - Include platform-specific formatting or syntax

5. **Quality Assurance**
   - Each prompt should be self-contained and complete
   - Include necessary context and background
   - Specify success criteria
   - Add error handling guidance

Generate 3 variations in JSON format:
[
  {
    "title": "Quick & Simple",
    "prompt": "Optimized prompt that is concise yet effective. Direct and to the point while ensuring quality output.",
    "useCase": "When to use this variant",
    "expectedOutput": "What you'll get",
    "estimatedTime": "How long it typically takes"
  },
  {
    "title": "Detailed & Professional",
    "prompt": "Comprehensive prompt with detailed instructions, context, constraints, quality criteria, and specific output requirements. Production-ready and robust.",
    "useCase": "When to use this variant",
    "expectedOutput": "What you'll get",
    "estimatedTime": "How long it typically takes"
  },
  {
    "title": "Creative & Innovative",
    "prompt": "Exploratory prompt that encourages creative thinking, novel approaches, and innovative solutions. Pushes beyond conventional boundaries.",
    "useCase": "When to use this variant",
    "expectedOutput": "What you'll get",
    "estimatedTime": "How long it typically takes"
  }
]

Make each prompt significantly better than what the user provided. Add strategic intelligence, clarity, and effectiveness.`
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
      if (response.status === 402 || response.status === 400) {
        return new Response(
          JSON.stringify({ error: 'API error. Please check your Anthropic API key in Secrets.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const promptsText = data.content[0].text;
    
    // Extract JSON from response
    const jsonMatch = promptsText.match(/\[[\s\S]*\]/);
    const prompts = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    
    console.log('Intelligent prompts generated successfully');

    return new Response(
      JSON.stringify({ prompts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in intelligent-prompt-generator:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
