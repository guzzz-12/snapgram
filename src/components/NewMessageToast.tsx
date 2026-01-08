import { useEffect, useState } from "react";
import { Link } from "react-router";
import { IoIosRecording } from "react-icons/io";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { decryptMessage } from "@/utils/decryptMessageText";
import type { MessageType, UserType } from "@/types/global";

interface Props {
  messageData: MessageType;
  currentUser: UserType;
}

const NewMessageToast = ({ messageData, currentUser }: Props) => {
  const { sender, chat, type } = messageData;

  const [decryptedMsg, setDecryptedMsg] = useState<MessageType | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    decryptMessage(messageData, currentUser._id)
      .then((msg) => {
        setDecryptedMsg(msg);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [messageData, currentUser]);

  if (!decryptedMsg) return null;

  // Parsear el array de urls de las imagenes del mensaje
  const parsedFilesUrls = decryptedMsg.fileUrls ? JSON.parse(decryptedMsg.fileUrls) as string[] : [];

  const notificationLink = `/messages/${chat}`;

  return (
    <Link
      className="flex justify-start items-center gap-2 min-w-[270px] max-w-[300px] px-3 py-2 bg-neutral-200 rounded-md border shadow-md"
      to={notificationLink}
    >
      <div className="flex items-center h-full shrink-0">
        <Avatar className="w-[45px] h-[45px] shrink-0">
          <AvatarImage
            className="w-full h-full object-cover object-center"
            src={sender.profilePicture}
          />
          <AvatarFallback className="w-full h-full object-cover object-center">
            {sender.fullName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="flex flex-col w-full h-full overflow-hidden">
        <p className="w-full text-sm text-neutral-900 leading-tight">
          <span className="font-semibold">{sender.fullName}</span> ha enviado un mensaje.
        </p>

        {decryptedMsg.text &&
          <span className="w-full mt-1 text-xs text-neutral-700 italic line-clamp-3">
            {decryptedMsg.text}
          </span>
        }

        {(type === "image" || type === "imageWithText") &&
          <div className="w-full h-[80px] mt-1">
            <img
              className="w-full h-full object-cover object-center"
              src={parsedFilesUrls[0]}
            />
          </div>
        }

        {type === "audio" &&
          <div className="flex justify-start items-center gap-2 w-full mt-0">
            <IoIosRecording className="size-8 shrink-0 text-[#4F39F6]" />
            <p className="w-full mt-1 text-sm text-neutral-700 font-semibold">
              Nota de voz
            </p>
          </div>
        }
      </div>
    </Link>
  )
}

export default NewMessageToast