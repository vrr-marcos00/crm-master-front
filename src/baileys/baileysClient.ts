import makeWASocket from '@whiskeysockets/baileys';
import { DisconnectReason, AnyMessageContent, WAMessage, makeInMemoryStore, useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';

import { emitEventToUser } from './socketServer';
import { saveData, loadData } from '../utils/fileUtils';

const authPath = path.resolve('./auth_info');
const usersStoreDataPath = path.resolve('./data/users_store');

// Cria um armazenamento em memória para gerenciar o estado dos chats e contatos
const store = makeInMemoryStore({});
const intervals: Record<string, NodeJS.Timeout> = {};

let socket: any;

function saveStoreToFile(userId: string) {
  store.writeToFile(`${usersStoreDataPath}/user_${userId}.json`);
}

export async function initializeBaileys(userId: string) {
  if (!intervals[userId]) {
    intervals[userId] = setInterval(() => {
      console.log("Atualizando arquivo JSON");
      saveStoreToFile(userId);
    }, 5000);
  }

  const { state, saveCreds } = await useMultiFileAuthState(path.join(authPath, userId));
  
  socket = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: true
  });

  store.bind(socket.ev);

  // Lida com o evento de atualização de conexão
  socket.ev.on('connection.update', (update: { connection: any; lastDisconnect: any; }) => {
    emitEventToUser(userId, 'connection.status', { status: 'NOT_CONNECTED'});

    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      saveStoreToFile(userId);
      emitEventToUser(userId, 'connection.status', { status: 'NOT_CONNECTED'});

      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log("Tentando reconectar para o usuário:", userId);

        if (intervals[userId]) {
          clearInterval(intervals[userId]);
          delete intervals[userId];
        }

        initializeBaileys(userId);
      } else {
        console.log(`Usuário ${userId} desconectado. Limpando dados de autenticação...`);
        if (fs.existsSync(path.join(authPath, userId))) {
          fs.rmSync(path.join(authPath, userId), { recursive: true, force: true });
        }

        initializeBaileys(userId);
      }
    } else if (connection === 'open') {
      emitEventToUser(userId, 'connection.status', { status: 'CONNECTED'}); 
      console.log(`Usuário ${userId} conectado com sucesso ao WhatsApp`);
    }
  });

  socket.ev.on('creds.update', saveCreds);

  // Lida com sincronização do histórico de mensagens
  socket.ev.on('messaging-history.set', ({ isLatest }: any) => {
    if (isLatest) {
      console.log(`Histórico de mensagens sincronizado para o usuário: ${userId}`);
    } else {
      console.log(`Sincronizando histórico de mensagens para o usuário: ${userId}`);
    }
  });

  // Lida com novas mensagens recebidas
  socket.ev.on('messages.upsert', async ({ messages, type }: any) => {
    if (type === 'notify') {
      console.log(`Nova mensagem para o usuário ${userId}`, messages);

      saveData(userId, messages);
      saveStoreToFile(userId);
      emitEventToUser(userId, 'messages.upsert', { messages, type }); 
    }
  });
}

export async function getRecentContacts(userId: string): Promise<any> {
  const userData = loadData(userId);
  const recentChats = userData?.chats
    ?.filter((chat: any) => !chat.id.includes('@g.us') && !chat.id.includes('@newsletter') && !chat.id.includes('@broadcast'))
    .sort((a: any, b: any) => {
      const timestampA = typeof a.conversationTimestamp === 'object' ? a.conversationTimestamp.low : a.conversationTimestamp;
      const timestampB = typeof b.conversationTimestamp === 'object' ? b.conversationTimestamp.low : b.conversationTimestamp;
      return timestampB - timestampA;
    })
    .slice(0, 100);

  // Adiciona informações de nome ao contato
  const recentContactsWithNames = recentChats.map((chat: any) => {
    const contact = store.contacts[chat.id];
    return { ...chat, name: contact?.notify || contact?.id };
  });

  return recentContactsWithNames;
}

export async function getChatHistory(jid: string): Promise<WAMessage[] | undefined> {
  if (!store.messages[jid] || !store.messages[jid].array) {
    console.log(`Nenhum histórico de mensagens encontrado para ${jid}`);
    return [];
  }
  const allMessages = store.messages[jid].array;
  return allMessages.slice(-3000);
}

export async function sendMessage(jid: string, content: AnyMessageContent) {
  await socket.sendMessage(jid, content);
}