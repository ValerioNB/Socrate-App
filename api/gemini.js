export default async function handler(req, res) {
  const { prompt, model } = req.body;
  const apiKey = process.env.GEMINI_API_KEY; // salva la chiave su Vercel come env var
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-1.5-flash"}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
  });
  const data = await response.json();
  res.status(200).json(data);
}
