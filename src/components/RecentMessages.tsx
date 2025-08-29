import RecentMessageItem from "./RecentMessageItem";
import { dummyRecentMessagesData } from "@/dummy-data";

const RecentMessages = () => {
  return (
    <div className="flex flex-col w-full h-full max-h-[320px] p-3 rounded-lg bg-white shadow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
      <h2 className="mb-1 text-neutral-700 font-semibold">
        Mensajes recientes
      </h2>

      <div className="flex flex-col gap-2 w-full max-h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        {dummyRecentMessagesData.map((message) => (
          <RecentMessageItem key={message._id} messageData={message} />
        ))}
      </div>
    </div>
  )
}

export default RecentMessages