import MessageItem from "./MessageItem";
import type { MessageType, UserType } from "@/types/global";

interface Props {
  currentUser: UserType | null;
  recipient: UserType | null;
  messages: MessageType[];
}

const ChatContent = ({ currentUser, recipient, messages }: Props) => {
  if (!currentUser || !recipient) return null;

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
      <div className="flex flex-col gap-6 w-full p-6">
        {messages.map((message) => (
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