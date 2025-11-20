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
    const { prompt } = await req.json();
    
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Use only Claude for superior benchmarking
    const models = [
      { name: 'Claude Sonnet 4.5', id: 'claude-sonnet-4-5', description: 'Superior reasoning & intelligence' },
    ];

    // Call all models in parallel
    const results = await Promise.all(
      models.map(async (model) => {
        const startTime = Date.now();
        
        try {
          // Use Claude API
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-5',
              max_tokens: 2000,
              messages: [{ role: 'user', content: prompt }],
            }),
          });

          const responseTime = Date.now() - startTime;

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error from ${model.name}:`, response.status, errorText);
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();
          const content = data.content?.[0]?.text || '';

          // Calculate quality scores
          const scores = calculateQualityScores(content, prompt);

          return {
            model: model.name,
            modelId: model.id,
            response: content,
            responseTime,
            ...scores,
            success: true,
          };
        } catch (error) {
          console.error(`Error with ${model.name}:`, error);
          return {
            model: model.name,
            modelId: model.id,
            response: '',
            responseTime: Date.now() - startTime,
            clarityScore: 0,
            originalityScore: 0,
            depthScore: 0,
            relevanceScore: 0,
            overallScore: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Benchmark error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function calculateQualityScores(response: string, prompt: string) {
  // Advanced Clarity Score: Readability, structure, and coherence
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = response.length / Math.max(sentences.length, 1);
  const clarityScore = Math.min(100, Math.round(
    (sentences.length >= 3 ? 15 : sentences.length * 5) + // Sentence variety
    (response.split('\n\n').length * 5) + // Paragraph organization
    (avgSentenceLength > 15 && avgSentenceLength < 35 ? 15 : 5) + // Optimal sentence length
    (hasProperCapitalization(response) ? 15 : 0) + // Grammar
    (response.includes(':') || response.includes('-') ? 10 : 0) + // Structured formatting
    (response.length > 150 ? 20 : response.length / 10) + // Adequate detail
    20 // Base score
  ));

  // Enhanced Originality Score: Creativity, uniqueness, and engagement
  const uniqueWordRatio = countUniqueWords(response) / response.split(/\s+/).length;
  const originalityScore = Math.min(100, Math.round(
    (uniqueWordRatio * 40) + // Vocabulary richness
    (hasExamples(response) ? 15 : 0) + // Practical examples
    (hasMetaphors(response) ? 15 : 0) + // Creative language
    (response.length > 250 ? 15 : response.length / 20) + // Comprehensive response
    (hasQuestions(response) ? 5 : 0) + // Engaging elements
    (hasNumbersOrStats(response) ? 5 : 0) + // Data-driven content
    25 // Base score
  ));

  // Advanced Depth Score: Thoroughness, analysis, and insight
  const explanationDensity = countExplanations(response) / Math.max(sentences.length, 1);
  const depthScore = Math.min(100, Math.round(
    (response.length / 8) + // Comprehensive length
    (explanationDensity * 100) + // Explanation density
    (hasStructuredContent(response) ? 20 : 0) + // Organized content
    (mentionsMultiplePerspectives(response) ? 15 : 0) + // Multi-faceted analysis
    (hasCausalReasoning(response) ? 10 : 0) + // Logical reasoning
    (hasComparisons(response) ? 10 : 0) + // Analytical depth
    15 // Base score
  ));

  // Prompt Relevance Score: How well the response addresses the prompt
  const promptWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const responseWords = response.toLowerCase().split(/\s+/);
  const relevanceScore = Math.min(100, Math.round(
    (promptWords.filter(w => responseWords.includes(w)).length / promptWords.length * 50) +
    (response.length > 100 ? 25 : response.length / 5) +
    25
  ));

  const overallScore = Math.round((clarityScore * 0.25 + originalityScore * 0.25 + depthScore * 0.3 + relevanceScore * 0.2));

  return {
    clarityScore,
    originalityScore,
    depthScore,
    relevanceScore,
    overallScore,
  };
}

function hasProperCapitalization(text: string): boolean {
  const sentences = text.split(/[.!?]+/);
  return sentences.filter(s => s.trim() && /^[A-Z]/.test(s.trim())).length > sentences.length * 0.7;
}

function countUniqueWords(text: string): number {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  return new Set(words).size;
}

function hasExamples(text: string): boolean {
  return /for example|such as|for instance|like|e\.g\./i.test(text);
}

function hasMetaphors(text: string): boolean {
  return /like a|as if|similar to|resembles|metaphorically/i.test(text);
}

function countExplanations(text: string): number {
  const explanatoryPhrases = /because|since|due to|therefore|thus|consequently|as a result|this means/gi;
  return (text.match(explanatoryPhrases) || []).length;
}

function hasStructuredContent(text: string): boolean {
  return /^\d+\.|^[-*•]|^[a-z]\)/m.test(text) || text.split('\n').length > 3;
}

function mentionsMultiplePerspectives(text: string): boolean {
  return /on one hand|on the other hand|however|alternatively|another view|different perspective|conversely|in contrast/i.test(text);
}

function hasQuestions(text: string): boolean {
  return /\?/.test(text);
}

function hasNumbersOrStats(text: string): boolean {
  return /\d+%|\d+\.\d+|\d+ (percent|times|studies|research)/i.test(text);
}

function hasCausalReasoning(text: string): boolean {
  return /because|since|therefore|thus|consequently|as a result|this leads to|this causes/i.test(text);
}

function hasComparisons(text: string): boolean {
  return /compared to|versus|vs\.|better than|worse than|similar to|unlike|in comparison/i.test(text);
}
