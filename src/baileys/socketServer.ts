import { Server as IOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

// Define um objeto para armazenar os sockets dos usuários conectados
const clients: Record<string, Socket> = {};

// Função para configurar o servidor Socket.IO
export function setupSocketServer(server: HTTPServer) {
  const io = new IOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string;

    if (userId) {
      clients[userId] = socket;
      console.log(`Cliente conectado: ${userId}`);

      socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${userId}`);
        delete clients[userId];
      });
    }
  });

  return io;
}

// Função para enviar eventos a um usuário específico pelo `userId`
export function emitEventToUser(userId: string, event: string, data: any) {
  const socket = clients[userId];
  
  if (socket) {
    socket.emit(event, data);
  }
}
