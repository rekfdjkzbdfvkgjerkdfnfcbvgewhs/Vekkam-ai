
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

// Proxy for Qwen Generation
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const r = await fetch(
      "https://qwen-placeholder.onrender.com/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      }
    );

    if (!r.ok) {
      const text = await r.text();
      return res.status(500).json({ error: text });
    }

    const data = await r.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Uptime Cron Ping
app.all('/api/cron/ping', async (req, res) => {
  console.log("Triggering uptime ping for Render backend...");
  try {
    const renderUrl = "https://qwen-placeholder.onrender.com/generate";
    const response = await fetch(renderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "ping" }) 
    });

    const status = response.status;
    res.status(200).json({ 
      success: true, 
      message: "Ping successful", 
      backendStatus: status 
    });
  } catch (error) {
    console.error("Failed to ping Render backend:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Standard Vercel health check or webhook example as requested
app.post("/api/webhook", (req, res) => {
  console.log("Webhook hit:", req.body);
  res.json({ ok: true });
});

// Vercel handles the export automatically for functions in /api
export default app;

// For local development
if (process.env.NODE_ENV !== 'production' && import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
