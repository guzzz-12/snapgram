import { AiOutlineMenu } from "react-icons/ai";
import Sidebar from "./Sidebar";
import { Button } from "./ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "./ui/drawer";

const MobileNavSidebar = () => {
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