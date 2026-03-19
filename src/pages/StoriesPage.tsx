import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { MdOutlineClose } from "react-icons/md";
import Logo from "@/components/Logo";
import StoriesViewer from "@/components/stories/StoriesViewer";
import { Button } from "@/components/ui/button";

const StoriesPage = () => {
  const params = useParams() as { username: string };
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
    <main className="pageWrapper flex flex-col h-screen py-0 bg-[#1A1A1A] overflow-hidden">
      <nav className="flex justify-between items-center gap-3 pt-2">
        <Logo size="sm" mode="dark" />

        <Button
          className="text-white hover:text-white hover:bg-transparent cursor-pointer"
          size="icon"
          variant="ghost"
          onClick={() => navigate("/")}
        >
          <MdOutlineClose className="size-10" aria-hidden />

          <span className="sr-only">
            Volver al inicio
          </span>
        </Button>
      </nav>

      <section className="grow pb-3">
        <StoriesViewer storiesUsername={params.username} />
      </section>
    </main>
  )
}

export default StoriesPage