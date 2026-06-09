import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import ILovePDFApi from '@ilovepdf/ilovepdf-nodejs';
import ILovePDFFile from '@ilovepdf/ilovepdf-nodejs/ILovePDFFile.js';

export const handleConvert = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const tempCompress = path.join(process.cwd(), 'temp_compress');
  if (!fs.existsSync(tempCompress)) fs.mkdirSync(tempCompress);

  const inputPath = req.file.path;
  const originalName = req.file.originalname;
  const ext = path.extname(originalName).toLowerCase();
  
  try {
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      // Gambar ke PDF secara lokal
      const outputPath = path.join(tempCompress, `converted_${req.file.filename}.pdf`);
      
      const pdfDoc = await PDFDocument.create();
      // Konversi gambar apapun ke format JPEG agar didukung oleh pdf-lib secara konsisten
      const imageBuffer = await sharp(inputPath).jpeg().toBuffer();
      const image = await pdfDoc.embedJpg(imageBuffer);
      
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
      
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);
      
      res.download(outputPath, `converted_${path.parse(originalName).name}.pdf`, (err) => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      });
      
    } else if (ext === '.pdf') {
      // PDF ke Gambar via iLovePDF
      if (!process.env.ILOVEPDF_PUBLIC_KEY && !process.env.ILOVEPDF_API_KEY) {
        throw new Error("ILovePDF API Key belum dikonfigurasi di file .env");
      }
      
      const pubKey = process.env.ILOVEPDF_PUBLIC_KEY || process.env.ILOVEPDF_API_KEY;
      const secKey = process.env.ILOVEPDF_SECRET_KEY || process.env.ILOVEPDF_API_KEY;
      
      const instance = new ILovePDFApi(pubKey, secKey);
      const task = instance.newTask('pdfjpg');
      
      await task.start();
      const ilovepdfFile = new ILovePDFFile(inputPath);
      ilovepdfFile.filename = originalName;
      await task.addFile(ilovepdfFile);
      
      await task.process({ pdfjpg_mode: 'pages' });
      const data = await task.download();
      
      // Determine if output is ZIP or JPG (if only 1 page)
      const isZip = data.length > 2 && data[0] === 0x50 && data[1] === 0x4B; // 'PK'
      const outputExt = isZip ? '.zip' : '.jpg';
      const outputPath = path.join(tempCompress, `converted_${req.file.filename}${outputExt}`);
      
      fs.writeFileSync(outputPath, data);
      
      res.download(outputPath, `converted_${path.parse(originalName).name}${outputExt}`, (err) => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      });
    } else {
      throw new Error("Format file tidak didukung untuk konversi. Gunakan Gambar atau PDF.");
    }
  } catch (error) {
    console.error("Convert Error Detail:", error);
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    res.status(500).json({ error: `Gagal melakukan konversi: ${error.message}` });
  }
};
