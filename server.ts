import path from 'path';
import { createServer as createViteServer } from 'vite';
import express from 'express';
import app from './server/src/app.js';

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (process.env.NODE_ENV === 'production' ? 3000 : 3001);

  // Vite Middleware in Development mode
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
