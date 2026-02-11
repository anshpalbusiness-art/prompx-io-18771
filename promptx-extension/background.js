// PromptX Extension — Background Service Worker
// Handles API calls, message routing, intelligent prompt enhancement

// Default API base — can be overridden via chrome.storage.local.apiUrl
let API_BASE = 'http://localhost:3001';

// Track extension state
let isEnabled = true;

// Load API URL from storage (allows user/admin override)
chrome.storage.local.get(['apiUrl'], (data) => {
    if (data.apiUrl) API_BASE = data.apiUrl;
});

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('🚀 PromptX Extension installed');
    // Only set defaults — never overwrite existing data
    chrome.storage.local.get(['enabled', 'enhancementCount', 'history'], (existing) => {
        const defaults = {};
        if (existing.enabled === undefined) defaults.enabled = true;
        if (existing.enhancementCount === undefined) defaults.enhancementCount = 0;
        if (existing.history === undefined) defaults.history = [];
        if (Object.keys(defaults).length > 0) chrome.storage.local.set(defaults);
    });
});

// Health check — verify API connectivity on startup
async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_BASE}/api/enhance-prompt`, {
            method: 'OPTIONS',
            signal: AbortSignal.timeout(5000)
        });
        console.log(`✅ PromptX API connected (${API_BASE})`);
        return true;
    } catch {
        console.warn(`⚠️ PromptX API unreachable at ${API_BASE} — will use local enhancement`);
        return false;
    }
}
checkAPIHealth();

// Keyboard shortcut handler (Alt+P)
chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-enhance') {
        chrome.storage.local.get(['enabled'], (data) => {
            const newState = !(data.enabled !== false);
            chrome.storage.local.set({ enabled: newState });
            isEnabled = newState;
            console.log(`⌨️ PromptX ${newState ? 'enabled' : 'disabled'} via shortcut`);
        });
    }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ENHANCE_PROMPT') {
        handleEnhancePrompt(message.data)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'GET_STATUS') {
        chrome.storage.local.get(['enabled', 'enhancementCount'], (data) => {
            sendResponse({ enabled: data.enabled ?? true, count: data.enhancementCount ?? 0 });
        });
        return true;
    }

    if (message.type === 'TOGGLE_ENABLED') {
        chrome.storage.local.get(['enabled'], (data) => {
            const newState = !(data.enabled !== false);
            chrome.storage.local.set({ enabled: newState });
            isEnabled = newState;
            sendResponse({ enabled: newState });
        });
        return true;
    }

    if (message.type === 'OPEN_SIDE_PANEL') {
        if (sender.tab) {
            chrome.sidePanel.open({ tabId: sender.tab.id });
        }
        sendResponse({ success: true });
        return true;
    }
});

// ============================================
// CORE: Prompt Enhancement Function
// ============================================
async function handleEnhancePrompt({ prompt, site, category }) {
    if (!prompt || prompt.trim().length < 5) {
        throw new Error('Prompt too short to enhance');
    }

    const cleanPrompt = prompt.trim();
    const detectedCategory = category || detectCategory(cleanPrompt);

    // Try API first, fallback to built-in intelligence
    let result;
    try {
        result = await enhanceViaAPI(cleanPrompt, detectedCategory, site);
    } catch (apiError) {
        console.log('⚠️ API unavailable, using built-in intelligence:', apiError.message);
        result = enhanceLocally(cleanPrompt, detectedCategory, site);
    }

    // Update stats
    chrome.storage.local.get(['enhancementCount', 'history'], (stored) => {
        const count = (stored.enhancementCount || 0) + 1;
        const history = stored.history || [];
        history.unshift({
            original: cleanPrompt,
            enhanced: result.enhanced,
            category: detectedCategory,
            site,
            timestamp: Date.now()
        });
        if (history.length > 50) history.length = 50;
        chrome.storage.local.set({ enhancementCount: count, history });
    });

    return {
        enhanced: result.enhanced,
        category: detectedCategory,
        tips: result.tips || [],
        improvement: result.improvement || ''
    };
}

// ============================================
// METHOD 1: Enhance via proxy server API
// ============================================
async function enhanceViaAPI(prompt, category, site) {
    const MAX_RETRIES = 3;
    const BASE_TIMEOUT = 12000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timeoutMs = BASE_TIMEOUT + (attempt * 3000); // 15s, 18s, 21s
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(`${API_BASE}/api/enhance-prompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, category, targetAI: site || 'general' }),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const errBody = await response.text().catch(() => '');
                throw new Error(`API error ${response.status}: ${errBody}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeout);

            if (attempt < MAX_RETRIES) {
                const delay = Math.pow(2, attempt) * 500; // 1s, 2s backoff
                console.log(`⚠️ Attempt ${attempt}/${MAX_RETRIES} failed, retrying in ${delay}ms...`, error.message);
                await new Promise(r => setTimeout(r, delay));
            } else {
                throw new Error(error.name === 'AbortError' ? 'Enhancement timed out — is the proxy server running?' : `Enhancement failed: ${error.message}`);
            }
        }
    }
}

// ============================================
// METHOD 2: Built-in intelligent enhancement
// ============================================

// Common spelling mistakes dictionary
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
    'generaly': 'generally', 'guarentee': 'guarantee', 'happend': 'happened',
    'humourous': 'humorous', 'imediately': 'immediately', 'intresting': 'interesting',
    'judgement': 'judgment', 'liesure': 'leisure', 'libary': 'library',
    'lisence': 'license', 'medival': 'medieval', 'millenium': 'millennium',
    'miscelaneous': 'miscellaneous', 'naturaly': 'naturally', 'neigbor': 'neighbor',
    'occassion': 'occasion', 'orignal': 'original', 'particulary': 'particularly',
    'pavillion': 'pavilion', 'persistant': 'persistent', 'politican': 'politician',
    'preceed': 'precede', 'probaly': 'probably', 'publically': 'publicly',
    'questionaire': 'questionnaire', 'realy': 'really', 'religous': 'religious',
    'repitition': 'repetition', 'resturant': 'restaurant', 'shedule': 'schedule',
    'sieze': 'seize', 'speach': 'speech', 'strenght': 'strength',
    'threshhold': 'threshold', 'usefull': 'useful', 'vaccum': 'vacuum',
    'vehical': 'vehicle', 'wether': 'whether', 'wich': 'which',
    'iamge': 'image', 'imagee': 'image', 'imge': 'image',
    'websit': 'website', 'wesbite': 'website', 'cerate': 'create',
    'craete': 'create', 'creat': 'create', 'wirte': 'write',
    'wrtie': 'write', 'biuld': 'build', 'buidl': 'build',
    'fucntion': 'function', 'funciton': 'function', 'applcation': 'application',
    'applicaiton': 'application', 'compnent': 'component', 'compoennt': 'component',
    'databse': 'database', 'dabase': 'database', 'serach': 'search',
    'analsis': 'analysis', 'anaylsis': 'analysis', 'startegy': 'strategy',
    'stratagy': 'strategy', 'desgin': 'design', 'desgn': 'design',
    'repsonsive': 'responsive', 'responsve': 'responsive',
    'langauge': 'language', 'languaeg': 'language', 'progam': 'program',
    'porgram': 'program', 'porject': 'project', 'proejct': 'project',
    'feautre': 'feature', 'featrue': 'feature', 'implemnt': 'implement',
    'implment': 'implement', 'algorythm': 'algorithm', 'algortihm': 'algorithm'
};

// Fix spelling in text
function fixSpelling(text) {
    let fixed = text;
    const words = text.split(/(\s+)/);
    const fixedWords = words.map(word => {
        const clean = word.toLowerCase().replace(/[^a-z]/g, '');
        if (SPELLING_FIXES[clean]) {
            // Preserve original casing pattern
            const replacement = SPELLING_FIXES[clean];
            if (word === word.toUpperCase()) return replacement.toUpperCase();
            if (word[0] === word[0].toUpperCase()) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
            return replacement;
        }
        return word;
    });
    fixed = fixedWords.join('');
    return fixed;
}

// Fix grammar and capitalization
function fixGrammar(text) {
    let fixed = text;

    // Fix random capitalization in the middle of words (e.g., "oF" → "of", "tHe" → "the")
    // but preserve intentional ALL CAPS words and acronyms
    fixed = fixed.replace(/\b([a-zA-Z])([a-zA-Z]+)\b/g, (match, first, rest) => {
        // Skip if it's ALL CAPS (intentional), all lowercase, or proper Title Case
        if (match === match.toUpperCase() && match.length <= 5) return match; // Likely acronym
        if (match === match.toLowerCase()) return match; // Already lowercase
        if (match === first.toUpperCase() + rest.toLowerCase()) return match; // Title Case
        // Fix mixed case like "oF", "tHe", "crEate"
        return match.toLowerCase();
    });

    // Capitalize first letter of sentences
    fixed = fixed.replace(/(^|[.!?]\s+)([a-z])/g, (m, prefix, letter) => prefix + letter.toUpperCase());

    // Fix "i" → "I" when standalone
    fixed = fixed.replace(/\bi\b(?=[^a-z]|$)/g, 'I');

    // Fix double spaces
    fixed = fixed.replace(/  +/g, ' ');

    // Fix "create me an" → "create an", "make me a" → "make a"
    fixed = fixed.replace(/\b(create|make|build|write|generate|design)\s+me\s+(an?|the)\b/gi, '$1 $2');

    return fixed.trim();
}

// Clean and intelligently rewrite a prompt
function smartRewrite(prompt) {
    let clean = fixSpelling(prompt);
    clean = fixGrammar(clean);
    return clean;
}

function enhanceLocally(prompt, category, site) {
    const strategies = {
        code: enhanceCodePrompt,
        writing: enhanceWritingPrompt,
        research: enhanceResearchPrompt,
        image: enhanceImagePrompt,
        business: enhanceBusinessPrompt,
        creative: enhanceCreativePrompt,
        general: enhanceGeneralPrompt
    };

    const enhancer = strategies[category] || strategies.general;
    return enhancer(prompt, site);
}

// ---- Code Enhancement ----
function enhanceCodePrompt(prompt, site) {
    const clean = smartRewrite(prompt);
    const tips = [];

    const hasLanguage = /\b(python|javascript|typescript|java|c\+\+|rust|go|ruby|php|swift|kotlin|react|vue|angular|node|django|flask|express)\b/i.test(clean);

    let enhanced = clean;
    if (!hasLanguage) {
        tips.push('Specify the programming language for more targeted code');
    }

    enhanced += '. Include proper error handling, input validation, and clean code structure with comments explaining key logic.';
    tips.push('Add example inputs/outputs for even better results');

    return {
        enhanced,
        tips,
        improvement: 'Fixed errors and added technical requirements'
    };
}

// ---- Writing Enhancement ----
function enhanceWritingPrompt(prompt, site) {
    const clean = smartRewrite(prompt);
    const tips = [];

    const hasTone = /\b(formal|casual|professional|friendly|technical|persuasive)\b/i.test(clean);
    const hasLength = /\b(\d+ words|\d+ paragraphs|short|long|brief|detailed)\b/i.test(clean);

    let enhanced = clean;
    if (!hasTone) enhanced += '. Use an engaging, professional tone';
    if (!hasLength) enhanced += '. Be comprehensive but concise';
    enhanced += '. Structure with clear headings, a compelling hook, concrete examples, and a strong conclusion.';

    if (!hasTone) tips.push('Specify tone (formal, casual, persuasive) to tailor the output');
    if (!hasLength) tips.push('Add word count for better length control');

    return {
        enhanced,
        tips,
        improvement: 'Fixed errors and added writing direction'
    };
}

// ---- Research Enhancement ----
function enhanceResearchPrompt(prompt, site) {
    const clean = smartRewrite(prompt);

    let enhanced = clean;
    enhanced += '. Provide a comprehensive analysis with key concepts defined, current developments, real-world examples, multiple perspectives, and practical applications. Cite sources where possible.';

    return {
        enhanced,
        tips: ['Specify depth level (overview vs deep-dive)', 'Mention specific aspects you care most about'],
        improvement: 'Fixed errors and added research depth requirements'
    };
}

// ---- Image Enhancement ----
function enhanceImagePrompt(prompt, site) {
    const clean = smartRewrite(prompt);
    const tips = [];

    const hasStyle = /\b(realistic|photorealistic|cartoon|anime|watercolor|oil painting|digital art|3d render|illustration|cinematic|concept art)\b/i.test(clean);
    const hasLighting = /\b(lighting|light|shadow|dramatic|soft|golden hour|neon|backlit|volumetric)\b/i.test(clean);
    const hasMood = /\b(moody|vibrant|dark|bright|ethereal|peaceful|energetic|mystical|futuristic)\b/i.test(clean);

    let enhanced = clean;
    if (!hasStyle) { enhanced += ', photorealistic digital art'; tips.push('Specify art style for more control'); }
    if (!hasLighting) { enhanced += ', dramatic cinematic lighting with warm golden tones'; }
    if (!hasMood) { enhanced += ', vibrant and atmospheric'; }
    enhanced += ', highly detailed, 8K resolution, masterpiece quality, trending on ArtStation';

    return {
        enhanced,
        tips: [...tips, 'Add mood/atmosphere descriptors for richer images'],
        improvement: 'Fixed errors and added style, lighting, and quality modifiers'
    };
}

// ---- Business Enhancement ----
function enhanceBusinessPrompt(prompt, site) {
    const clean = smartRewrite(prompt);

    let enhanced = clean;
    enhanced += '. Include an executive summary, data-driven analysis with key metrics, competitive landscape, risk assessment, and prioritized action items.';

    return {
        enhanced,
        tips: ['Add specific KPIs you care about', 'Mention your industry and company stage for better context'],
        improvement: 'Fixed errors and added business analysis framework'
    };
}

// ---- Creative Enhancement ----
function enhanceCreativePrompt(prompt, site) {
    const clean = smartRewrite(prompt);

    let enhanced = clean;
    enhanced += '. Generate 5+ diverse ideas ranging from practical to ambitious. For each: one-line concept, how it works, why it\'s unique, and a feasibility rating. Include at least one unconventional out-of-the-box idea.';

    return {
        enhanced,
        tips: ['Add constraints (budget, timeline) for focused ideas', 'Define what success looks like'],
        improvement: 'Fixed errors and added structured brainstorming format'
    };
}

// ---- General Enhancement ----
function enhanceGeneralPrompt(prompt, site) {
    const clean = smartRewrite(prompt);
    const tips = [];

    const isQuestion = /\?$|^(what|how|why|when|where|who|which|can|could|would|should|is|are|do|does)\b/i.test(clean);

    let enhanced = clean;
    if (isQuestion) {
        enhanced += ' Provide a clear, comprehensive answer with step-by-step explanation, concrete examples, and practical tips. Include common pitfalls to avoid.';
        tips.push('Specify your experience level for better-targeted explanations');
    } else {
        enhanced += '. Be thorough and specific. Include concrete examples, consider edge cases, and provide actionable next steps.';
        tips.push('Frame as a specific question for even better results');
    }

    tips.push('Add context about your goal and desired output format');

    return {
        enhanced,
        tips,
        improvement: 'Fixed errors and added clarity and structure'
    };
}

// ============================================
// INTELLIGENT CATEGORY DETECTION
// ============================================
function detectCategory(prompt) {
    const lower = prompt.toLowerCase();

    // Weighted keyword scoring with phrases having higher weight
    const categories = {
        code: {
            phrases: ['write a function', 'build an app', 'create a website', 'fix this bug', 'debug this', 'refactor code', 'implement a', 'write code', 'programming', 'write a script', 'build a tool', 'create an api', 'design a database', 'make a website', 'develop a'],
            words: ['code', 'function', 'api', 'debug', 'build', 'program', 'script', 'html', 'css', 'javascript', 'python', 'react', 'database', 'sql', 'algorithm', 'deploy', 'server', 'frontend', 'backend', 'component', 'class', 'interface', 'bug', 'error', 'compile', 'terminal', 'git', 'npm', 'docker', 'regex', 'typescript', 'node', 'express', 'django', 'flask', 'vue', 'angular', 'nextjs', 'vite', 'webpack', 'kubernetes', 'aws', 'azure', 'lambda', 'graphql', 'mongodb', 'postgres', 'redis', 'supabase', 'firebase']
        },
        image: {
            phrases: ['generate an image', 'create an image', 'make a picture', 'draw me', 'design a logo', 'create art', 'generate art', 'paint a', 'illustrate a', 'render a', 'create a poster', 'design a banner'],
            words: ['image', 'draw', 'paint', 'illustration', 'photo', 'picture', 'render', 'visual', 'art', 'logo', 'icon', 'graphic', 'portrait', 'landscape', 'abstract', 'realistic', 'anime', 'cartoon', '3d', 'dall-e', 'midjourney', 'stable diffusion', 'artistic']
        },
        writing: {
            phrases: ['write me an', 'write a blog', 'write an article', 'write an essay', 'write a story', 'write a poem', 'draft an email', 'write a letter', 'create content', 'write copy', 'write a post'],
            words: ['write', 'essay', 'blog', 'article', 'story', 'poem', 'letter', 'content', 'copywriting', 'narrative', 'fiction', 'novel', 'chapter', 'paragraph', 'screenplay', 'dialogue', 'manuscript', 'thesis', 'draft', 'proofread', 'edit', 'rewrite']
        },
        research: {
            phrases: ['explain how', 'what is the', 'how does', 'why does', 'difference between', 'compare and contrast', 'analyze the', 'study of', 'research on', 'tell me about', 'give me information'],
            words: ['explain', 'analyze', 'compare', 'study', 'research', 'define', 'history', 'science', 'theory', 'evidence', 'data', 'statistics', 'survey', 'methodology', 'hypothesis', 'experiment', 'findings', 'literature', 'peer-reviewed', 'academic']
        },
        business: {
            phrases: ['business plan', 'marketing strategy', 'sales pitch', 'investor pitch', 'competitive analysis', 'market research', 'growth strategy', 'revenue model', 'go-to-market'],
            words: ['business', 'strategy', 'pitch', 'proposal', 'marketing', 'sales', 'revenue', 'startup', 'investor', 'roi', 'kpi', 'budget', 'forecast', 'competitive', 'growth', 'stakeholder', 'presentation', 'entrepreneur', 'fundraising', 'b2b', 'b2c', 'saas', 'product-market']
        },
        creative: {
            phrases: ['brainstorm ideas', 'come up with', 'think of ways', 'creative solutions', 'innovative approach', 'out of the box'],
            words: ['brainstorm', 'idea', 'concept', 'innovate', 'imagine', 'creative', 'unique', 'original', 'invention', 'inspiration', 'hypothetical', 'experiment', 'reimagine', 'revolutionize']
        }
    };

    let bestCategory = 'general';
    let bestScore = 0;

    for (const [cat, { phrases, words }] of Object.entries(categories)) {
        let score = 0;

        // Phrases worth 3 points each
        for (const phrase of phrases) {
            if (lower.includes(phrase)) score += 3;
        }

        // Words worth 1 point each
        for (const word of words) {
            if (lower.includes(word)) score += 1;
        }

        if (score > bestScore) {
            bestScore = score;
            bestCategory = cat;
        }
    }

    return bestCategory;
}
