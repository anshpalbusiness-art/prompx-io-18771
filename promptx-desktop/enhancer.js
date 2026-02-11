// PromptX Enhancement Engine — Direct xAI API integration
// No proxy server needed — calls Grok API directly

const path = require('path');

// Try multiple .env locations: packaged app resources, same dir, parent dir
const envPaths = [
    path.join(process.resourcesPath || __dirname, '.env'),
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env'),
];
for (const p of envPaths) {
    const result = require('dotenv').config({ path: p });
    if (!result.error) {
        console.log('✅ Loaded .env from:', p);
        break;
    }
}

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

// ============================================
// SPELLING CORRECTIONS DICTIONARY
// ============================================
const SPELLING_FIXES = {
    'teh': 'the', 'thier': 'their', 'recieve': 'receive', 'seperate': 'separate',
    'occured': 'occurred', 'definately': 'definitely', 'accomodate': 'accommodate',
    'occurence': 'occurrence', 'neccessary': 'necessary', 'untill': 'until',
    'arguement': 'argument', 'begining': 'beginning', 'beleive': 'believe',
    'calender': 'calendar', 'collegue': 'colleague', 'commitee': 'committee',
    'concious': 'conscious', 'decission': 'decision', 'enviroment': 'environment',
    'explaination': 'explanation', 'goverment': 'government', 'grammer': 'grammar',
    'harrass': 'harass', 'independant': 'independent', 'knowlege': 'knowledge',
    'maintenence': 'maintenance', 'mispell': 'misspell', 'noticable': 'noticeable',
    'paralel': 'parallel', 'persue': 'pursue', 'posession': 'possession',
    'prefered': 'preferred', 'priviledge': 'privilege', 'profesional': 'professional',
    'recomend': 'recommend', 'refrence': 'reference', 'relevent': 'relevant',
    'rythm': 'rhythm', 'succesful': 'successful', 'suprise': 'surprise',
    'tommorow': 'tomorrow', 'wierd': 'weird', 'writting': 'writing',
    'acess': 'access', 'adress': 'address', 'agressive': 'aggressive',
    'apparantly': 'apparently', 'basicly': 'basically', 'buisness': 'business',
    'catagory': 'category', 'completly': 'completely', 'diffrent': 'different',
    'dissapear': 'disappear', 'embarass': 'embarrass', 'existance': 'existence',
    'familar': 'familiar', 'finaly': 'finally', 'fourty': 'forty',
    'iamge': 'image', 'websit': 'website', 'wesbite': 'website', 'cerate': 'create',
    'craete': 'create', 'creat': 'create', 'wirte': 'write', 'wrtie': 'write',
    'biuld': 'build', 'buidl': 'build', 'fucntion': 'function', 'funciton': 'function',
    'applcation': 'application', 'applicaiton': 'application', 'compnent': 'component',
    'databse': 'database', 'dabase': 'database', 'serach': 'search',
    'desgin': 'design', 'desgn': 'design', 'langauge': 'language',
    'porject': 'project', 'proejct': 'project', 'feautre': 'feature',
    'algorythm': 'algorithm', 'algortihm': 'algorithm'
};

function fixSpelling(text) {
    return text.split(/(\s+)/).map(word => {
        const clean = word.toLowerCase().replace(/[^a-z]/g, '');
        if (SPELLING_FIXES[clean]) {
            const r = SPELLING_FIXES[clean];
            if (word === word.toUpperCase()) return r.toUpperCase();
            if (word[0] === word[0].toUpperCase()) return r.charAt(0).toUpperCase() + r.slice(1);
            return r;
        }
        return word;
    }).join('');
}

