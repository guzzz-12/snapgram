import { NavLink } from "react-router";
import type { IconType } from "react-icons/lib";
import { SidebarMenuItem } from "./ui/sidebar";

interface Props {
  href: string;
  title: string;
  Icon: IconType;
  badge?: number;
}

const MainSidebarItem = ({ href, title, Icon, badge }: Props) => {
  return (
    <SidebarMenuItem>
      <NavLink
        to={href}
        className={({ isActive }) => (
          `flex justify-start items-center gap-2 w-full h-full px-4 py-3 text-base rounded-md hover:!bg-[#4F39F6]/10 transition-colors [&_.sidebarIconWrapper>svg]:stroke-2 ${isActive ? "text-[#4F39F6] font-bold !bg-[#4F39F6]/10 [&_.sidebarIconWrapper>svg]:text-[#4F39F6] [&_.sidebarIconWrapper>svg]:fill-[#4F39F6]/10" : "bg-transparent font-normal [&_.sidebarIconWrapper>svg]:stroke-current [&_.sidebarIconWrapper>svg]:fill-transparent"}`
        )}
      >
        <div className="sidebarIconWrapper">
          {badge &&
            <div className="absolute -top-1.5 right-1 flex justify-center items-center min-w-4 h-4 px-1 text-white text-xs font-normal bg-red-600 rounded-full translate-x-[40%] outline-1 outline-white">
              {badge}
            </div>
          }
          
          <Icon className="!size-6 text-neutral-700" aria-hidden />
        </div>
        {title}
      </NavLink>
    </SidebarMenuItem>
  )
}

export default MainSidebarItem