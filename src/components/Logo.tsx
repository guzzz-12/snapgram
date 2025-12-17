import type { HTMLAttributes } from "react";
import { Link } from "react-router";
import logo from "@/assets/logo-simple.webp";
import { cn } from "@/lib/utils";

interface Props {
  className?: HTMLAttributes<HTMLElement>["className"];
}

const Logo = ({ className }: Props) => {
  return (
    <Link
      className={cn("flex justify-center items-center gap-2 w-fit", className)}
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
  )
}

export default Logo