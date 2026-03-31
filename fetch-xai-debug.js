
const dotenv = require('dotenv');
dotenv.config();

const XAI_API_KEY = process.env.XAI_API_KEY;
const userPrompt = 'help me to design a app using python step by step';

(async () => {
    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': '`Bearer ' + XAI_API_KEY + '`' },
            body: JSON.stringify({
                model: 'grok-3-mini-fast',
                messages: [
                    { role: 'system', content: 'You are a master search engine operator. Generate 2 queries. JSON array.' },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3
            })
        });
        const text = await response.text();
        console.log('STATUS:', response.status);
        console.log('BODY:', text);
    } catch(e) {
        console.error(e);
    }
})();
