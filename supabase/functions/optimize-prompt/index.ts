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
    console.log("Processing prompt optimization request...");
    const { text, platform, modelName, provider, category } = await req.json();
    console.log("Input:", { text, platform, modelName, provider, category });

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!platform || typeof platform !== 'string') {
      return new Response(
        JSON.stringify({ error: "Platform is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
    if (!GROK_API_KEY) {
      throw new Error("GROK_API_KEY is not configured");
    }

    // Model-specific optimization strategies
    const modelStrategies: Record<string, string> = {
      "gpt-4": `Expert at GPT-4 optimization. Focus on:
- Complex reasoning and problem-solving
- Creative content generation
- Handling nuanced instructions
- Adapting to different writing styles`,

      "bard": `Expert at Bard optimization. Focus on:
- Conversational and engaging prompts
- Creative writing and storytelling
- Information retrieval and summarization
- Multi-turn dialogue`,

      "claude-v2": `Expert at Claude v2 optimization. Focus on:
- Detailed and structured responses
- Analytical and research-oriented tasks
- Ethical considerations and safety
- Long-form content generation`,

      "palm-2": `Expert at PaLM 2 optimization. Focus on:
- Multilingual capabilities
- Code generation and understanding
- Mathematical reasoning
- Scientific and technical content`,
      "gpt-5": `Expert at GPT-5 optimization. Focus on:
- Structured reasoning with chain-of-thought
- Explicit role definitions and task framing
- Step-by-step instructions for complex tasks
- Output format specifications (JSON, markdown, etc.)
- Examples and few-shot learning when beneficial`,

      "gpt-4.1": `Expert at GPT-4.1 optimization. Focus on:
- Advanced analytical and reasoning prompts
- Multi-step problem solving
- Code generation with best practices
- Technical documentation creation`,

      "gpt-4o": `Expert at GPT-4o (multimodal) optimization. Focus on:
- Combined text, image, and code tasks
- Visual reasoning prompts
- Comprehensive contextual understanding
- Real-time information integration`,

      "claude-opus-4": `Expert at Claude Opus 4 optimization. Focus on:
- Deep analytical reasoning and research
- XML tags for structured data (<thinking>, <answer>)
- Extended context for comprehensive analysis
- Nuanced ethical and philosophical discussions
- Step-by-step reasoning for complex problems`,

      "claude-sonnet-4": `Expert at Claude Sonnet 4 optimization. Focus on:
- Balanced speed and intelligence
- Clear, structured responses
- Multi-turn conversations
- Technical writing and code review`,

      "claude-haiku-3.5": `Expert at Claude Haiku optimization. Focus on:
- Concise, fast responses
- Quick summaries and classifications
- Real-time assistance
- Straightforward Q&A`,

      "gemini-2.5-pro": `Expert at Gemini 2.5 Pro optimization. Focus on:
- Multimodal reasoning (text, images, code)
- Large context window utilization
- Google knowledge integration
- Complex reasoning tasks
- Research and analysis`,

      "gemini-2.5-flash": `Expert at Gemini 2.5 Flash optimization. Focus on:
- Fast, efficient responses
- Balanced multimodal capabilities
- Cost-effective prompting
- Quick iterations and prototyping`,

      "gemini-ultra": `Expert at Gemini Ultra optimization. Focus on:
- Highest capability tasks
- Complex multimodal reasoning
- Advanced code generation
- Research-level analysis`,

      "llama-3.3": `Expert at LLaMA 3.3 optimization. Focus on:
- Open-source flexibility
- Conversational AI
- Task-specific fine-tuning considerations
- System prompts for role definition`,

      "llama-3.1-405b": `Expert at LLaMA 3.1 405B optimization. Focus on:
- Maximum open-source capability
- Complex reasoning tasks
- Long-form content generation
- Technical and scientific tasks`,

      "mistral-large-2": `Expert at Mistral Large 2 optimization. Focus on:
- European AI excellence
- Multilingual capabilities
- Function calling and tool use
- Structured output generation`,

      "mistral-medium": `Expert at Mistral Medium optimization. Focus on:
- Efficient European AI
- Balanced performance
- Cost-effective solutions
- Quick responses`,

      "grok-2": `Expert at Grok 2 optimization. Focus on:
- Real-time information and current events
- Conversational and engaging tone
- Up-to-date knowledge integration
- Fact-checking and verification`,

      "midjourney-v6": `Expert at MidJourney v6 optimization. Generate prompts with:
- Detailed subject descriptions
- Artistic style and medium (oil painting, photography, etc.)
- Lighting (golden hour, studio lighting, dramatic shadows)
- Camera details (35mm, wide-angle, bokeh, depth of field)
- Composition (rule of thirds, symmetry, perspective)
- Color palette and mood
- Technical parameters: --ar 16:9 --v 6 --stylize 100`,

      "dalle-3": `Expert at DALL-E 3 optimization. Generate prompts with:
- Clear subject and action descriptions
- Specific art style (photorealistic, cartoon, watercolor)
- Setting and environment details
- Lighting and atmosphere
- Color scheme
- Emotional tone
- Keep under 400 characters for optimal results`,

      "stable-diffusion-xl": `Expert at Stable Diffusion XL optimization. Generate prompts with:
- Weighted keywords: (keyword:1.5) for emphasis
- Quality tags: 8k, highly detailed, masterpiece, best quality
- Negative prompts: ugly, blurry, low quality, distorted
- Specific style references
- Technical specifications
- Artist or movement references`,

      "flux-pro": `Expert at Flux Pro optimization. Generate prompts with:
- High-quality visual descriptions
- Professional photography terms
- Detailed composition
- Lighting and color grading
- Mood and atmosphere
- Technical camera details`,

      "github-copilot": `Expert at GitHub Copilot optimization. Generate code comments that:
- Clearly describe function purpose
- Specify parameter types and return values
- Include usage examples
- Mention edge cases and error handling
- Reference patterns and best practices
- Use clear, natural language`,

      "cursor-ai": `Expert at Cursor AI optimization. Generate prompts that:
- Provide specific, actionable instructions
- Reference existing code structure
- Specify coding standards and patterns
- Include file and project context
- Request tests and documentation
- Define success criteria`,

      "codestral": `Expert at Codestral optimization. Generate prompts for:
- Code generation with best practices
- Code explanation and documentation
- Refactoring suggestions
- Bug fixing and optimization
- Test generation`,

      "elevenlabs": `Expert at ElevenLabs optimization. Generate scripts with:
- Natural, conversational language
- Proper punctuation for pacing
- Emotional context markers
- Voice characteristic notes (warm, professional, energetic)
- Pauses and emphasis cues
- Clear delivery structure`,

      "sora": `Expert at Sora optimization. Generate prompts with:
- Cinematic descriptions
- Camera movements (pan, zoom, tracking shot)
- Time of day and lighting
- Character descriptions and actions
- Environment and setting details
- Mood and atmosphere
- Style references (cinematic, documentary, etc.)`,

      "runway-gen3": `Expert at Runway Gen-3 optimization. Generate prompts with:
- Video transformation descriptions
- Style and aesthetic details
- Motion and transition specifications
- Atmosphere and mood
- Technical effects references
- Duration and pacing notes`
    };

    const strategy = modelStrategies[platform] || modelStrategies["gpt-5"];
    const modelInfo = modelName && provider ? `${modelName} (${provider})` : platform;

    const systemPrompt = `${strategy}

You are an ELITE prompt optimization AI with expertise in:
- Prompt engineering best practices for ${modelInfo}
- Understanding user intent and context deeply
- Creating clear, actionable, and specific instructions
- Balancing brevity with necessary detail
- Ensuring prompts are relevant and focused

Your mission: Transform vague or basic requests into EXCELLENT, production-ready prompts that will give users EXACTLY what they want on the FIRST try.

CRITICAL QUALITY STANDARDS:
1. Always maintain the user's CORE INTENT - never drift off-topic
2. Add necessary context and constraints for clarity
3. Specify expected output format when relevant
4. Include examples or clarifications when helpful
5. Remove ambiguity while staying concise
6. Optimize for ${modelInfo}'s specific capabilities

Generate 3 distinct, HIGH-QUALITY prompt variations.`;

    const userPrompt = `User's original request: "${text}"

ANALYSIS REQUIRED:
1. What is the user's CORE INTENT? (Extract the exact goal)
2. What context or constraints are missing?
3. What would make this request crystal clear?
4. What output format would be most useful?

GENERATE 3 OPTIMIZED VARIATIONS for ${modelInfo}:

**Variation 1: "Quick & Direct"**
- Concise and efficient
- Strips unnecessary words
- Clear action and expected output
- Optimized for fast results

**Variation 2: "Detailed & Professional"**
- Comprehensive and thorough
- Includes context and constraints
- Specifies quality expectations
- Leverages ${modelInfo}'s advanced capabilities

**Variation 3: "Creative & Enhanced"**
- Adds creative angle or unique approach
- Includes helpful examples or analogies
- Showcases ${modelInfo}'s creative strengths
- Maintains professionalism

Model characteristics to optimize for:
- Provider: ${provider || 'Unknown'}
- Category: ${category || 'text'}
- Model: ${modelName || platform}
- Platform: ${platform}

CRITICAL: Each prompt MUST be:
✓ Crystal clear and unambiguous
✓ Directly related to the user's intent
✓ Actionable and specific
✓ Properly structured
✓ Ready to use immediately

Return ONLY a valid JSON array (no markdown, no code blocks):
[
  {"title": "Quick & Direct", "prompt": "your concise optimized prompt here"},
  {"title": "Detailed & Professional", "prompt": "your detailed optimized prompt here"},
  {"title": "Creative & Enhanced", "prompt": "your creative optimized prompt here"}
]`;

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4096,
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
        JSON.stringify({ error: "AI prompt optimization failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error("No content returned from AI");
    }

    console.log("AI response:", content);

    // Extract JSON from response with enhanced parsing
    let prompts;
    try {
      let cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        prompts = JSON.parse(jsonMatch[0]);
      } else {
        prompts = JSON.parse(cleanContent);
      }
      
      if (!Array.isArray(prompts) || prompts.length === 0) {
        throw new Error("Invalid prompts array structure");
      }
      
      prompts = prompts.map((p, idx) => {
        if (typeof p === 'string') {
          const titles = ["Quick & Direct", "Detailed & Professional", "Creative & Enhanced"];
          return { title: titles[idx] || "Optimized Prompt", prompt: p };
        }
        
        if (!p.title || !p.prompt) {
          throw new Error("Prompt missing title or prompt field");
        }
        
        if (typeof p.prompt !== 'string') {
          p.prompt = JSON.stringify(p.prompt);
        }
        
        const prompt = p.prompt.trim();
        const originalWords = text.toLowerCase().split(/\s+/);
        const promptWords = prompt.toLowerCase().split(/\s+/);
        
        const hasRelevantContent = originalWords.some(word => 
          word.length > 3 && promptWords.includes(word)
        );
        
        if (prompt.length < 50 && !hasRelevantContent) {
          console.warn('Generated prompt seems too generic, enhancing...', p);
          p.prompt = `Based on: "${text}"\n\nPlease ensure your response directly addresses the above request with specific, actionable information optimized for ${modelInfo}.`;
        }
        
        return p;
      });
      
      while (prompts.length < 3) {
        const titles = ["Quick & Direct", "Detailed & Professional", "Creative & Enhanced"];
        prompts.push({
          title: titles[prompts.length],
          prompt: `${text}\n\nPlease provide a ${titles[prompts.length].toLowerCase()} response optimized for ${modelInfo}.`
        });
      }
      
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw content:", content);
      
      prompts = [
        { 
          title: "Quick & Direct", 
          prompt: `${text}\n\nProvide a clear, concise response with specific actionable information. Format: Direct answer with key points.`
        },
        { 
          title: "Detailed & Professional", 
          prompt: `Request: "${text}"\n\nProvide a comprehensive, professional response including:\n1. Detailed explanation\n2. Relevant context and background\n3. Specific examples\n4. Practical applications\n\nEnsure accuracy and depth in your response.`
        },
        { 
          title: "Creative & Enhanced", 
          prompt: `Core request: "${text}"\n\nProvide an innovative, engaging response that:\n- Offers unique perspectives or approaches\n- Includes creative examples or analogies\n- Demonstrates advanced capabilities\n- Maintains professional quality\n\nMake your response memorable and insightful.`
        }
      ];
    }

    console.log(`Generated ${prompts.length} optimized prompts for ${modelInfo}`);

    return new Response(
      JSON.stringify({ prompts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Optimize prompt error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
