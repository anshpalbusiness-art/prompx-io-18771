const streamTest = async () => {
  try {
    const res = await fetch('http://localhost:3002/api/chat-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [{ role: 'user', content: 'Say hello world' }],
        stream: true
      })
    });

    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("STREAM DONE");
        break;
      }
      console.log("CHUNK:", JSON.stringify(decoder.decode(value)));
    }
  } catch (e) {
    console.error("Error:", e);
  }
};
streamTest();
