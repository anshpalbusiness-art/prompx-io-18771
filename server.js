/**
 * Local development proxy server for the chat completion API.
 * Forwards requests to the xAI API using the XAI_API_KEY from .env.
 * 
 * Usage: node server.js
 * Runs on the port specified by PROXY_PORT in .env (default 3002).
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PROXY_PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/chat-completion', async (req, res) => {
    try {
        const { messages, model = 'grok-beta', stream = false } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid request: messages array required' });
        }

        const XAI_API_KEY = process.env.XAI_API_KEY;
        if (!XAI_API_KEY) {
            console.error('XAI_API_KEY not configured in .env');
            return res.status(500).json({ error: 'API key not configured' });
        }

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
            console.error('xAI API error:', errorData);
            return res.status(response.status).json({ error: errorData.error || 'API request failed' });
        }

        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            response.body.pipeTo(new WritableStream({
                write(chunk) { res.write(chunk); },
                close() { res.end(); },
            }));
        } else {
            const data = await response.json();
            res.json(data);
        }
    } catch (error) {
        console.error('Chat completion error:', error.message);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ API proxy server running on http://localhost:${PORT}`);
});
