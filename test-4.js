const start = Date.now();
fetch('http://localhost:3002/api/chat-completion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'grok-4-0709',
    messages: [{ role: 'user', content: 'Say hello world' }],
    stream: true
  })
}).then(async res => {
  console.log("TTFB:", Date.now() - start, "ms");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let firstChunk = true;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (firstChunk) {
      console.log("TTFT:", Date.now() - start, "ms");
      firstChunk = false;
    }
  }
  console.log("Total Time:", Date.now() - start, "ms");
});
