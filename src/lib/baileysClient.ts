/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */

import makeWASocket, { DisconnectReason, AnyMessageContent, WAMessage, makeInMemoryStore, useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';

let socket: any;
let isBaileysReady = false;

const authPath = path.resolve('./auth_info');
const filePath = path.resolve('./store-chat.json');

const store = makeInMemoryStore({ });
store.readFromFile(filePath)

function saveStoreToFile() {
  store.writeToFile(filePath);
}

setInterval(() => {
  console.log("Atualizando arquivo JSON");
  saveStoreToFile()
}, 10000);

function loadChatsFromFile() {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } else {
    console.error('Arquivo store-chat.json não encontrado.');
    return [];
  }
}

async function initializeBaileys() {
  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  socket = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: true
  });

  store.bind(socket.ev);

  socket.ev.on('connection.update', (update: { connection: any; lastDisconnect: any; }) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("Tentando reconectar...");
        initializeBaileys();
      } else {
        console.log("Sessão desconectada pelo dispositivo móvel. Limpando dados de autenticação...");

        if (fs.existsSync(authPath)) {
          fs.rmSync(authPath, { recursive: true, force: true });
          console.log("Cache de autenticação limpo.");
        }
          
        initializeBaileys();
      }
    } else if (connection === 'open') {
      isBaileysReady = true;
      console.log('Conectado com sucesso ao WhatsApp');
    }
  });

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('messaging-history.set', ({ isLatest }: any) => {
    if (!isLatest) {
      console.log("Sincronizando...")
    } else {
      console.log("Sincronizado com sucesso!");
    }
  })

  socket.ev.on('messages.upsert', async ({ messages, type }: any) => {
    if (type === 'notify') {
      console.log('Nova mensagem detectada', messages);
    }
  });
}

async function getRecentContacts(): Promise<any> {
  if (!isBaileysReady) throw new Error('Socket não está pronto');

  const recentChats = loadChatsFromFile()?.chats
    .filter((chat: any) => !chat.id.includes('@g.us') && !chat.id.includes('@newsletter') && !chat.id.includes('@broadcast'))
    .sort((a: any, b: any) => {
      // Extrai o timestamp, tratando como número
      const timestampA = typeof a.conversationTimestamp === 'object' ? a.conversationTimestamp.low : a.conversationTimestamp;
      const timestampB = typeof b.conversationTimestamp === 'object' ? b.conversationTimestamp.low : b.conversationTimestamp;
      return timestampB - timestampA; // Ordena do mais recente ao mais antigo
    })
    .slice(0, 100);

  // // Mapeia os contatos recentes com detalhes completos
  const recentContactsWithNames = recentChats.map((chat: any) => {
    const contact = store.contacts[chat.id];

    return {
      ...chat,
      name: contact?.notify || contact?.id
    };
  });

  return recentContactsWithNames;
}

async function getChatHistory(jid: string): Promise<WAMessage[]> {
  if (!isBaileysReady) throw new Error('Socket não está pronto');

  if (!store.messages[jid] || !store.messages[jid].array) {
    console.log(`Nenhum histórico de mensagens encontrado para ${jid}`);
    return [];
  }

  const allMessages = store.messages[jid].array;
  const recentMessages = allMessages.slice(-3000); 

  return recentMessages;
}

async function sendMessage(jid: string, content: AnyMessageContent) {
  if (!isBaileysReady) throw new Error('Socket não está pronto');

  await socket.sendMessage(jid, content);
}

export { initializeBaileys, getRecentContacts, getChatHistory, sendMessage, isBaileysReady };
