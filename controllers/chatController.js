import { extractCity, getWeather } from '../services/weatherService.js';
import { extractNewsParams, getNews } from '../services/newsService.js';
import { model, getLocalTimeStr } from '../services/geminiService.js';

export const handleChat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    // 0. Check Download Intent (URL)
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be|instagram\.com|tiktok\.com|twitter\.com|x\.com|facebook\.com|fb\.watch)[^\s]+/i;
    const urlMatch = message.match(urlRegex);
    if (urlMatch) {
      let url = urlMatch[0];
      if (!url.startsWith('http')) url = 'https://' + url;
      return res.json({ type: "download_ready", data: { url } });
    }

    const textLower = message.toLowerCase();

    // 1. Check Weather Intent
    if (textLower.includes("cuaca")) {
        const city = extractCity(textLower);
        try {
            const data = await getWeather(city);
            return res.json({ type: "weather", data });
        } catch (e) {
            return res.json({ type: "text", text: `⚠️ Gagal mengambil data cuaca: ${e.message}` });
        }
    }

    // 2. Check News Intent
    if (textLower.includes("berita")) {
        const { topic, count } = extractNewsParams(textLower);
        try {
            const data = await getNews(topic, count);
            return res.json({ type: "news", data });
        } catch (e) {
            return res.json({ type: "text", text: `⚠️ Gagal mengambil berita: ${e.message}` });
        }
    }

    // 3. Fallback to Gemini
    const timeStr = getLocalTimeStr();
    const prompt = `[Waktu: ${timeStr}]\nUser: ${message}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return res.json({ type: "text", text: response.text() });

  } catch (error) {
    console.error("Handler Error:", error);
    res.status(500).json({ type: "text", text: "🤖 Maaf, sistem AI sedang sibuk atau terjadi kesalahan." });
  }
};
