import { AiOutlineReload } from "react-icons/ai";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  message: string;
  callback?: () => void;
}

const ErrorPage = ({ title, message, callback }: Props) => {
  return (
    <main className="flex flex-col justify-center items-center w-full h-screen">
      <h1 className="mb-2 text-3xl text-neutral-700 font-normal">
        {title}
      </h1>

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