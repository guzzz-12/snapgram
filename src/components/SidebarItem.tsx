import { NavLink } from "react-router";
import type { IconType } from "react-icons/lib";
import { cn } from "@/lib/utils";

interface Props {
  href: string;
  title: string;
  Icon: IconType;
  badge?: number;
}

const SidebarItem = ({ href, title, Icon, badge }: Props) => {
  return (
    <li>
      <NavLink
        to={href}
        className={({ isActive }) => (
          cn(
            `flex justify-center min-[950px]:justify-start items-center gap-2 w-full h-fit px-4 py-3 text-base rounded-md hover:!bg-[#4F39F6]/10 dark:hover:!bg-indigo-500/15 transition-colors [&_.sidebarIconWrapper>svg]:stroke-2`,
            isActive
              ? "text-[#4F39F6] dark:text-indigo-400 font-bold !bg-[#4F39F6]/10 dark:!bg-indigo-500/15 [&_.sidebarIconWrapper>svg]:text-[#4F39F6] dark:[&_.sidebarIconWrapper>svg]:text-indigo-400 [&_.sidebarIconWrapper>svg]:fill-[#4F39F6]/10 dark:[&_.sidebarIconWrapper>svg]:fill-indigo-400/15"
              : "bg-transparent text-neutral-900 dark:text-slate-200 font-normal [&_.sidebarIconWrapper>svg]:stroke-current [&_.sidebarIconWrapper>svg]:fill-transparent"
          )
        )}
      >
        <div className="sidebarIconWrapper">
          {badge &&
            <div className="absolute -top-1.5 right-1 flex justify-center items-center min-w-4 h-4 px-1 text-white text-xs font-normal bg-red-600 rounded-full translate-x-[40%] outline-1 outline-white dark:outline-slate-900">
              {badge}
            </div>
          }
          
          <Icon className="!size-6 text-neutral-700 dark:text-slate-300" aria-hidden />
        </div>

        <span className="hidden min-[950px]:block">
          {title}
        </span>
      </NavLink>
    </li>
  )
}

export default SidebarItem