function fixGrammar(text) {
    let f = text;
    f = f.replace(/\b([a-zA-Z])([a-zA-Z]+)\b/g, (m, first, rest) => {
        if (m === m.toUpperCase() && m.length <= 5) return m;
        if (m === m.toLowerCase()) return m;
        if (m === first.toUpperCase() + rest.toLowerCase()) return m;
        return m.toLowerCase();
    });
    f = f.replace(/(^|[.!?]\s+)([a-z])/g, (m, p, l) => p + l.toUpperCase());
    f = f.replace(/\bi\b(?=[^a-z]|$)/g, 'I');
    f = f.replace(/  +/g, ' ');
    return f.trim();
}

// ============================================
// CATEGORY DETECTION
// ============================================

function detectCategory(prompt) {
    const lower = prompt.toLowerCase();
    const categories = {
        code: {
            phrases: ['write a function', 'build an app', 'create a website', 'fix this bug', 'debug this', 'refactor code', 'implement a', 'write code', 'write a script', 'build a tool', 'create an api', 'design a database', 'make a website', 'develop a', 'to do list app', 'todo app'],
            words: ['code', 'function', 'api', 'debug', 'program', 'script', 'html', 'css', 'javascript', 'python', 'react', 'database', 'sql', 'algorithm', 'deploy', 'server', 'frontend', 'backend', 'component', 'app', 'typescript', 'node', 'express']
        },
        image: {
            phrases: ['generate an image', 'create an image', 'make a picture', 'draw me', 'design a logo'],
            words: ['image', 'draw', 'paint', 'illustration', 'photo', 'picture', 'render', 'visual', 'art', 'logo']
        },
        writing: {
            phrases: ['write me an', 'write a blog', 'write an article', 'write an essay', 'write a story'],
            words: ['write', 'essay', 'blog', 'article', 'story', 'poem', 'letter', 'content', 'narrative']
        },
        research: {
            phrases: ['explain how', 'what is the', 'how does', 'why does', 'difference between'],
            words: ['explain', 'analyze', 'compare', 'study', 'research', 'define', 'theory']
        },
        business: {
            phrases: ['business plan', 'marketing strategy', 'sales pitch'],
            words: ['business', 'strategy', 'marketing', 'sales', 'revenue', 'startup', 'investor']
        }
    };

    let bestCategory = 'general';
    let bestScore = 0;
    for (const [cat, { phrases, words }] of Object.entries(categories)) {
        let score = 0;
        for (const p of phrases) { if (lower.includes(p)) score += 3; }
        for (const w of words) { if (lower.includes(w)) score += 1; }
        if (score > bestScore) { bestScore = score; bestCategory = cat; }
    }
    return bestCategory;
}

// ============================================
// AI-POWERED ENHANCEMENT (Direct xAI API call)
// ============================================

const SYSTEM_PROMPT = `You are PromptX — the world's most advanced prompt enhancement engine. Your job is to take a user's rough, messy, or vague prompt and transform it into an expert-level, highly detailed, perfectly structured prompt that will get dramatically better results from any AI.

RULES:
- Fix ALL spelling, grammar, and capitalization errors
- Understand the TRUE intent behind the user's words
- COMPLETELY REWRITE the prompt from scratch — don't just append to it
- Add specific details, constraints, format requirements, and context
- Write like a senior expert would — specific, clear, purposeful
- The enhanced prompt should feel like a human expert wrote it
- Quality over quantity. Concise but comprehensive
- Make it 3-10x more detailed and specific than the original
- NEVER add pleasantries or fluff. Be direct and actionable

EXAMPLES:
User: "make me a to do list app"
Enhanced: "Build a modern, full-featured task management application with the following requirements: Create a responsive React/Next.js frontend with a clean, minimal UI featuring: task creation with title, description, due date, and priority levels (High/Medium/Low); drag-and-drop task reordering; category/tag system for organization; search and filter functionality; task completion with satisfying animations; dark/light theme toggle. Backend: RESTful API with user authentication, persistent storage using PostgreSQL, and real-time sync. Include proper error handling, loading states, and empty states. Mobile-responsive design with PWA support."

User: "wirte about climte change"
Enhanced: "Write a comprehensive, well-researched article on climate change covering: the current scientific consensus with key data points (global temperature rise, CO2 levels, ice sheet loss); the most significant impacts on ecosystems, agriculture, and human health; an analysis of leading mitigation strategies (renewable energy transition, carbon capture, policy frameworks); actionable steps individuals and organizations can take. Use an authoritative yet accessible tone. Structure with clear headings, data visualizations suggestions, and cite recent peer-reviewed studies. Target length: 2000-2500 words."

RESPOND IN THIS EXACT JSON FORMAT:
{
  "enhanced": "The completely rewritten, expert-level prompt",
  "tips": ["Specific improvement insight 1", "Specific improvement insight 2"],
  "improvement": "One-line summary of what was improved"
}`;

