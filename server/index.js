// Optional secure backend: keeps provider API keys server-side.
// Deploy this folder (Render/Railway/Fly/Vercel serverless) and paste its URL in app Settings.
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'messages[] required' });
    const r = await fetch(process.env.AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.AI_API_KEY}` },
      body: JSON.stringify({ model: process.env.AI_MODEL || 'gpt-4o-mini', messages, temperature: 0.6 }),
      signal: AbortSignal.timeout(25000)
    });
    if (!r.ok) return res.status(502).json({ error: 'provider error ' + r.status });
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) return res.status(502).json({ error: 'bad provider response' });
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: 'AI service failed: ' + e.message });
  }
});

app.get('/health', (_, res) => res.json({ ok: true }));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log('AI backend on :' + port));
