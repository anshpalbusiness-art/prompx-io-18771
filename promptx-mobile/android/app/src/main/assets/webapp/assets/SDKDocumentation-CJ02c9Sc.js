import{c as y,x as j,j as e,h as o,i as t,k as a,l as f,m as r,B as i}from"./index-C2MjUc6j.js";import{T as b,a as v,b as n,c as l}from"./tabs-CyOF3ppl.js";import{C as k}from"./code-DFXLlMDu.js";import{Z as N}from"./index-BOT--vBY.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=y("Package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);function P(){const{toast:h}=j(),s=g=>{navigator.clipboard.writeText(g),h({title:"Copied to clipboard",description:"Code snippet copied successfully"})},p=`// Install via npm (conceptual - copy this SDK code to your project)
// npm install @yourplatform/prompt-sdk

// Initialize the SDK
const PromptSDK = {
  apiKey: 'your-api-key-here',
  baseUrl: '${window.location.origin}',
  
  async optimizePrompt(options) {
    const response = await fetch(
      \`\${this.baseUrl}/functions/v1/sdk-generate-prompt\`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({
          prompt: options.prompt,
          toolType: options.toolType || 'text',
          model: options.model || 'google/gemini-2.5-flash',
          temperature: options.temperature || 0.7,
          maxTokens: options.maxTokens || 500
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(\`API error: \${response.status}\`);
    }
    
    return await response.json();
  }
};

// Usage example
async function main() {
  try {
    const result = await PromptSDK.optimizePrompt({
      prompt: "Create a marketing email",
      toolType: "text"
    });
    
    console.log('Original:', result.original);
    console.log('Optimized:', result.optimized);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();`,c=`# Python SDK Example
import requests
import json

class PromptSDK:
    def __init__(self, api_key, base_url="${window.location.origin}"):
        self.api_key = api_key
        self.base_url = base_url
    
    def optimize_prompt(self, prompt, tool_type="text", model="google/gemini-2.5-flash"):
        """Optimize a prompt using the API"""
        url = f"{self.base_url}/functions/v1/sdk-generate-prompt"
        
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key
        }
        
        payload = {
            "prompt": prompt,
            "toolType": tool_type,
            "model": model
        }
        
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()

# Usage
sdk = PromptSDK(api_key="your-api-key-here")

result = sdk.optimize_prompt(
    prompt="Create a sales pitch",
    tool_type="text"
)

print(f"Original: {result['original']}")
print(f"Optimized: {result['optimized']}")`,d=`# cURL Example
curl -X POST "${window.location.origin}/functions/v1/sdk-generate-prompt" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: your-api-key-here" \\
  -d '{
    "prompt": "Write a product description",
    "toolType": "text",
    "model": "google/gemini-2.5-flash"
  }'`,m=`// Chrome Extension Integration
// manifest.json
{
  "name": "Prompt Optimizer",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": ["storage"],
  "host_permissions": ["${window.location.origin}/*"],
  "background": {
    "service_worker": "background.js"
  }
}

// background.js
const API_KEY = 'your-api-key-here';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'optimize') {
    fetch('${window.location.origin}/functions/v1/sdk-generate-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        prompt: request.prompt,
        toolType: 'text'
      })
    })
    .then(res => res.json())
    .then(data => sendResponse({ success: true, data }))
    .catch(err => sendResponse({ success: false, error: err.message }));
    
    return true; // Keep message channel open
  }
});`,u=`// Figma Plugin Integration
// code.ts
const API_KEY = 'your-api-key-here';

async function optimizePrompt(prompt: string) {
  const response = await fetch(
    '${window.location.origin}/functions/v1/sdk-generate-prompt',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        prompt: prompt,
        toolType: 'image'
      })
    }
  );
  
  return await response.json();
}

// In your plugin UI
figma.showUI(__html__);

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'optimize-prompt') {
    const result = await optimizePrompt(msg.prompt);
    figma.ui.postMessage({
      type: 'optimization-result',
      data: result
    });
  }
};`;return e.jsx("div",{className:"space-y-6",children:e.jsxs(o,{children:[e.jsxs(t,{children:[e.jsxs(a,{className:"flex items-center gap-2",children:[e.jsx(x,{className:"h-5 w-5"}),"SDK Documentation"]}),e.jsx(f,{children:"Embed our prompt optimization engine into your applications with our simple SDK"})]}),e.jsx(r,{children:e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"grid gap-4 md:grid-cols-3",children:[e.jsxs(o,{children:[e.jsxs(t,{children:[e.jsx(k,{className:"h-6 w-6 mb-2 text-primary"}),e.jsx(a,{className:"text-lg",children:"Easy Integration"})]}),e.jsx(r,{children:e.jsx("p",{className:"text-sm text-muted-foreground",children:"Simple REST API that works with any language or framework"})})]}),e.jsxs(o,{children:[e.jsxs(t,{children:[e.jsx(N,{className:"h-6 w-6 mb-2 text-primary"}),e.jsx(a,{className:"text-lg",children:"Fast & Reliable"})]}),e.jsx(r,{children:e.jsx("p",{className:"text-sm text-muted-foreground",children:"Sub-second response times with 99.9% uptime guarantee"})})]}),e.jsxs(o,{children:[e.jsxs(t,{children:[e.jsx(x,{className:"h-6 w-6 mb-2 text-primary"}),e.jsx(a,{className:"text-lg",children:"Universal"})]}),e.jsx(r,{children:e.jsx("p",{className:"text-sm text-muted-foreground",children:"Works in browsers, extensions, mobile apps, and servers"})})]})]}),e.jsxs(b,{defaultValue:"javascript",className:"w-full",children:[e.jsxs(v,{className:"grid w-full grid-cols-5",children:[e.jsx(n,{value:"javascript",children:"JavaScript"}),e.jsx(n,{value:"python",children:"Python"}),e.jsx(n,{value:"curl",children:"cURL"}),e.jsx(n,{value:"chrome",children:"Chrome Ext"}),e.jsx(n,{value:"figma",children:"Figma"})]}),e.jsx(l,{value:"javascript",className:"space-y-4",children:e.jsxs("div",{className:"relative",children:[e.jsx("pre",{className:"bg-muted p-4 rounded-lg overflow-x-auto text-sm",children:e.jsx("code",{children:p})}),e.jsx(i,{size:"sm",variant:"secondary",className:"absolute top-2 right-2",onClick:()=>s(p),children:"Copy"})]})}),e.jsx(l,{value:"python",className:"space-y-4",children:e.jsxs("div",{className:"relative",children:[e.jsx("pre",{className:"bg-muted p-4 rounded-lg overflow-x-auto text-sm",children:e.jsx("code",{children:c})}),e.jsx(i,{size:"sm",variant:"secondary",className:"absolute top-2 right-2",onClick:()=>s(c),children:"Copy"})]})}),e.jsx(l,{value:"curl",className:"space-y-4",children:e.jsxs("div",{className:"relative",children:[e.jsx("pre",{className:"bg-muted p-4 rounded-lg overflow-x-auto text-sm",children:e.jsx("code",{children:d})}),e.jsx(i,{size:"sm",variant:"secondary",className:"absolute top-2 right-2",onClick:()=>s(d),children:"Copy"})]})}),e.jsx(l,{value:"chrome",className:"space-y-4",children:e.jsxs("div",{className:"relative",children:[e.jsx("pre",{className:"bg-muted p-4 rounded-lg overflow-x-auto text-sm",children:e.jsx("code",{children:m})}),e.jsx(i,{size:"sm",variant:"secondary",className:"absolute top-2 right-2",onClick:()=>s(m),children:"Copy"})]})}),e.jsx(l,{value:"figma",className:"space-y-4",children:e.jsxs("div",{className:"relative",children:[e.jsx("pre",{className:"bg-muted p-4 rounded-lg overflow-x-auto text-sm",children:e.jsx("code",{children:u})}),e.jsx(i,{size:"sm",variant:"secondary",className:"absolute top-2 right-2",onClick:()=>s(u),children:"Copy"})]})})]}),e.jsxs(o,{className:"bg-muted/50",children:[e.jsx(t,{children:e.jsx(a,{className:"text-lg",children:"API Reference"})}),e.jsxs(r,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold mb-2",children:"Endpoint"}),e.jsxs("code",{className:"text-sm bg-background px-2 py-1 rounded",children:["POST ",window.location.origin,"/functions/v1/sdk-generate-prompt"]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold mb-2",children:"Headers"}),e.jsxs("ul",{className:"space-y-1 text-sm",children:[e.jsx("li",{children:e.jsx("code",{className:"bg-background px-2 py-1 rounded",children:"Content-Type: application/json"})}),e.jsx("li",{children:e.jsx("code",{className:"bg-background px-2 py-1 rounded",children:"x-api-key: YOUR_API_KEY"})})]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold mb-2",children:"Request Body"}),e.jsx("pre",{className:"text-sm bg-background p-3 rounded overflow-x-auto",children:`{
  "prompt": "string (required)",
  "toolType": "text|image|code|audio|video (optional, default: text)",
  "model": "string (optional, default: google/gemini-2.5-flash)",
  "temperature": "number (optional, default: 0.7)",
  "maxTokens": "number (optional, default: 500)"
}`})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold mb-2",children:"Response"}),e.jsx("pre",{className:"text-sm bg-background p-3 rounded overflow-x-auto",children:`{
  "success": true,
  "original": "your original prompt",
  "optimized": "the optimized prompt",
  "toolType": "text",
  "model": "google/gemini-2.5-flash",
  "usage": {
    "requests_today": 42,
    "rate_limit": 100
  }
}`})]})]})]})]})})]})})}export{P as S};
