import express from 'express';
import multer from 'multer';
import path from 'path';
import { handleChat } from '../controllers/chatController.js';
import { handleDownload } from '../controllers/downloadController.js';
import { handleCompress } from '../controllers/compressController.js';
import { handleConvert } from '../controllers/convertController.js';
import { handleChatFile } from '../controllers/chatFileController.js';

const router = express.Router();

const tempCompress = path.join(process.cwd(), 'temp_compress');
const upload = multer({ dest: tempCompress, limits: { fileSize: 200 * 1024 * 1024 } });

router.post('/chat', handleChat);
router.post('/download', handleDownload);
router.post('/compress', upload.single('file'), handleCompress);
router.post('/convert', upload.single('file'), handleConvert);
router.post('/chat-file', upload.single('file'), handleChatFile);

export default router;

