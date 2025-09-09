import MessageItem from "./MessageItem";
import { dummyMessagesData, type UserType } from "@/dummy-data";

interface Props {
  currentUser: UserType;
  chatUser: UserType;
}

const ChatContent = ({ currentUser, chatUser }: Props) => {
  // Buscar los mensajes donde el usuario actual sea el remitente o el destinatario y el otro usuario sea el destinatario o el remitente
  const messagesData = dummyMessagesData.filter((message) => (message.from_user_id === currentUser._id && message.to_user_id === chatUser._id) || (message.from_user_id === chatUser._id && message.to_user_id === currentUser._id));

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
      <div className="flex flex-col gap-6 w-full p-6">
        {messagesData.map((message) => (
          <MessageItem
            key={message._id}
            currentUserId={currentUser._id}
            messageData={message}
          />
        ))}
      </div>
    </div>
  )
}

export default ChatContent