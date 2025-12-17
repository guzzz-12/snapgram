import { useNavigate } from "react-router";
import { FaLock } from "react-icons/fa";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const PostNotFound = () => {
  const navigate = useNavigate();

  return (
    <main className="flex flex-col justify-center items-center gap-5 w-full h-full">
      <Logo />

      <section className="flex flex-col justify-center items-center gap-3 px-4 py-6 bg-white">
        <h1 className="text-center text-2xl text-neutral-600 font-semibold">
          Este contenido no está disponible
        </h1>

        <Separator className="w-full my-1 bg-neutral-200" />

        <div className="flex justify-center items-center w-full gap-3">
          <FaLock className="size-7 text-neutral-400 shrink-0" />
          <p className="text-base text-neutral-600">
            Esto ocurre si el autor eliminó el contenido <br /> o si ha sido compartido con una audiencia privada.
          </p>
        </div>
      </section>

      <Button
        className="w-[90px] text-base text-white bg-[#4F39F6] hover:bg-[#4F39F6]/80 cursor-pointer"
        variant="default"
        onClick={() => navigate("/", {replace: true})}
      >
        Volver
      </Button>
    </main>
  )
}

export default PostNotFound