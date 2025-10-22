import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Image, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  searchTerm: string | null;
  searchType: "people" | "posts" | null;
  loading: boolean;
}

const FiltersBar = ({searchTerm, searchType}: Props) => {
  const queryClient = useQueryClient();

  return (
    <div className="flex justify-start items-center gap-3 w-full pb-3 border-b border-[#4F39F6]/20">
      <Link
        className={cn("flex justify-center items-center gap-2 px-4 py-2 text-neutral-600 rounded-full bg-white hover:bg-[#4F39F6] hover:text-white transition-colors cursor-pointer disabled:text-neutral-500 disabled:pointer-events-none disabled:bg-white", searchType === "people" && "bg-[#331fcf] text-white")}
        to={`/discover/?searchTerm=${searchTerm}&type=people`}
        onClick={() => {
          queryClient.invalidateQueries({
            queryKey: ["search", searchTerm, "people"]
          });
        }}
      >
        <UserCheck />
        <span>Personas</span>
      </Link>

      <Link
        className={cn("flex justify-center items-center gap-2 px-4 py-2 text-neutral-600 rounded-full bg-white hover:bg-[#4F39F6] hover:text-white transition-colors cursor-pointer disabled:text-neutral-500 disabled:pointer-events-none disabled:bg-white", searchType === "posts" && "bg-[#331fcf] text-white")}
        to={`/discover/?searchTerm=${searchTerm}&type=posts`}
        onClick={() => {
          queryClient.invalidateQueries({
            queryKey: ["search", searchTerm, "posts"]
          });
        }}
      >
        <Image />
        <span>Publicaciones</span>
      </Link>
    </div>
  )
}

export default FiltersBar