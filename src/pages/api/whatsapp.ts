/* eslint-disable @typescript-eslint/no-explicit-any */

import type { NextApiRequest, NextApiResponse } from 'next';
import { initializeBaileys, getRecentContacts, getChatHistory, sendMessage, isBaileysReady } from '../../lib/baileysClient';

let initialized = false;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (!initialized) {
    initializeBaileys();
    initialized = true;
  }
    
  if (!isBaileysReady) {
    return res.status(503).json({ error: 'Socket não está pronto. Tente novamente mais tarde.' });
  }

  if (req.method === 'GET') {
    if (req.query.action === 'getContacts') {
      try {
        const contacts = await getRecentContacts();

        return res.status(200).json({ contacts });
      } catch (error: any) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao obter contatos' });
      }
    }
    
    // Rota para obter histórico de conversas
    if (req.query.action === 'getChatHistory' && typeof req.query.jid === 'string') {
      try {
        const chatHistory = await getChatHistory(req.query.jid);

        return res.status(200).json({ messages: chatHistory });
      } catch (error: any) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao obter histórico de conversas' });
      }
    }
  }

  if (req.method === 'POST') {
    // Envia mensagem
    const { jid, message } = req.body;
    try {
      await sendMessage(jid, { text: message });
      return res.status(200).json({ status: 'Mensagem enviada com sucesso' });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Método ${req.method} não permitido`);
}
