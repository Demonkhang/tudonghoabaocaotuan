import path from 'path';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import express from 'express';
import app from './server/src/app.js';

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  // In dev mode, default to 3001 to avoid colliding with Docker on port 3000
  const defaultPort = isProd ? 3000 : 3001;
  const PORT = process.env.DEV_PORT 
    ? parseInt(process.env.DEV_PORT, 10) 
    : (isProd 
        ? (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000) 
        : (process.env.PORT && process.env.PORT !== '3000' ? parseInt(process.env.PORT, 10) : defaultPort));

  // Vite Middleware in Development mode
  if (!isProd) {
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

  const server = app.listen(PORT, '0.0.0.0', () => {
    const hostname = os.hostname();
    const ips = getLocalIpAddresses();
    console.log(`\n==========================================================`);
    console.log(`🚀 BÁO CÁO TUẦN [${isProd ? 'PRODUCTION DOCKER' : 'DEVELOPMENT DEV'}]`);
    console.log(`- Cục bộ (Local):         http://localhost:${PORT}`);
    console.log(`- Tên máy (Hostname):     http://${hostname}:${PORT}  <-- DÙNG LINK NÀY (Không lo đổi IP!)`);
    if (ips.length > 0) {
      console.log(`- Mạng LAN (IP hiện tại): http://${ips[0]}:${PORT}`);
    }
    console.log(`==========================================================\n`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`⚠️ Cổng ${PORT} đang được sử dụng. Nếu bạn đang chạy Docker trên cổng 3000, hãy đặt DEV_PORT=3001 trong file .env.`);
    } else {
      console.error('Lỗi khởi động server:', err);
    }
  });
}

startServer();

