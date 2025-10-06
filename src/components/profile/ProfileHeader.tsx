import { useEffect, useRef, useState } from "react";
import { Calendar, MapPin, Pencil } from "lucide-react";
import ProfileEditModal from "./ProfileEditModal";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useClampedText from "@/hooks/useClampedText";
import { cn } from "@/lib/utils";
import type { UserType } from "@/types/global";

interface Props {
  userData: UserType;
}

const ProfileHeader = ({ userData }: Props) => {
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const textContentRef = useRef<HTMLParagraphElement>(null);
  const showClampBtnRef = useRef<"shouldShow" | "shouldNotShow">("shouldNotShow");

  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [avatarHeight, setAvatarHeight] = useState(0);
  const [openEditModal, setOpenEditModal] = useState(false);

  const {user} = useCurrentUser();

  const {
    isClamped,
    showFullText,
    setShowFullText,
    setIsClamped
  } = useClampedText({ textContentRef, showClampBtnRef, clampedText: userData.bio });

  useEffect(() => {
    if (avatarRef.current) {
      setAvatarHeight(avatarRef.current.clientHeight);
    }

    const resizeHandler = (_e: UIEvent) => {
      const width = window.innerWidth
      setViewportWidth(width);
    }

    window.addEventListener("resize", resizeHandler);

    return () => {
      window.removeEventListener("resize", resizeHandler)
    }
  }, []);

  return (
    <div className="block rounded-lg bg-slate-50 shadow overflow-hidden">
      <ProfileEditModal
        userData={userData}
        isOpen={openEditModal}
        onClose={(open: boolean) => setOpenEditModal(open)}
      />

      <div
        style={{
          backgroundImage: `url(${userData.coverPhoto || "/placeholder_image.webp"})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
        className="w-full h-[200px] shadow-sm g-linear-to-r from-[#c8d3ff] to-[#fccee9]"
      />

      <div className="relative flex flex-col min-[850px]:flex-row w-full">
        <div className="absolute translate-y-[-50%] min-[850px]:static flex items-start shrink-0 pl-6 min-[850px]:translate-y-[0]">
          <Avatar
            ref={avatarRef}
            className="w-[120px] h-[120px] min-[850px]:w-[100px] min-[850px]:h-[100px] min-[950px]:w-[120px] min-[950px]:h-[120px] shrink-0 min-[850px]:translate-y-[-50%] outline-4 outline-white"
          >
            <AvatarImage
              className="w-full h-full object-cover"
              src={userData.profilePicture || "/default_avatar.webp"}
            />
            <AvatarFallback>
              {userData.fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div
          style={{
            ...(viewportWidth < 850 ? {paddingTop: `calc(0.5 * ${avatarHeight}px + 10px)`} : {})
          }}
          className="w-full p-6"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="grow overflow-hidden">
              <h1 className="mb-0 text-2xl font-semibold truncate">
                {userData.fullName}
              </h1>

              <span className="text-neutral-700 truncate">
                @{userData.username}
              </span>
            </div>

            {user?._id === userData._id &&
              <Button
                className="shrink-0 cursor-pointer"
                variant="outline"
                onClick={() => setOpenEditModal(true)}
              >
                <Pencil />
                <span>Editar</span>
              </Button>
            }
          </div>

          <div className="max-h-[450px] mb-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
            <p
              ref={textContentRef}
              className={cn("inline-block text-left text-neutral-700 whitespace-pre-wrap", showFullText ? "line-clamp-none" : "line-clamp-3")}
            >
              {userData.bio}
            </p>

            {showClampBtnRef.current === "shouldShow" &&
              <Button
                className="inline-block my-1 p-0 text-blue-900 cursor-pointer"
                variant="link"
                onClick={() => {
                  setShowFullText(!showFullText);
                  setIsClamped(!isClamped);
                }}
              >
                {!isClamped ? "Ver menos..." : "Ver más..."}
              </Button>
            }
          </div>

          <div className="flex justify-start items-center gap-9">
            {userData.location &&
              <div className="flex items-center gap-2 text-neutral-500">
                <MapPin className="size-5" />
                <span className="text-sm truncate">
                  {userData.location}
                </span>
              </div>
            }

            <div className="flex items-center gap-2 text-neutral-500">
              <Calendar className="size-5" />
              <span className="text-sm truncate">
                Se unió hace 12 días
              </span>
            </div>
          </div>

          <Separator className="w-full mt-9 mb-6" />

          <div className="flex justify-center min-[500px]:justify-start gap-4 min-[500px]:gap-9">
            <div className="flex flex-col min-[500px]:flex-row justify-start items-center min-[500px]:items-baseline gap-0 min-[500px]:gap-2">
              <p className="text-base min-[950px]:text-2xl font-bold">10</p>
              <p className="text-neutral-700">Posts</p>
            </div>

            <div className="flex flex-col min-[500px]:flex-row justify-start items-center min-[500px]:items-baseline gap-0 min-[500px]:gap-2">
              <p className="text-base min-[950px]:text-2xl font-bold">150</p>
              <p className="text-neutral-700">Seguidores</p>
            </div>

            <div className="flex flex-col min-[500px]:flex-row justify-start items-center min-[500px]:items-baseline gap-0 min-[500px]:gap-2">
              <p className="text-base min-[950px]:text-2xl font-bold">250</p>
              <p className="text-neutral-700">Siguiendo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileHeader