import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Package, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SDKDocumentation() {
  const { toast } = useToast();

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied to clipboard",
      description: "Code snippet copied successfully",
    });
  };

  const jsExample = `// Install via npm (conceptual - copy this SDK code to your project)
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

main();`;

  const pythonExample = `# Python SDK Example
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
print(f"Optimized: {result['optimized']}")`;

  const curlExample = `# cURL Example
curl -X POST "${window.location.origin}/functions/v1/sdk-generate-prompt" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: your-api-key-here" \\
  -d '{
    "prompt": "Write a product description",
    "toolType": "text",
    "model": "google/gemini-2.5-flash"
  }'`;

  const chromeExtExample = `// Chrome Extension Integration
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
});`;

  const figmaExample = `// Figma Plugin Integration
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
};`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            SDK Documentation
          </CardTitle>
          <CardDescription>
            Embed our prompt optimization engine into your applications with our simple SDK
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <Code className="h-6 w-6 mb-2 text-primary" />
                  <CardTitle className="text-lg">Easy Integration</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Simple REST API that works with any language or framework
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Zap className="h-6 w-6 mb-2 text-primary" />
                  <CardTitle className="text-lg">Fast & Reliable</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Sub-second response times with 99.9% uptime guarantee
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Package className="h-6 w-6 mb-2 text-primary" />
                  <CardTitle className="text-lg">Universal</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Works in browsers, extensions, mobile apps, and servers
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="javascript" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="chrome">Chrome Ext</TabsTrigger>
                <TabsTrigger value="figma">Figma</TabsTrigger>
              </TabsList>

              <TabsContent value="javascript" className="space-y-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{jsExample}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => copyCode(jsExample)}
                  >
                    Copy
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="python" className="space-y-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{pythonExample}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => copyCode(pythonExample)}
                  >
                    Copy
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="curl" className="space-y-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{curlExample}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => copyCode(curlExample)}
                  >
                    Copy
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="chrome" className="space-y-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{chromeExtExample}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => copyCode(chromeExtExample)}
                  >
                    Copy
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="figma" className="space-y-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{figmaExample}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => copyCode(figmaExample)}
                  >
                    Copy
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">API Reference</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Endpoint</h4>
                  <code className="text-sm bg-background px-2 py-1 rounded">
                    POST {window.location.origin}/functions/v1/sdk-generate-prompt
                  </code>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Headers</h4>
                  <ul className="space-y-1 text-sm">
                    <li><code className="bg-background px-2 py-1 rounded">Content-Type: application/json</code></li>
                    <li><code className="bg-background px-2 py-1 rounded">x-api-key: YOUR_API_KEY</code></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Request Body</h4>
                  <pre className="text-sm bg-background p-3 rounded overflow-x-auto">
{`{
  "prompt": "string (required)",
  "toolType": "text|image|code|audio|video (optional, default: text)",
  "model": "string (optional, default: google/gemini-2.5-flash)",
  "temperature": "number (optional, default: 0.7)",
  "maxTokens": "number (optional, default: 500)"
}`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Response</h4>
                  <pre className="text-sm bg-background p-3 rounded overflow-x-auto">
{`{
  "success": true,
  "original": "your original prompt",
  "optimized": "the optimized prompt",
  "toolType": "text",
  "model": "google/gemini-2.5-flash",
  "usage": {
    "requests_today": 42,
    "rate_limit": 100
  }
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
