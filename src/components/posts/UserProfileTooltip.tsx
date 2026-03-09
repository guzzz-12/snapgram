import type { JSX } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { FiSend } from "react-icons/fi";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useProfileService } from "@/services/profileService";
import { useChatsService } from "@/services/chatsService";
import { useTemporaryChat } from "@/hooks/useTemporaryChat";

interface Props {
  isOpen: boolean;
  userClerkId: string;
  children: JSX.Element;
  followOrUnfollow: (followedUserId: string | undefined, currentUserClerkId: string | null | undefined) => (
    {
      mutate: () => void;
      isPending: boolean;
    }
  )
}

const UserProfileTooltip = ({isOpen, userClerkId, children, followOrUnfollow}: Props) => {
  const navigate = useNavigate();

  const {userId} = useAuth();

  const {getUserProfile} = useProfileService();

  const {userData, loadingUser, userError} = getUserProfile(userClerkId, true, isOpen);

  const {getPrivateChatByRecipient} = useChatsService();

  const {setChat: setTemporaryChat} = useTemporaryChat();
  
  const {mutate, isPending} = followOrUnfollow(userData?._id, userId);
  
  // Consultar el chat con el usuario seleccionado
  const {refetch} = getPrivateChatByRecipient(userData?._id);

  // Navegar a la página del chat si existe el chat con el usuario seleccionado
  // Crear el item del chat temporal si el chat no existe entre los dos usuarios
  const onChatHandler = async () => {
    const {data} = await refetch();
    
    if (data?.data) {
      navigate(`/messages/${data.data._id}`);

    } else {
      const tempChatId = `temp_${userData?._id}`;

      setTemporaryChat({
        _id: tempChatId,
        participants: [userData!],
        type: "private",
        groupAdmin: null,
        groupName: null,
        groupPicture: null,
        groupDescription: null,
        lastMessage: null,
        unseenMessages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      navigate(`/messages/${tempChatId}`);
    }
  }

  const isCurrentUser = userClerkId === userId;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>

      <HoverCardContent className="w-[300px] max-w-[300px] p-0 rounded-md border bg-neutral-200 shadow overflow-hidden">
        <div
          className="relative"
          style={{
            backgroundImage: userData?.coverPicture ? `url(${userData.coverPicture})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          }}
        >
          {loadingUser &&
            <div className="flex justify-center items-center w-full aspect-video">
              <Skeleton className="w-full h-full bg-neutral-500" />
            </div>
          }

          {userData && !loadingUser &&
            <>
              <div className="flex flex-col w-full">
                <Link
                  className="flex justify-start items-center gap-3 p-4 overflow-hidden z-10"
                  to={`/profile/${userData.clerkId}`}
                >
                  <Avatar className="w-[70px] h-[70px] shrink-0">
                    <AvatarImage
                      className="w-full h-full object-cover" 
                      src={userData.profilePicture}
                    />
                    <AvatarFallback>
                      {userData.fullName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col w-full overflow-hidden">
                    <div className="flex justify-start items-center gap-2 w-fit overflow-hidden">
                      <p className="w-full text-base text-neutral-900 font-semibold truncate">
                        {userData.fullName}
                      </p>

                      {(userData.isFollowedBy || isCurrentUser) && 
                        <div className="flex justify-center items-center shrink-0 px-2 py-1 rounded-full border border-neutral-400">
                          <span className="text-xs text-neutral-700 font-light whitespace-nowrap">
                            {userData.isFollowedBy && "Te sigue"}
                            {isCurrentUser && "Tú"}
                          </span>
                        </div>
                      }
                    </div>

                    <p className="w-full text-sm text-neutral-700 truncate">
                      @{userData.username}
                    </p>
                  </div>
                </Link>

                <div className="flex justify-center items-center gap-6 w-full mt-auto px-4 pt-4 pb-2 bg-gradient-to-t from-white from-0% to-transparent">
                  <div className="flex flex-col justify-between items-center gap-0">
                    <p className="text-sm text-black font-semibold">
                      {userData.followersCount}
                    </p>

                    <p className="text-sm text-neutral-700">
                      seguidores
                    </p>
                  </div>

                  <div className="flex flex-col justify-between items-center gap-0">
                    <span className="text-sm text-black font-semibold">
                      {userData.followingCount}
                    </span>

                    <span className="text-sm text-neutral-700">
                      siguiendo
                    </span>
                  </div>

                  <div className="flex flex-col justify-between items-center gap-0">
                    <span className="text-sm text-black font-semibold">
                      {userData.postsCount}
                    </span>

                    <span className="text-sm text-neutral-700">
                      publicaciones
                    </span>
                  </div>
                </div>

                {!isCurrentUser &&
                  <div className="flex justify-center items-center gap-2 w-full px-4 py-2 border-t bg-white overflow-hidden z-10">
                    <Button
                      className="w-1/2 rounded-full bg-[#4F39F6] hover:bg-[#4F39F6]/80 cursor-pointer!"
                      size="sm"
                      onClick={onChatHandler}
                    >
                      <FiSend className="size-5 text-white shrink-0" aria-hidden />

                      <span className="text-white">
                        Mensaje
                      </span>
                    </Button>

                    <Button
                      className="w-1/2 rounded-full cursor-pointer!"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => mutate()}
                    >
                      <span className="">
                        {userData.isFollowing ? "Dejar de seguir" : "Seguir"}
                      </span>
                    </Button>
                  </div>
                }
              </div>

              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white from-0% to-transparent to-55% z-0" />
            </>
          }
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export default UserProfileTooltip