async function enhanceViaAPI(prompt, category) {
    if (!XAI_API_KEY) {
        throw new Error('XAI_API_KEY not set in .env');
    }

    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        try {
            console.log(`🔮 API call attempt ${attempt}/${MAX_RETRIES}...`);

            const response = await fetch(XAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${XAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'grok-3-mini-fast',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: `Category: ${category}\nPrompt to enhance: "${prompt}"` }
                    ],
                    temperature: 0.7,
                    max_tokens: 1500
                }),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API ${response.status}: ${errorText.substring(0, 200)}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            // Parse JSON response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                return {
                    enhanced: result.enhanced || content,
                    tips: result.tips || [],
                    improvement: result.improvement || 'AI-enhanced'
                };
            }

            // Fallback: use raw content as enhanced text
            return {
                enhanced: content,
                tips: ['Prompt was enhanced by AI'],
                improvement: 'AI-enhanced'
            };
        } catch (error) {
            clearTimeout(timeout);
            console.log(`⚠️ Attempt ${attempt} failed: ${error.message}`);
            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
            } else {
                throw error;
            }
        }
    }
}

// ============================================
// LOCAL FALLBACK ENHANCEMENT
// ============================================

function enhanceLocally(prompt, category) {
    const clean = fixGrammar(fixSpelling(prompt));

    const categoryEnhancements = {
        code: '. Include the complete implementation with proper error handling, input validation, clean code structure with comments, responsive design, and modern best practices. Specify the tech stack, file structure, and deployment approach.',
        writing: '. Use an engaging, professional tone with clear headings, a compelling hook, concrete examples, and a strong conclusion. Be comprehensive but concise.',
        research: '. Provide a comprehensive analysis with key concepts defined, current developments, real-world examples, multiple perspectives, and practical applications.',
        image: ', photorealistic digital art, dramatic cinematic lighting, vibrant and atmospheric, highly detailed, 8K resolution, masterpiece quality.',
        business: '. Include an executive summary, data-driven analysis with key metrics, competitive landscape, risk assessment, and prioritized action items.',
        general: '. Be thorough and specific. Include concrete examples, consider edge cases, and provide actionable, detailed requirements.'
    };

    const enhancement = categoryEnhancements[category] || categoryEnhancements.general;

    return {
        enhanced: clean + enhancement,
        tips: ['Try running the proxy server for AI-powered enhancement: node proxy-server.js'],
        improvement: 'Fixed spelling/grammar and added structure'
    };
}

// ============================================
// MAIN ENHANCE FUNCTION
// ============================================

async function enhance(prompt) {
    const category = detectCategory(prompt);

    // Try AI enhancement first (direct API call)
    try {
        const result = await enhanceViaAPI(prompt, category);
        console.log('✅ AI enhancement successful!');
        return { ...result, category, source: 'api' };
    } catch (err) {
        console.log('⚠️ AI API unavailable, using local enhancement:', err.message);
        const local = enhanceLocally(prompt, category);
        return { ...local, category, source: 'local' };
    }
}

module.exports = { enhance, detectCategory };
