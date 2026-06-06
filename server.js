import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Parser from 'rss-parser';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const parser = new Parser();

const SYSTEM_PROMPT = `
Namamu adalah Aiko, Kamu adalah asisten bot yang cerdas, serba bisa, dan sangat membantu.
Kamu memiliki DUA peran:

1.  **AI PENGETAHUAN UMUM:** Kamu bisa menjawab pertanyaan apa saja (seperti Gemini). Ini termasuk sejarah, fakta unik, resep, kode, terjemahan, dll.
2.  **OPERATOR FITUR BOT:** Kamu juga terhubung dengan fitur-fitur bot berikut:
    - Downloader (YouTube, TikTok, IG)
    - Kompresor (Gambar/PDF)
    - Konverter (Gambar <-> PDF)
    - Info (Berita & Cuaca)

PANDUAN MENJAWAB:
-   **JIKA** pertanyaan adalah tentang pengetahuan umum (Contoh: "fun fact surakarta", "ibu kota prancis?", "cara masak nasi"), **JAWAB LANGSUNG** menggunakan pengetahuan AI-mu.
-   **JIKA** user bertanya soal fitur (Contoh: "bisa kompres?"), JAWAB dengan instruksi (Contoh: "Bisa! Kirim aja filenya, nanti aku kasih pilihan.").
-   **JANGAN PERNAH** bilang "Saya tidak punya database" atau "Saya tidak bisa" untuk pertanyaan pengetahuan umum. Kamu adalah AI, kamu pasti tahu.
`;

const model = genAI.getGenerativeModel({
  model: "gemini-3.1-flash-lite",
  systemInstruction: SYSTEM_PROMPT
});

function getLocalTimeStr() {
  const d = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}, Jam ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`;
}

// --- Weather Extractor & API ---
function extractCity(text) {
    const textLower = text.toLowerCase();
    const matchDi = textLower.match(/cuaca(?:[\w\s]+)?\bdi\s+([a-zA-Z\s]+)/);
    if (matchDi) {
        return matchDi[1].trim().replace("hari ini", "").replace("besok", "").trim() || "Jakarta";
    }
    const matchLangsung = textLower.match(/cuaca\s+(?!di\b)([a-zA-Z\s]+)/);
    if (matchLangsung) {
        const city = matchLangsung[1].trim().replace("hari ini", "").replace("besok", "").trim();
        return city ? city : "Jakarta";
    }
    return "Jakarta";
}

async function getWeather(city) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) throw new Error("OPENWEATHER_API_KEY belum dikonfigurasi di file .env");
    
    const currentRes = await fetch(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=id`);
    const currentData = await currentRes.json();
    
    if (currentData.cod != 200) {
        throw new Error(currentData.message || "Kota tidak ditemukan");
    }

    const forecastRes = await fetch(`http://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric&lang=id`);
    const forecastData = await forecastRes.json();
    
    let tomorrowForecast = null;
    if (forecastData.cod == "200") {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const tomorrowStr = d.toISOString().split('T')[0];
        
        let temps = [];
        let conditions = {};
        for (let item of forecastData.list) {
            if (item.dt_txt.includes(tomorrowStr)) {
                temps.push(item.main.temp);
                const cond = item.weather[0].description;
                conditions[cond] = (conditions[cond] || 0) + 1;
            }
        }
        
        if (temps.length > 0) {
            const minTemp = Math.min(...temps).toFixed(1);
            const maxTemp = Math.max(...temps).toFixed(1);
            const mostCommonCondition = Object.keys(conditions).reduce((a, b) => conditions[a] > conditions[b] ? a : b);
            tomorrowForecast = {
                date: tomorrowStr,
                minTemp,
                maxTemp,
                condition: mostCommonCondition
            };
        }
    }

    return {
        city: currentData.name,
        temp: currentData.main.temp,
        feels_like: currentData.main.feels_like,
        condition: currentData.weather[0].description,
        icon: currentData.weather[0].icon,
        humidity: currentData.main.humidity,
        wind_speed: currentData.wind.speed,
        tomorrow: tomorrowForecast
    };
}

// --- News Extractor & API ---
function extractNewsParams(text) {
    const countMatch = text.match(/\b(\d+)\s*(?:berita|artikel|kabar)?\b/i);
    let count = countMatch ? parseInt(countMatch[1]) : 5;
    count = Math.max(1, Math.min(count, 10));

    let rawTopicMatch = text.match(/berita\s+(.*)/i);
    let rawTopic = rawTopicMatch ? rawTopicMatch[1].toLowerCase() : "";
    rawTopic = rawTopic.replace(/\b\d+\b/g, '').replace(/[^\w\s]/g, '');
    
    const stopWords = ["tentang", "topik", "terkini", "hari ini", "di ", "yang", "minta", "berikan"];
    for (let word of stopWords) {
        rawTopic = rawTopic.replace(new RegExp(`\\b${word}\\b`, 'gi'), " ");
    }
    
    rawTopic = rawTopic.split(/\s+/).filter(Boolean).join(" ");
    return { topic: rawTopic || "indonesia", count };
}

async function getNews(topic, count) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=id&gl=ID&ceid=ID:id`;
    const feed = await parser.parseURL(url);
    
    const newsList = feed.items.slice(0, count).map(item => {
        const titleParts = item.title.split(' - ');
        const source = titleParts.length > 1 ? titleParts.pop() : 'Google News';
        const title = titleParts.join(' - ');
        return {
            title,
            source,
            link: item.link,
            published: item.pubDate
        };
    });
    
    return {
        topic: topic || "Terkini",
        articles: newsList
    };
}

// --- API Endpoint ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

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
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
