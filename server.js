import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `
Kamu adalah asisten bot yang cerdas, serba bisa, dan sangat membantu.
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
  
  const dayName = days[d.getDay()];
  const day = String(d.getDate()).padStart(2, '0');
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  
  return `${dayName}, ${day} ${monthName} ${year}, Jam ${hour}:${minute} WIB`;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const timeStr = getLocalTimeStr();
    const prompt = `[Waktu: ${timeStr}]\nUser: ${message}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ reply: "🤖 Maaf, sistem AI sedang sibuk.", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
