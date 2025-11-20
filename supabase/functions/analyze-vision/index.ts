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
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GROK_API_KEY = Deno.env.get('GROK_API_KEY');
    if (!GROK_API_KEY) {
      throw new Error('GROK_API_KEY is not configured');
    }

    console.log('Analyzing image with Grok Vision...');
    
    // Extract base64 image data if it's a data URL
    let imageData = image;
    let mediaType = 'image/jpeg';
    
    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mediaType = matches[1];
        imageData = matches[2];
      }
    }
    
    // Use Grok's vision capabilities for image analysis
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2-vision-1212',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${imageData}`
                }
              },
              {
                type: 'text',
                text: `As an expert visual analyst and product strategist, perform a comprehensive analysis of this image:

**Analysis Framework:**

1. **Visual Content Identification**
   - Main subjects, objects, and elements
   - Composition and layout
   - Visual hierarchy and focal points
   - Color scheme and mood
   - Style and aesthetic qualities

2. **Context & Purpose Assessment**
   - Apparent use case or application
   - Target audience indicators
   - Business or creative intent
   - Brand identity elements

3. **Technical Analysis**
   - Design patterns observed
   - UI/UX elements if applicable
   - Quality and resolution indicators
   - Production value assessment

4. **Actionable Insights**
   - What could be built/created based on this
   - Key features to replicate or enhance
   - Design elements to preserve
   - Improvements or variations to consider

5. **Implementation Recommendations**
   - Specific technologies or tools needed
   - Design system requirements
   - Content and asset needs
   - Development priorities

Provide a detailed, actionable analysis that would help someone recreate or build upon this concept. Be specific with measurements, colors, layouts, and functional requirements where applicable.`
              }
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;
    
    console.log('Image analysis completed successfully');

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-vision:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
