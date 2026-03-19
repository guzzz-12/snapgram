import type { HTMLAttributes } from "react";
import { Link } from "react-router";
import logo from "@/assets/logo-simple.webp";
import { cn } from "@/lib/utils";

interface Props {
  size?: "sm" | "md" | "lg";
  mode?: "light" | "dark";
  className?: HTMLAttributes<HTMLElement>["className"];
}

const Logo = ({ size = "md", mode = "light", className }: Props) => {
  return (
    <Link
      className={cn("flex justify-center items-center gap-2 w-fit", className)}
      to="/"
    >
      <img
        className={cn("h-auto", size === "sm" ? "w-[35px]" : size === "lg" ? "w-[75px]" : "w-[50px]")}
        src={logo}
        alt="logo"
        aria-hidden
      />

      <h1 className={cn("text-2xl font-semibold", mode === "light" ? "text-neutral-900" : "text-white")}>
        SnapGram
      </h1>
    </Link>
  )
}

export default Logo