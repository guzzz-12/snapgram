import dayjs from "dayjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useBlockUserModal } from "@/hooks/useBlockUserModal";
import type { UserType } from "@/types/global";

interface Props {
  data: {
    blockedUser: UserType;
    createdAt: string;
  }
}

const BlockedUserListItem = ({ data }: Props) => {
  const { blockedUser, createdAt } = data;

  const {setOpen, setOperation, setBlockedUser} = useBlockUserModal();

  return (
    <li className="flex justify-between items-center gap-3 w-full p-2 rounded-md bg-neutral-100">
      <div className="flex justify-start items-center gap-3 overflow-hidden">
        <Avatar className="w-[45px] h-[45px] shrink-0">
          <AvatarImage
            className="w-full h-full object-cover object-center"
            src={blockedUser.profilePicture}
          />
          <AvatarFallback className="w-full h-full text-lg object-cover object-center">
            {blockedUser.fullName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col w-full overflow-hidden">
          <p className="w-full text-sm text-neutral-900 font-semibold truncate">
            {blockedUser.fullName}
          </p>

          <span className="w-full text-xs text-neutral-700 truncate">
            Bloqueado el {dayjs(createdAt).format("DD/MM/YYYY [a las] hh:mm a")}
          </span>
        </div>
      </div>

      <Button
        className="shrink-0 cursor-pointer"
        variant="outline"
        onClick={() => {
          setOpen(true);
          setOperation("unblock");
          setBlockedUser(blockedUser);
        }}
      >
        Desbloquear
      </Button>
    </li>
  )
}

export default BlockedUserListItem