import { AiOutlineMenu } from "react-icons/ai";
import {useLocation} from "react-router";
import Sidebar from "./Sidebar";
import { Button } from "./ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "./ui/drawer";

const MobileNavSidebar = () => {
  const {pathname} = useLocation();

  // No mostrar en la página de los stories
  if (pathname.startsWith("/stories")) {
    return null;
  }

  return (
    <Drawer direction="left">
      <DrawerTrigger asChild>
        <Button
          className="flex min-[700px]:hidden mt-auto mx-auto cursor-pointer"
          variant="ghost"
          size="icon"
        >
          <AiOutlineMenu className="size-7 text-neutral-700" aria-hidden />
          <span className="sr-only">
            Abrir menú de navegación principal
          </span>
        </Button>
      </DrawerTrigger>

      <DrawerContent className="!w-fit">
        <Sidebar />
      </DrawerContent>
    </Drawer>
  )
}

export default MobileNavSidebar