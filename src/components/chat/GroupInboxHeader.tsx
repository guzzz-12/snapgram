import { useState } from "react";
import { Link } from "react-router";
import dayjs from "dayjs";
import { FaUsers } from "react-icons/fa";
import { MdOutlineAdminPanelSettings } from "react-icons/md";
import { CgCalendarDates } from "react-icons/cg";
import GroupInfoModal from "./GroupInfoModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useImagesLighbox } from "@/hooks/useImagesLightbox";
import type { ChatType } from "@/types/global";

interface Props {
  groupData: ChatType | null | undefined;
}

const GroupInboxHeader = ({ groupData }: Props) => {
  const [openGroupInfoModal, setOpenGroupInfoModal] = useState(false);

  const {setOpen, setImages} = useImagesLighbox();

  if (!groupData) {
    return null;
  }

  return (
    <section className="w-full py-6 border-b bg-neutral-50">
      <GroupInfoModal
        groupId={groupData._id}
        isOpen={openGroupInfoModal}
        setIsOpen={setOpenGroupInfoModal}
      />

      <div className="flex flex-col justify-center items-center max-w-[60%] mx-auto">
        <button
          className="cursor-pointer"
          onClick={() => {
            if (!groupData.groupPicture) return;

            setImages([groupData.groupPicture]);
            setOpen(true);
          }}
        >
          <Avatar className="w-[120px] h-[120px] mb-3 shrink-0 outline-4 outline-[#4f39f6] outline-offset-2">
            <AvatarImage
              className="w-full h-full object-cover object-center"
              src={groupData.groupPicture || ""}
              alt=""
            />
            <AvatarFallback className="w-full h-full text-4xl text-white object-cover object-center bg-[#4f39f6]">
              {groupData.groupName?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <span className="sr-only">
            Ver imagen del grupo {groupData.groupName}
          </span>
        </button>

        <h2 className="w-full mb-2 text-center text-xl font-semibold text-neutral-900">
          {groupData.groupName}
        </h2>

        <div className="flex flex-col justify-center items-start gap-1 w-full overflow-hidden">
          <div className="flex justify-center items-center gap-2 w-full">
            <MdOutlineAdminPanelSettings className="size-6 shrink-0 text-neutral-500" />
            <p className="w-fit max-w-full text-center text-sm text-neutral-900 truncate">
              Grupo creado por
              {" "}
              <Link
                to={`/profile/${groupData.groupAdmin?.clerkId}`}
                className="text-[#4f39f6] underline font-semibold"
              >
                {groupData.groupAdmin?.fullName}
              </Link>
            </p>
          </div>

          <div className="flex justify-center items-center gap-3 w-full">
            <FaUsers className="size-6 shrink-0 text-neutral-500" />
            <p className="text-center text-sm text-neutral-900">
              {groupData.participants.length} miembros
            </p>
          </div>

          <div
            className="flex justify-center items-center gap-3 w-full"
            title={dayjs(groupData.createdAt).format("DD/MM/YYYY - hh:mm a")}
          >
            <CgCalendarDates className="size-6 shrink-0 text-neutral-500" />
            <p className="text-center text-sm text-neutral-900">
              {dayjs(groupData.createdAt).format("DD/MM/YYYY")}
            </p>
          </div>

          <Button
            className="w-fit mt-6 mx-auto text-white bg-[#4f39f6] hover:bg-[#4f39f6]/90 cursor-pointer"
            size="sm"
            onClick={() => setOpenGroupInfoModal(true)}
          >
            Ver información
          </Button>
        </div>
      </div>
    </section>
  )
}

export default GroupInboxHeader;