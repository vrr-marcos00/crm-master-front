// React
import { useEffect, useState } from 'react';

interface Contact {
  id: string;
  name: string;
  lastMessageTime: number;
}

interface Message {
  key: {
    fromMe: boolean;
  };
  message: { conversation?: string, extendedTextMessage?: { text: string } };
}

const Chat = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState<string>('');

  const isBaileysReady = false;
  const syncSuccess = true;

  useEffect(() => {
    const initializerBaileys = async () => {
      try {
        await fetch('/api/whatsapp?action=initializerBaileys&userId=123456', {
          method: 'POST'
        });
      } catch (error) {
        console.error('Erro ao carregar contatos:', error);
      }
    };

    initializerBaileys();
  }, []);

  useEffect(() => {
    const loadContacts = async () => {
      if (isBaileysReady) {
        try {
          const res = await fetch('/api/whatsapp?action=getContacts&userId=123456');
          const data = await res.json();
          setContacts(data.contacts);
        } catch (error) {
          console.error('Erro ao carregar contatos:', error);
        }
      }
    };

    loadContacts();
  }, [isBaileysReady]);

  // Função para carregar histórico de mensagens ao selecionar um contato
  const selectChat = async (jid: string) => {
    setSelectedChat(jid);

    try {
      const res = await fetch(`/api/whatsapp?action=getChatHistory&jid=${jid}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      } else {
        console.error('Erro ao carregar histórico de mensagens:', await res.text());
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de mensagens:', error);
    }
  };

  // Função para enviar uma mensagem
  const sendMessage = async () => {
    if (!messageText || !selectedChat) return;
    await fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jid: selectedChat, message: messageText }),
    });
    setMessageText('');
    setMessages((prevMessages) => [
      ...prevMessages,
      { message: { conversation: messageText }, key: { fromMe: true } },
    ]);
  };

  console.log("SYNC", syncSuccess);
  console.log("IS REASY BAILEYS", isBaileysReady);

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: '30%', borderRight: '1px solid #ddd', padding: '10px' }}>
        <h3>Contatos</h3>
        {!syncSuccess && <p>Carregando contatos...</p>}
        <ul>
          {contacts?.map((contact) => (
            <li key={contact.id} onClick={() => selectChat(contact.id)}>
              {contact.name || contact.id}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ width: '70%', padding: '10px' }}>
        {selectedChat ? (
          <>
            <h3>Chat com {selectedChat}</h3>
            <div style={{ maxHeight: '400px', overflowY: 'scroll' }}>
              {messages.map((msg, idx) => (
                <p key={idx} style={{ textAlign: msg?.key?.fromMe ? 'right' : 'left' }}>
                  {msg?.message?.conversation || msg?.message?.extendedTextMessage?.text}
                </p>
              ))}
            </div>
            <textarea
              rows={3}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Digite sua mensagem"
            />
            <button onClick={sendMessage}>Enviar</button>
          </>
        ) : (
          <p>Selecione um contato para ver as mensagens</p>
        )}
      </div>
    </div>
  );
};

export default Chat;
