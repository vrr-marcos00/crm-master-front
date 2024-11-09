import express from 'express';
import { createServer } from 'http';
import next from 'next';

import { setupSocketServer } from './src/baileys/socketServer';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3000;

app.prepare().then(() => {
  const expressApp = express();
  const server = createServer(expressApp);

  // Configura o Socket.IO usando o servidor HTTP
  setupSocketServer(server);

  // Configura o Next.js como middleware para lidar com as rotas do app
  expressApp.all('*', (req: any, res: any) => handle(req, res));

  // Inicia o servidor HTTP com o Next.js e Socket.IO
  server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
});
