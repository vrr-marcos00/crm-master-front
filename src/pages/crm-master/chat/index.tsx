// Context
import { BaileysProvider } from "../../../context/BaileysContext";

// Components
import Chat from "./components/Chat";

const ChatApp = () => {
  const userId = "123456";

  return (
    <BaileysProvider userId={userId}>
      <Chat />
    </BaileysProvider>
  );
};

export default ChatApp;
