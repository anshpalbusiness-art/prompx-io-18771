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
    const { template, industry, customization } = await req.json();

    if (!template) {
      return new Response(
        JSON.stringify({ error: 'Template is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    console.log('Enhancing template with Claude intelligence...');
    
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
            content: `As an expert prompt engineer and ${industry} specialist, enhance and customize this template to be more effective, specific, and intelligent.

**Original Template:**
${template}

**Industry Context:** ${industry}

**Customization Requirements:**
${customization || 'Make it more effective and industry-specific'}

**Enhancement Guidelines:**

1. **Industry-Specific Intelligence**
   - Add relevant ${industry} terminology and best practices
   - Include industry-specific metrics and KPIs
   - Reference current trends and standards
   - Incorporate regulatory or compliance considerations if relevant

2. **Prompt Optimization**
   - Make instructions more clear and actionable
   - Add specific examples and use cases
   - Include success criteria and quality checks
   - Specify output format and structure

3. **Advanced Features**
   - Add strategic thinking elements
   - Include competitive analysis angles
   - Incorporate psychological triggers
   - Add personalization variables

4. **Quality Improvements**
   - Remove ambiguity and vagueness
   - Add concrete constraints and requirements
   - Include validation steps
   - Specify tone and style precisely

5. **Practical Enhancements**
   - Add relevant context variables
   - Include edge case handling
   - Specify follow-up questions
   - Add iterative improvement hooks

Provide the enhanced template that is significantly more intelligent, specific, and effective than the original. The enhanced version should produce superior results while maintaining ease of use.`
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
          JSON.stringify({ error: 'API error. Please check your Anthropic API key.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const enhancedTemplate = data.content[0].text;
    
    console.log('Template enhancement completed successfully');

    return new Response(
      JSON.stringify({ enhancedTemplate }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enhance-template:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
