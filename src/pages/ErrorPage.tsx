import { AiOutlineReload } from "react-icons/ai";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

interface Props {
  title: string;
  message: string;
  callback?: () => void;
}

const ErrorPage = ({ title, message, callback }: Props) => {
  return (
    <main className="flex flex-col justify-center items-center w-full h-screen">
      <Logo className="mb-9" />

      <h2 className="mb-2 text-3xl text-neutral-700 font-normal">
        {title}
      </h2>

      <p className="text-base text-neutral-600">
        {message}
      </p>

      <Button
        className="mt-4 text-white uppercase bg-[#4F39F6] hover:bg-[#4F39F6]/80 cursor-pointer"
        variant="default"
        size="lg"
        onClick={() => {
          if (callback) {
            callback();
            return;
          }

          window.location.reload();
        }}
      >
        <AiOutlineReload />
        Reintentar
      </Button>
    </main>
  )
}

export default ErrorPage