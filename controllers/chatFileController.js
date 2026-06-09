import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { model, getLocalTimeStr } from '../services/geminiService.js';

export const handleChatFile = async (req, res) => {
  try {
    const message = req.body.message || "Tolong rangkum isi dokumen ini.";
    if (!req.file) return res.status(400).json({ error: "File is required" });

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const ext = originalName.split('.').pop().toLowerCase();

    let extractedText = "";

    if (ext === 'pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const data = await parser.getText();
      extractedText = data.text;
      await parser.destroy();
    } else if (['txt', 'md', 'csv', 'json'].includes(ext)) {
      extractedText = fs.readFileSync(filePath, 'utf-8');
    } else {
      throw new Error("Format file tidak didukung untuk dibaca AI. Gunakan format PDF, TXT, MD, CSV, atau JSON.");
    }

    // Delete temp file after extraction
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    if (!extractedText.trim()) {
        throw new Error("Tidak dapat mengekstrak teks dari dokumen (Mungkin dokumen hasil scan atau kosong).");
    }

    // Safely limit the text to ~150k characters to prevent any unlikely token explosion
    if (extractedText.length > 150000) {
        extractedText = extractedText.substring(0, 150000) + "\n\n[... Teks dipotong karena terlalu panjang ...]";
    }

    const timeStr = getLocalTimeStr();
    const prompt = `[Waktu: ${timeStr}]\nUser mengirimkan file bernama "${originalName}" dengan isi sebagai berikut:\n\n"""\n${extractedText}\n"""\n\nInstruksi User: ${message}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return res.json({ type: "text", text: response.text() });
  } catch (error) {
    console.error("Chat File Error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ type: "text", text: `⚠️ Gagal membaca dokumen: ${error.message}` });
  }
};
