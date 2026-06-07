import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import youtubedl from 'youtube-dl-exec';
import axios from 'axios';
import ig from 'instagram-url-direct';
const { instagramGetUrl } = ig;
import { ZipArchive } from 'archiver';
import ILovePDFApi from '@ilovepdf/ilovepdf-nodejs';
import ILovePDFFile from '@ilovepdf/ilovepdf-nodejs/ILovePDFFile.js';

dotenv.config();

const app = express();
app.use(cors({ exposedHeaders: ['Content-Disposition'] }));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const parser = new Parser();

// --- Setup Folders & Multer ---
const tempCompress = path.join(process.cwd(), 'temp_compress');
const downloadsFolder = path.join(process.cwd(), 'downloads');
if (!fs.existsSync(tempCompress)) fs.mkdirSync(tempCompress);
if (!fs.existsSync(downloadsFolder)) fs.mkdirSync(downloadsFolder);

const upload = multer({ dest: tempCompress, limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB limit

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

    // 0. Check Download Intent (URL)
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be|instagram\.com|tiktok\.com|twitter\.com|x\.com)[^\s]+/i;
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
});

// --- Downloader Endpoint ---
app.post('/api/download', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  const timestamp = Date.now();
  try {
    const outputTemplate = path.join(downloadsFolder, `${timestamp}_%(title)s.%(ext)s`);
    
    const options = {
      output: outputTemplate,
      noCheckCertificates: true,
      noWarnings: true,
      addHeader: ['referer:youtube.com']
    };

    if (url.includes('instagram.com')) {
      if (process.env.INSTAGRAM_USER && process.env.INSTAGRAM_PASS) {
        options.username = process.env.INSTAGRAM_USER;
        options.password = process.env.INSTAGRAM_PASS;
      }
    }

    const cookiesPath = path.join(process.cwd(), 'cookies.txt');
    if (fs.existsSync(cookiesPath)) {
      options.cookies = cookiesPath;
    }

    await youtubedl(url, options);

    const files = fs.readdirSync(downloadsFolder).filter(f => f.startsWith(timestamp.toString()) && !f.endsWith('.zip'));
    if (files.length === 0) throw new Error("File tidak ditemukan setelah proses pengunduhan.");

    if (files.length === 1) {
      const downloadedFile = path.join(downloadsFolder, files[0]);
      return res.download(downloadedFile, files[0], (err) => {
        if (fs.existsSync(downloadedFile)) fs.unlinkSync(downloadedFile);
      });
    } else {
      const zipPath = path.join(downloadsFolder, `${timestamp}_instagram_carousel.zip`);
      const output = fs.createWriteStream(zipPath);
      const archive = new ZipArchive({ zlib: { level: 9 } });
      
      archive.pipe(output);
      
      for (let i = 0; i < files.length; i++) {
        const filePath = path.join(downloadsFolder, files[i]);
        archive.file(filePath, { name: files[i] });
      }
      
      await archive.finalize();
      await new Promise(resolve => output.on('close', resolve));
      
      return res.download(zipPath, `media_carousel.zip`, () => {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        files.forEach(f => {
          const fp = path.join(downloadsFolder, f);
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        });
      });
    }
  } catch (error) {
    console.log("yt-dlp failed, initiating fallback:", error.message);
    
    if (url.includes('instagram.com')) {
      try {
        const igRes = await instagramGetUrl(url);
        if (igRes && igRes.url_list && igRes.url_list.length > 0) {
          const isCarousel = igRes.url_list.length > 1;
          
          if (isCarousel) {
            const zipPath = path.join(downloadsFolder, `${timestamp}_instagram_carousel.zip`);
            const output = fs.createWriteStream(zipPath);
            const archive = new ZipArchive({ zlib: { level: 9 } });
            archive.pipe(output);
            
            for (let i = 0; i < igRes.url_list.length; i++) {
              const mediaUrl = igRes.url_list[i];
              const mediaRes = await axios({ method: 'GET', url: mediaUrl, responseType: 'stream' });
              
              let ext = '.mp4';
              const match = mediaUrl.match(/\.([a-z0-9]+)(?:\?|$)/i);
              if (match) {
                ext = `.${match[1].toLowerCase()}`;
              } else if (igRes.media_details && igRes.media_details[i]) {
                ext = igRes.media_details[i].type === 'image' ? '.jpg' : '.mp4';
              }
              
              archive.append(mediaRes.data, { name: `slide_${i + 1}${ext}` });
            }
            
            await archive.finalize();
            await new Promise(resolve => output.on('close', resolve));
            
            return res.download(zipPath, `instagram_carousel.zip`, () => {
              if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            });
          } else {
            const mediaUrl = igRes.url_list[0];
            const mediaRes = await axios({ method: 'GET', url: mediaUrl, responseType: 'stream' });
            
            let ext = '.mp4';
            const match = mediaUrl.match(/\.([a-z0-9]+)(?:\?|$)/i);
            if (match) {
              ext = `.${match[1].toLowerCase()}`;
            } else if (igRes.media_details && igRes.media_details[0]) {
              ext = igRes.media_details[0].type === 'image' ? '.jpg' : '.mp4';
            }
            
            const singleFilePath = path.join(downloadsFolder, `${timestamp}_ig_media${ext}`);
            
            const writer = fs.createWriteStream(singleFilePath);
            mediaRes.data.pipe(writer);
            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });
            
            return res.download(singleFilePath, `ig_media${ext}`, () => {
              if (fs.existsSync(singleFilePath)) fs.unlinkSync(singleFilePath);
            });
          }
        } else {
          throw new Error("Gagal mengambil media Instagram.");
        }
      } catch (igError) {
        console.error("IG Scraper Fallback Error:", igError.message);
        return res.status(500).json({ error: "Gagal mengunduh media dari tautan IG tersebut (yt-dlp & fallback gagal)." });
      }
    } else if (url.includes('tiktok.com')) {
      try {
        const tikwmRes = await axios.post('https://www.tikwm.com/api/', { url: url }, {
          headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json'}
        });
        const data = tikwmRes.data.data;
        if (!data) throw new Error("TikTok data not found via TikWM");

        if (data.images && data.images.length > 0) {
          const isCarousel = data.images.length > 1;
          if (isCarousel) {
            const zipPath = path.join(downloadsFolder, `${timestamp}_tiktok_carousel.zip`);
            const output = fs.createWriteStream(zipPath);
            const archive = new ZipArchive({ zlib: { level: 9 } });
            archive.pipe(output);
            
            for (let i = 0; i < data.images.length; i++) {
              const mediaUrl = data.images[i];
              const mediaRes = await axios({ method: 'GET', url: mediaUrl, responseType: 'stream' });
              
              let ext = '.jpg';
              const match = mediaUrl.match(/\.([a-z0-9]+)(?:\?|$)/i);
              if (match) {
                ext = `.${match[1].toLowerCase()}`;
              }
              archive.append(mediaRes.data, { name: `slide_${i + 1}${ext}` });
            }
            
            await archive.finalize();
            await new Promise(resolve => output.on('close', resolve));
            
            return res.download(zipPath, `tiktok_carousel.zip`, () => {
              if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            });
          } else {
            const mediaUrl = data.images[0];
            const mediaRes = await axios({ method: 'GET', url: mediaUrl, responseType: 'stream' });
            
            let ext = '.jpg';
            const match = mediaUrl.match(/\.([a-z0-9]+)(?:\?|$)/i);
            if (match) {
              ext = `.${match[1].toLowerCase()}`;
            }
            
            const singleFilePath = path.join(downloadsFolder, `${timestamp}_tiktok_media${ext}`);
            const writer = fs.createWriteStream(singleFilePath);
            mediaRes.data.pipe(writer);
            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });
            
            return res.download(singleFilePath, `tiktok_media${ext}`, () => {
              if (fs.existsSync(singleFilePath)) fs.unlinkSync(singleFilePath);
            });
          }
        } else if (data.play) {
            const mediaUrl = data.play;
            const mediaRes = await axios({ method: 'GET', url: mediaUrl, responseType: 'stream' });
            const ext = '.mp4';
            const singleFilePath = path.join(downloadsFolder, `${timestamp}_tiktok_media${ext}`);
            const writer = fs.createWriteStream(singleFilePath);
            mediaRes.data.pipe(writer);
            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });
            return res.download(singleFilePath, `tiktok_media${ext}`, () => {
              if (fs.existsSync(singleFilePath)) fs.unlinkSync(singleFilePath);
            });
        } else {
            throw new Error("Gagal mengambil media TikTok.");
        }
      } catch (ttError) {
        console.error("TikTok Fallback Error:", ttError.message);
        return res.status(500).json({ error: "Gagal mengunduh media dari tautan TikTok tersebut." });
      }
    } else {
      return res.status(500).json({ error: "Gagal mengunduh media dari tautan tersebut." });
    }
  }
});

