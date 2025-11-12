import LogoutItem from "./LogoutItem";
import ProfileLinkItem from "./ProfileLinkItem";
import { Separator } from "./ui/separator";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const RightSidebar = () => {
  const {user} = useCurrentUser();

  if (!user) {
    return null;
  }

  return (
    <aside className="sticky top-0 right-0 flex max-xl:hidden flex-col w-[300px] h-fit p-3 shrink-0 rounded-lg bg-white shadow">
      <ProfileLinkItem user={user} />

      <Separator className="w-full my-1 bg-neutral-200" />

      <LogoutItem />
    </aside>
  )
}

export default RightSidebar