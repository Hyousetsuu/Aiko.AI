# 🤖 Aiko AI - Smart Assistant Chatbot

Aiko adalah asisten *chatbot* berbasis kecerdasan buatan (Google Gemini) yang cerdas, interaktif, dan dilengkapi dengan banyak kemampuan layaknya agen multi-fungsi. Proyek ini memadukan antarmuka *frontend* modern (React + Vite) dengan *backend* yang kuat dan modular (Node.js + Express).

## ✨ Fitur Utama (Current Features)

Aiko bukan sekadar bot *chat* biasa. Dia dilengkapi dengan kemampuan *"Double Agent"* dan API terintegrasi untuk menangani tugas-tugas kompleks:

1. **💬 Chat Kecerdasan Buatan (AI Assistant)**
   - Terintegrasi dengan **Google Gemini (3.1-flash-lite)**.
   - Bisa diajak ngobrol santai, ditanya fakta sejarah, coding, hingga resep masakan.
   
2. **📥 Multi-Platform Media Downloader**
   - Mendukung pengunduhan Video, Reels, Foto, dan Carousel dari berbagai platform:
     - **YouTube**
     - **TikTok**
     - **Instagram**
     - **Twitter (X)**
     - **Facebook**
   - Menggunakan sistem **Double Agent** (`yt-dlp` untuk video & `gallery-dl` untuk foto/carousel) secara bersamaan!
   - Bisa *bypass* link `/share/` yang diblokir, meng-otomatisasi *login cookies* untuk keamanan *download*.

3. **🌤️ Info Cuaca Real-time (Weather Fetcher)**
   - Integrasi API **OpenWeather**.
   - Cukup ketik "Cuaca di [Nama Kota]", Aiko akan memberikan data cuaca lengkap hari ini beserta ramalan suhu besok.

4. **📰 Agregator Berita Terkini (News Fetcher)**
   - Integrasi API **Google News RSS**.
   - Minta berita dengan topik apa saja (misal: "Berita 3 teknologi terbaru"), Aiko akan mencarikan artikel beserta tautan resminya.

5. **🗜️ Utilitas File (Compressor & Converter)**
   - **Image Compressor**: Kompres ukuran file gambar (JPG/PNG/WEBP).
   - **PDF Compressor**: Integrasi iLovePDF API untuk memperkecil ukuran file PDF.
   
## 🏗️ Arsitektur Proyek (MVC Pattern)

Baru saja direfaktor! Backend Aiko kini menggunakan arsitektur **MVC (Model-View-Controller)** yang sangat bersih dan mudah dikembangkan:

```text
Chatbot/
├── controllers/          # Mengatur logika utama rute (Chat, Download, Compress)
├── services/             # Otak utama penarik API (Weather, News, Gemini)
├── routes/               # Penjaga gerbang API Express (Router)
├── downloads/            # Folder transit sementara media
├── temp_compress/        # Folder transit sementara kompresi
├── src/                  # (Frontend) React UI & Components
└── server.js             # Entry-point Node.js Server
```

## 🚀 Cara Menjalankan Secara Lokal

1. **Install Dependencies**
   ```bash
   npm install
   ```
2. **Jalankan Backend Server** (Port 5000)
   ```bash
   npm run server
   ```
3. **Jalankan Frontend React**
   ```bash
   npm run dev
   ```
