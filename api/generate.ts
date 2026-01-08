
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { prompt } = req.body;

  try {
    const r = await fetch(
      "https://qwen3-4b-f16-5fjw.onrender.com/generate",
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
}
