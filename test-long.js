const start = Date.now();
fetch('http://localhost:3002/api/chat-completion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'grok-4-0709',
    messages: [{ role: 'user', content: 'Write a 100 word essay on AI.' }],
    stream: true
  })
}).then(async res => {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let firstChunk = true;
  let charCount = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (firstChunk) {
      console.log("TTFT:", Date.now() - start, "ms");
      firstChunk = false;
    }
    charCount += value.length;
  }
  const total = Date.now() - start;
  console.log("Total Time:", total, "ms");
  console.log("Chars/sec:", (charCount / (total / 1000)).toFixed(2));
});
