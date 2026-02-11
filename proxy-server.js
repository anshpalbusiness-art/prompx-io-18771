// Simple Express server to proxy xAI API requests
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/chat-completion', async (req, res) => {
    try {
        console.log('📩 Received request:', req.body);

        const { messages, model = 'grok-beta', stream = false } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid request: messages array required' });
        }

        const XAI_API_KEY = process.env.XAI_API_KEY;
        if (!XAI_API_KEY) {
            console.error('❌ XAI_API_KEY not configured');
            return res.status(500).json({ error: 'API key not configured' });
        }

        console.log('🚀 Calling xAI API...');
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${XAI_API_KEY}`,
            },
            body: JSON.stringify({ model, messages, stream }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ xAI API error:', errorData);
            return res.status(response.status).json({ error: errorData.error || 'API request failed' });
        }

        const data = await response.json();
        console.log('✅ Success! Response:', data.choices[0].message.content.substring(0, 100) + '...');
        res.json(data);

    } catch (error) {
        console.error('❌ Server error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// PromptX Extension — Prompt Enhancement Endpoint
app.post('/api/enhance-prompt', async (req, res) => {
    try {
        console.log('✨ Received prompt enhancement request');
        const { prompt, category, targetAI } = req.body;

        if (!prompt || prompt.trim().length < 5) {
            return res.status(400).json({ error: 'Prompt too short (minimum 5 characters)' });
        }

        const XAI_API_KEY = process.env.XAI_API_KEY;
        if (!XAI_API_KEY) {
            console.error('❌ XAI_API_KEY not configured');
            return res.status(500).json({ error: 'API key not configured' });
        }

        const systemPrompt = `You are PromptX — a world-class prompt engineer. You take rough, casual user prompts and rewrite them into clear, powerful prompts that get exceptional results from AI.

ABSOLUTE REQUIREMENTS:
1. FIX ALL SPELLING AND GRAMMAR MISTAKES. This is non-negotiable. Never leave typos, misspellings, or grammar errors in the enhanced prompt.
2. FIX RANDOM CAPITALIZATION. "oF" → "of", "SUNSET" → "sunset" (unless it's an acronym).
3. ACTUALLY REWRITE the prompt — don't just append bullet points to the original.

YOUR CORE PHILOSOPHY:
- Don't add generic checklists or boilerplate. DEEPLY UNDERSTAND what the user wants and craft the perfect prompt.
- Write like a senior expert would — specific, clear, purposeful.
- The enhanced prompt should feel like a human expert wrote it, not a template engine.
- Quality over quantity. Concise but comprehensive.

WHAT TO DO:
1. Fix ALL spelling, grammar, and capitalization errors first
2. Understand the TRUE intent behind the user's words
3. Rewrite the entire prompt from scratch — don't just append to it
4. Add specific, relevant details that improve the output
5. Set the right tone, scope, and constraints
6. Keep it natural — never sound robotic or templated

WHAT NOT TO DO:
- NEVER keep spelling mistakes from the original
- NEVER add generic lines like "follow best practices" or "be thorough"
- NEVER create bullet-point checklists of obvious requirements
- NEVER prepend labels like "Task:" or "Writing Task:"
- NEVER make it longer than necessary
- NEVER add meta-instructions like "please" or "could you"

EXAMPLES:
User: "create me an iamge oF SUNSET"
BAD: "Task: create me an iamge oF SUNSET\\n\\nGuidelines:\\n- Be thorough..."
GOOD: "A breathtaking sunset over the ocean with dramatic orange and purple clouds reflecting on calm water. Golden hour lighting, photorealistic, wide-angle composition, 8K resolution, cinematic color grading."

User: "make a todo app"
GOOD: "Build a modern todo list app with React and TypeScript. Include: task CRUD operations, drag-to-reorder, due dates with color-coded urgency, local storage persistence, and a clean minimal UI with dark mode. Structure the code with separate components for TaskList, TaskItem, and AddTask."

User: "wirte about climte change"
GOOD: "Write a 1500-word analytical article on climate change covering the latest IPCC findings (2023-2024), the 3 most impactful mitigation strategies backed by data, and a realistic assessment of the 1.5°C target. Journalistic tone with concrete statistics. Target: informed general readers."

User: "craete a logo"
GOOD: "Design a minimal, modern logo for a tech startup called [name]. Style: geometric, flat design with bold typography. Colors: deep navy blue with electric cyan accent. Must work at 16px favicon and billboard size. Provide full logo, icon-only, and monochrome variations."

Category hint: "${category || 'general'}"
Target AI: "${targetAI || 'general'}"

RESPONSE FORMAT (respond ONLY in valid JSON, no markdown wrapping):
{
  "enhanced": "The completely rewritten prompt — all errors fixed, specific, intelligent, expert-level",
  "tips": ["Why this specific improvement matters", "Another key insight"],
  "improvement": "One-line summary of what was improved"
}`;

        console.log(`🔮 Enhancing "${prompt.substring(0, 60)}..." [${category}]`);

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${XAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'grok-3-mini-fast',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Rewrite this prompt to be expert-level:\n\n"${prompt}"` }
                ],
                stream: false,
                temperature: 0.8
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ xAI API error:', errorData);
            return res.status(response.status).json({ error: errorData.error || 'Enhancement failed' });
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        // Parse JSON response
        let result;
        try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                // Fallback: treat the entire response as the enhanced prompt
                result = {
                    enhanced: content.trim(),
                    tips: ['The prompt was enhanced with more detail and specificity'],
                    improvement: 'Added structure and clarity'
                };
            }
        } catch (parseError) {
            result = {
                enhanced: content.trim(),
                tips: ['The prompt was enhanced with more detail and specificity'],
                improvement: 'Added structure and clarity'
            };
        }

        console.log('✅ Enhancement complete!');
        res.json(result);

    } catch (error) {
        console.error('❌ Enhancement error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/text-to-speech', async (req, res) => {
    try {
        console.log('🎤 Received TTS request');
        const { text, voiceId } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        if (!voiceId) {
            return res.status(400).json({ error: 'Voice ID is required' });
        }

        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
        if (!ELEVENLABS_API_KEY) {
            console.error('❌ ELEVENLABS_API_KEY not configured');
            return res.status(500).json({ error: 'TTS API key not configured' });
        }

        console.log(`🗣️ Generating speech for: "${text.substring(0, 50)}..." using voice ${voiceId}`);

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_turbo_v2_5', // Latest, fastest, most natural model
                voice_settings: {
                    stability: 0.35,        // Lower = more emotional variation & natural speech patterns
                    similarity_boost: 0.75, // High for authentic voice character & emotion
                    style: 0.50,           // Moderate for conversational, expressive tone
                    use_speaker_boost: true // Enhanced clarity and emotional presence
                }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ ElevenLabs API error:', errorData);
            return res.status(response.status).json({ error: errorData });
        }

        console.log('✅ Audio generated successfully');

        // Stream the audio back to the client
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.set('Content-Type', 'audio/mpeg');
        res.send(buffer);

    } catch (error) {
        console.error('❌ TTS Server error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
    console.log(`📝 API endpoint: http://localhost:${PORT}/api/chat-completion`);
    console.log(`✨ Enhancement endpoint: http://localhost:${PORT}/api/enhance-prompt`);
});