// --- Compressor Endpoint ---
app.post('/api/compress', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  if (!fs.existsSync(tempCompress)) fs.mkdirSync(tempCompress);
  if (!fs.existsSync(downloadsFolder)) fs.mkdirSync(downloadsFolder);

  const inputPath = req.file.path;
  const originalName = req.file.originalname;
  const ext = path.extname(originalName).toLowerCase();
  const outputPath = path.join(tempCompress, `compressed_${req.file.filename}${ext}`);
  const quality = parseInt(req.body.quality) || 50;

  try {
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      const forcedOutputPath = path.join(tempCompress, `compressed_${req.file.filename}.jpg`);
      await sharp(inputPath).jpeg({ quality: quality, mozjpeg: true }).toFile(forcedOutputPath);
      
      res.download(forcedOutputPath, `compressed_${path.parse(originalName).name}.jpg`, (err) => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(forcedOutputPath)) fs.unlinkSync(forcedOutputPath);
      });
    } else if (ext === '.pdf') {
      if (!process.env.ILOVEPDF_PUBLIC_KEY && !process.env.ILOVEPDF_API_KEY) {
        throw new Error("ILovePDF API Key belum dikonfigurasi di file .env");
      }
      
      // Jika pengguna hanya memiliki ILOVEPDF_API_KEY, coba gunakan itu sebagai public key (terkadang berhasil, atau fallback ke public key)
      const pubKey = process.env.ILOVEPDF_PUBLIC_KEY || process.env.ILOVEPDF_API_KEY;
      const secKey = process.env.ILOVEPDF_SECRET_KEY || process.env.ILOVEPDF_API_KEY;
      
      const instance = new ILovePDFApi(pubKey, secKey);
      const task = instance.newTask('compress');
      
      await task.start();
      const ilovepdfFile = new ILovePDFFile(inputPath);
      ilovepdfFile.filename = originalName;
      await task.addFile(ilovepdfFile);
      
      let compressionLevel = 'recommended';
      if (quality < 30) compressionLevel = 'extreme';
      else if (quality > 70) compressionLevel = 'low';
      
      await task.process({ compression_level: compressionLevel });
      const data = await task.download();
      
      fs.writeFileSync(outputPath, data);
      
      res.download(outputPath, `compressed_${originalName}`, (err) => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      });
    } else {
      throw new Error("Format file tidak didukung untuk kompresi.");
    }
  } catch (error) {
    console.error(error);
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    res.status(500).json({ error: `Gagal mengompres: ${error.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
