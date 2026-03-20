import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { MdOutlineClose } from "react-icons/md";
import Logo from "@/components/Logo";
import StoriesViewer from "@/components/stories/StoriesViewer";
import { Button } from "@/components/ui/button";

const StoriesPage = () => {
  const { username } = useParams() as { username: string };
  const navigate = useNavigate();

  // Cerrar el visor de stories al presionar Escape
  useEffect(() => {
    const onKeydownHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        navigate("/");
      }
    }

    document.addEventListener("keydown", onKeydownHandler);

    return () => {
      document.removeEventListener("keydown", onKeydownHandler);
    }
  }, []);

  return (
    <main className="pageWrapper relative flex flex-col h-screen py-4 bg-[#1A1A1A] overflow-hidden">
      <Logo
        className="absolute top-4 left-4 hidden min-[820px]:flex z-10"
        size="sm"
        mode="dark"
      />

      <Button
        className="absolute top-4 right-4 text-white hover:text-white hover:bg-transparent cursor-pointer z-10"
        size="icon"
        variant="ghost"
        onClick={() => navigate("/")}
      >
        <MdOutlineClose className="size-10" aria-hidden />

        <span className="sr-only">
          Volver al inicio
        </span>
      </Button>

      <section className="h-[95vh] mx-auto aspect-[1/1.7] grow">
        <StoriesViewer storiesUsername={username} />
      </section>
    </main>
  )
}

export default StoriesPage