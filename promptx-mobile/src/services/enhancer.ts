/**
 * PromptX Enhancement Service
 * Calls Supabase Edge Function or falls back to local enhancement.
 */

const SUPABASE_URL = 'https://tplfjmitflhxuttixqjq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwbGZqbWl0ZmxoeHV0dGl4cWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MTY5NDQsImV4cCI6MjA1MjA5Mjk0NH0.L9MfjhFwCbGSqVFBJFsfWMVhNlMYEyN12cXMX2BZLvY';

export interface EnhancementResult {
    enhanced: string;
    tips: string[];
    improvement: string;
    category: string;
    timestamp: number;
}

export async function enhancePrompt(
    prompt: string,
    category: string = 'general',
    apiKey?: string,
): Promise<EnhancementResult> {
    try {
        // Try Supabase Edge Function first
        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/sdk-generate-prompt`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                    ...(apiKey ? { 'x-api-key': apiKey } : {}),
                },
                body: JSON.stringify({
                    prompt,
                    toolType: category === 'coding' ? 'code' : 'text',
                    model: 'google/gemini-2.5-flash',
                }),
            },
        );

        if (response.ok) {
            const data = await response.json();
            return {
                enhanced: data.optimized || data.enhanced || prompt,
                tips: data.tips || ['Enhanced with PromptX AI'],
                improvement: data.improvement || 'AI-enhanced',
                category,
                timestamp: Date.now(),
            };
        }

        // Fall back to local enhancement
        return localEnhance(prompt, category);
    } catch (error) {
        console.warn('API enhancement failed, falling back to local:', error);
        return localEnhance(prompt, category);
    }
}

function localEnhance(prompt: string, category: string): EnhancementResult {
    const strategies: Record<string, (p: string) => string> = {
        coding: p =>
            `${fixSpelling(p)}\n\nPlease provide clean, well-commented code with error handling. Follow best practices for the language/framework. Include type annotations where applicable.`,
        writing: p =>
            `${fixSpelling(p)}\n\nWrite in a clear, engaging style appropriate for the target audience. Use vivid language and concrete examples. Structure with a compelling introduction, well-organized body, and memorable conclusion.`,
        image: p =>
            `${fixSpelling(p)}, highly detailed, professional quality, 8K resolution, cinematic lighting, photorealistic rendering`,
        business: p =>
            `${fixSpelling(p)}\n\nProvide actionable, data-driven insights. Include specific metrics, benchmarks, and implementation steps. Consider ROI, timeline, and risk factors.`,
        general: p =>
            `${fixSpelling(p)}\n\nPlease provide a comprehensive, well-structured response with specific details and actionable insights.`,
    };

    const enhance = strategies[category] || strategies.general;

    return {
        enhanced: enhance(prompt),
        tips: ['Enhanced locally — connect to internet for AI-powered enhancement'],
        improvement: 'Local enhancement applied',
        category,
        timestamp: Date.now(),
    };
}

function fixSpelling(text: string): string {
    const fixes: Record<string, string> = {
        teh: 'the',
        adn: 'and',
        wiht: 'with',
        taht: 'that',
        hte: 'the',
        waht: 'what',
        becuase: 'because',
        shoudl: 'should',
        coudl: 'could',
        woudl: 'would',
        doesnt: "doesn't",
        dont: "don't",
        cant: "can't",
        wont: "won't",
        whats: "what's",
    };

    let fixed = text;
    for (const [wrong, right] of Object.entries(fixes)) {
        fixed = fixed.replace(new RegExp(`\\b${wrong}\\b`, 'gi'), right);
    }

    // Fix random caps: make first letter of each sentence uppercase
    fixed = fixed.replace(/(^|\.\s+)(\w)/g, (_, prefix, letter) =>
        prefix + letter.toUpperCase(),
    );

    return fixed;
}
