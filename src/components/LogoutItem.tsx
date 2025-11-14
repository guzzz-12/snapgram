import { useState } from "react";
import { useAuth } from "@clerk/clerk-react"
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const LogoutItem = () => {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const {signOut} = useAuth();

  const onClickHandler = async () => {
    try {
      setIsSigningOut(true);

      await signOut();
      
    } catch (error: any) {
      toast.error("Error al cerrar sesión. Inténtalo de nuevo.");

    } finally {
      setIsSigningOut(false);      
    }
  }

  return (
    <Button
      className={cn("w-full h-auto !px-2 py-4 text-neutral-600 cursor-pointer", isSigningOut && "pointer-events-none")}
      variant="ghost"
      disabled={isSigningOut}
      onClick={onClickHandler}
    >
      Cerrar sesión
      <LogOut className="ml-auto size-4 shrink-0" aria-hidden />
    </Button>
  )
}

export default LogoutItem