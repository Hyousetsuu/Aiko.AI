import fs from 'fs';
import path from 'path';
import axios from 'axios';
import youtubedl from 'youtube-dl-exec';
import { ZipArchive } from 'archiver';
import ig from 'instagram-url-direct';
const { instagramGetUrl } = ig;
import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

const downloadsFolder = path.join(process.cwd(), 'downloads');

export const handleDownload = async (req, res) => {
  let { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  if (url.includes('/share/') || url.includes('fb.watch')) {
    try {
      const resHtml = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
      const html = resHtml.data;
      const metaMatch = html.match(/content="0;?\s*URL=([^"]+)"/i);
      if (metaMatch) {
        url = metaMatch[1].replace(/&amp;/g, '&');
      } else {
        const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
        if (canonicalMatch) url = canonicalMatch[1].replace(/&amp;/g, '&');
      }
    } catch (e) {
      console.log('Clean URL error:', e.message);
    }
  }

  const timestamp = Date.now();
  try {
    const outputTemplate = path.join(downloadsFolder, `${timestamp}_%(title)s.%(ext)s`);
    
    const options = {
      output: outputTemplate,
      noCheckCertificates: true,
      noWarnings: true
    };
    
    const isTwitter = url.includes('twitter.com') || url.includes('x.com');
    if (!isTwitter) {
      options.addHeader = ['referer:youtube.com'];
    }

    if (url.includes('instagram.com')) {
      if (process.env.INSTAGRAM_USER && process.env.INSTAGRAM_PASS) {
        options.username = process.env.INSTAGRAM_USER;
        options.password = process.env.INSTAGRAM_PASS;
      }
    }

    const cookiesPath = path.join(process.cwd(), 'cookies.txt');
    if (!isTwitter && fs.existsSync(cookiesPath)) {
      options.cookies = cookiesPath;
    }

    const isFb = url.includes('facebook.com') || url.includes('fb.watch');
    const isDoubleAgent = isTwitter || isFb;

    if (isDoubleAgent) {
      const galleryDlPath = 'd:\\Coding\\React\\Chatbot\\telegram-bot\\.venv\\Scripts\\gallery-dl.exe';
      let galleryCmd = `"${galleryDlPath}" -D "${downloadsFolder}" -f "${timestamp}_img_{num}.{extension}"`;
      if (fs.existsSync(cookiesPath)) {
        galleryCmd += ` -C "${cookiesPath}"`;
      }
      galleryCmd += ` "${url}"`;
      const tasks = [];
      
      // 1. Download Video (yt-dlp)
      tasks.push(youtubedl(url, options).catch(e => console.log('yt-dlp skipped video/failed:', e.message)));
      
      // 2. Download Photos (gallery-dl)
      const isFbVideoOnly = isFb && !url.toLowerCase().match(/(\/p\/|\/posts\/|photo)/);
      if (fs.existsSync(galleryDlPath) && !isFbVideoOnly) {
        tasks.push(execPromise(galleryCmd).catch(e => console.log('gallery-dl skipped photo/failed:', e.message)));
      }
      
      await Promise.all(tasks);
    } else {
      await youtubedl(url, options);
    }

    const files = fs.readdirSync(downloadsFolder).filter(f => f.startsWith(timestamp.toString()) && !f.endsWith('.zip'));
    if (files.length === 0) throw new Error("File tidak ditemukan setelah proses pengunduhan.");

    if (files.length === 1) {
      const downloadedFile = path.join(downloadsFolder, files[0]);
      return res.download(downloadedFile, files[0], (err) => {
        if (fs.existsSync(downloadedFile)) fs.unlinkSync(downloadedFile);
      });
    } else {
      const zipPath = path.join(downloadsFolder, `${timestamp}_media_carousel.zip`);
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
};
