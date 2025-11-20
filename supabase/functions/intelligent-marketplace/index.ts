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
    const { action, data } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    console.log(`Intelligent marketplace action: ${action}`);
    
    let prompt = '';
    
    if (action === 'enhance_listing') {
      prompt = `As an expert copywriter and marketplace specialist, enhance this prompt listing to maximize its appeal and value.

**Original Listing:**
Title: ${data.title}
Description: ${data.description}
Prompt: ${data.prompt}
Category: ${data.category}

**Enhancement Goals:**
1. Make the title more compelling and SEO-friendly
2. Write a persuasive description that highlights unique value
3. Optimize the prompt for clarity and effectiveness
4. Add strategic tags for discoverability
5. Suggest optimal pricing based on value

Provide enhanced version in JSON format:
{
  "title": "Improved title",
  "description": "Enhanced description with benefits and use cases",
  "prompt": "Optimized prompt with better structure",
  "tags": ["relevant", "searchable", "tags"],
  "suggestedPrice": number,
  "pricingRationale": "Why this price",
  "uniqueSellingPoints": ["Key benefit 1", "Key benefit 2"],
  "targetAudience": "Who will buy this",
  "useCases": ["Use case 1", "Use case 2"]
}`;
    } else if (action === 'personalized_recommendations') {
      prompt = `As an expert product recommender, analyze this user's profile and suggest the most relevant marketplace items.

**User Profile:**
${JSON.stringify(data, null, 2)}

Recommend items based on:
1. User's past purchases and interests
2. Current trends and popularity
3. Complementary products
4. Skill level and experience
5. Budget and pricing sensitivity

Provide recommendations in JSON format:
{
  "recommendations": [
    {
      "listingId": "id",
      "relevanceScore": number,
      "reasoning": "Why this is recommended",
      "benefits": ["Benefit 1", "Benefit 2"],
      "alternativesIfNeeded": ["Other option 1"]
    }
  ]
}`;
    } else if (action === 'quality_score') {
      prompt = `As an expert prompt engineer and quality assessor, evaluate this marketplace listing for quality and effectiveness.

**Listing to Evaluate:**
${JSON.stringify(data, null, 2)}

Assess on these criteria:
1. Prompt clarity and specificity (0-100)
2. Practical usefulness (0-100)
3. Value for money (0-100)
4. Uniqueness and innovation (0-100)
5. Professional presentation (0-100)

Provide evaluation in JSON format:
{
  "overallScore": number,
  "scores": {
    "clarity": number,
    "usefulness": number,
    "value": number,
    "uniqueness": number,
    "presentation": number
  },
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement 1", "Improvement 2"],
  "competitivePosition": "How it compares to similar items",
  "recommendation": "Should this be featured/trending/etc"
}`;
    }

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
            content: prompt
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

    const responseData = await response.json();
    const resultText = responseData.content[0].text;
    
    // Extract JSON from response
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { text: resultText };
    
    console.log('Intelligent marketplace action completed');

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in intelligent-marketplace:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
