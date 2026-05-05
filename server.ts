import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createRequire } from 'module';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
const cloudinaryReady = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (!cloudinaryReady) {
  console.warn('⚠️ Cloudinary keys are not fully configured. Uploads will fail.');
}

// Cloudinary cloud names are technically case-insensitive in their dashboard
// but the SDK requires the technical ID which is always lowercase.
const rawCloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
const cloudName = rawCloudName.toLowerCase(); 
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

if (cloudinaryReady) {
  console.log('[Cloudinary Config] Informasi Konfigurasi:');
  console.log(`- Nama Input: "${rawCloudName}"`);
  console.log(`- Cloud Name Berjalan: "${cloudName}" (Otomatis Lowercase)`);
  console.log(`- API Key: "${apiKey ? apiKey.substring(0, 4) + '...' : 'KOSONG'}"`);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true
});

const require = createRequire(import.meta.url);
const utils = require('y-websocket/bin/utils');
const setupWSConnection = utils.setupWSConnection;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Debug middleware to log ALL API requests
  app.use('/api', (req, res, next) => {
    console.log(`[API Request] ${req.method} ${req.path}`);
    next();
  });

  // Cloudinary Upload Endpoint
  app.post('/api/upload', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File terlalu besar (Maksimal 50MB).', status: 'error' });
        }
        return res.status(400).json({ error: `Kesalahan Upload: ${err.message}`, status: 'error' });
      } else if (err) {
        return res.status(500).json({ error: `Terjadi kesalahan sistem: ${err.message}`, status: 'error' });
      }
      next();
    });
  }, async (req: any, res: any) => {
    try {
      if (!cloudinaryReady) {
        throw new Error('Cloudinary keys belum lengkap di Settings. Masukkan Cloud Name, API Key, dan API Secret.');
      }
      if (!cloudName || !apiKey || !apiSecret) {
        throw new Error(`Konfigurasi Cloudinary tidak lengkap. (Pesan teknis: Pastikan CLOUDINARY_CLOUD_NAME, API_KEY, dan API_SECRET sudah benar di Settings)`);
      }
      if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah', status: 'error' });

      const file = req.file;
      console.log(`[Cloudinary] Mencoba upload: ${file.originalname} ke cloud: "${cloudName}"`);
      
      // Upload to Cloudinary using a buffer
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            folder: 'intersolid_memories',
            public_id: uuidv4(),
          },
          (error, result) => {
            if (error) {
              console.error('[Cloudinary] SDK Error Detail:', error);
              let msg = error.message;
              if (error.message.includes('Invalid cloud_name')) {
                msg = `Cloud Name "${cloudName}" tidak terdaftar. Periksa Dashboard Cloudinary Anda (Dashboard > Product Environment Settings > Cloud name). Nama ini biasanya huruf kecil semua.`;
              } else if (error.message.includes('Invalid API key')) {
                msg = `API Key Cloudinary salah atau tidak aktif.`;
              }
              reject(new Error(msg));
            }
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });

      const cloudinaryResult = result as any;
      console.log(`[Cloudinary] Upload success: ${cloudinaryResult.secure_url}`);
      return res.json({ 
        url: cloudinaryResult.secure_url, 
        public_id: cloudinaryResult.public_id,
        status: 'success' 
      });
    } catch (error) {
      console.error('[Upload Endpoint Error]:', error);
      return res.status(500).json({ 
        error: (error as Error).message || 'Terjadi kesalahan saat mengunggah ke Cloudinary.',
        status: 'error'
      });
    }
  });

  // Health check API
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Cloudinary Delete Endpoint
  app.delete('/api/delete-media/:publicId', async (req: any, res: any) => {
    try {
      const { publicId } = req.params;
      console.log(`[Cloudinary] Deleting media: ${publicId}`);
      
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image'
      });
      
      if (result.result === 'not found') {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: 'video'
        });
      }

      res.json({ status: 'success' });
    } catch (error) {
      console.error('Delete Error:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Custom 404 for API routes to prevent HTML fallback (MUST be before Vite)
  app.use('/api/*', (req, res) => {
    console.warn(`[API 404] ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `Not Found: ${req.originalUrl}`, status: 'error' });
  });

  // Set up WebSocket server for Y.js collaboration
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean);
    const roomName = parts.length > 0 ? parts[parts.length - 1] : 'default';
    
    console.log(`[Collaboration] 🟢 New client connected to room: ${roomName} (Total clients: ${wss.clients.size})`);
    
    ws.on('close', () => {
      console.log(`[Collaboration] 🔴 Client disconnected from room: ${roomName} (Remaining: ${wss.clients.size})`);
    });

    ws.on('error', (err) => {
      console.error(`[Collaboration] ❌ WebSocket error for room ${roomName}:`, err);
    });

    setupWSConnection(ws, req, { docName: roomName, gc: true });
  });

  // Handle upgrade to WebSocket
  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '', 'http://localhost');
      if (url.pathname?.startsWith('/collaboration')) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (err) {
      console.error('[Collaboration] Upgrade error:', err);
      socket.destroy();
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  
  // Global error handler MUST be after all other routes and middlewares
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('[Global Error Path]:', req.path);
    console.error(err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      status: 'error'
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
