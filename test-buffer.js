const testBuffer = () => {
    const chunks = [
        `data: {"choices":[{"delta":{"content":"##"}}]}\n\n`,
        `data: {"choices":[{"delta":{"content":" Learning"}}]}\n\n`,
        `data: {"choices":[{"delta":{"content":" Python"}}]}\n\n`,
        `data: [DONE]\n\n`
    ];

    let buffer = "";
    let fullContent = "";

    for (const chunk of chunks) {
        buffer += chunk;

        let newlineIdx;
        while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIdx).trim();
            buffer = buffer.slice(newlineIdx + 1);

            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                    const data = JSON.parse(line.slice(6));
                    if (data.choices?.[0]?.delta?.content) {
                        fullContent += data.choices[0].delta.content;
                    }
                } catch (e) {
                    console.error("Parse Error on line:", line);
                }
            }
        }
    }

    console.log("Result:", fullContent);
};
testBuffer();
