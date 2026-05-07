exports.analyze = async (req, res) => {
  try {
    const { context, question } = req.body;
    if (!context || !question) return res.status(400).json({ error: 'Faltan context o question' });

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: context },
          { role: 'user', content: question }
        ],
        max_tokens: 800
      })
    });

    const data = await groqRes.json();
    const answer = data?.choices?.[0]?.message?.content;

    if (!answer) {
      console.error('Groq error:', JSON.stringify(data));
      return res.status(500).json({ error: JSON.stringify(data) });
    }

    res.json({ answer });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
