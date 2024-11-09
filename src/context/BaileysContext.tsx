import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface BaileysEvent {
  event: string;
  data: any;
};

interface BaileysContextType {
  messages: Record<string, any[]>; // Armazena as mensagens para cada usuário
  addMessage: (userId: string, message: any) => void;
  connectionStatus: boolean;
};

const BaileysContext = createContext<BaileysContextType | undefined>(undefined);
let socket: Socket;

export const BaileysProvider: React.FC<{ userId: string, children: React.ReactNode }> = ({ userId, children }) => {
  const [messages, setMessages] = useState<Record<string, any[]>>({});
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);

  useEffect(() => {
    // Inicializa o Socket.IO Client e conecta com o `userId`
    socket = io('http://localhost:3000', {
      query: { userId },
    });

    socket.on('connect', () => {
      console.log('Conectado ao Socket.IO Server');
    });

    socket.on('messages.upsert', (data: BaileysEvent['data']) => {
      console.log('EVENT - messages.upsert', data?.messages);
      addMessage(userId, data?.messages);
    });

    socket.on('connection.status', (data: BaileysEvent['data']) => {
      console.log('EVENT - connection.status', data?.status);
      addMessage(userId, data?.status);
    });

    socket.on('disconnect', () => {
      console.log('Desconectado do Socket.IO Server');
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  const addMessage = (userId: string, message: any) => {
    setMessages((prevMessages) => ({
      ...prevMessages,
      [userId]: [...(prevMessages[userId] || []), ...message],
    }));
  };

  return (
    <BaileysContext.Provider value={{ messages, addMessage, connectionStatus }}>
      {children}
    </BaileysContext.Provider>
  );
};

export const useBaileys = () => {
  const context = useContext(BaileysContext);
  if (!context) throw new Error('useBaileys deve ser usado dentro de BaileysProvider');
  return context;
};
