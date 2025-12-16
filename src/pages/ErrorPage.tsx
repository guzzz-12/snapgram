import { Link } from "react-router";
import { AiOutlineReload } from "react-icons/ai";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-simple.webp";

interface Props {
  title: string;
  message: string;
  callback?: () => void;
}

const ErrorPage = ({ title, message, callback }: Props) => {
  return (
    <main className="flex flex-col justify-center items-center w-full h-screen">
      <Link
        className="flex justify-center items-center gap-2 w-fit mb-9"
        to="/"
      >
        <img
          className="w-[50px] h-auto"
          src={logo}
          alt="logo"
          aria-hidden
        />

        <h1 className="text-2xl text-neutral-900 font-semibold">
          SnapGram
        </h1>
      </Link>

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