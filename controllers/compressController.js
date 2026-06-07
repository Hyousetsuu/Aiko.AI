import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import ILovePDFApi from '@ilovepdf/ilovepdf-nodejs';
import ILovePDFFile from '@ilovepdf/ilovepdf-nodejs/ILovePDFFile.js';

export const handleCompress = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const tempCompress = path.join(process.cwd(), 'temp_compress');
  const downloadsFolder = path.join(process.cwd(), 'downloads');
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
};
