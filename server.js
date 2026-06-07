import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import apiRoutes from './routes/index.js';

dotenv.config();

const app = express();
app.use(cors({ exposedHeaders: ['Content-Disposition'] }));
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Setup Folders
const tempCompress = path.join(process.cwd(), 'temp_compress');
const downloadsFolder = path.join(process.cwd(), 'downloads');
if (!fs.existsSync(tempCompress)) fs.mkdirSync(tempCompress);
if (!fs.existsSync(downloadsFolder)) fs.mkdirSync(downloadsFolder);

app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
