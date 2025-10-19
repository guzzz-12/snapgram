import type { Dispatch, SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Image, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  filter: "users" | "posts";
  searchTerm: string | null;
  loading: boolean;
  setFilter: Dispatch<SetStateAction<"users" | "posts">>;
}

const FiltersBar = ({filter, searchTerm, setFilter}: Props) => {
  const queryClient = useQueryClient();

  return (
    <div className="flex justify-start items-center gap-3 w-full pb-3 border-b border-[#4F39F6]/20">
      <button
        className={cn("flex justify-center items-center gap-2 px-4 py-2 text-neutral-600 rounded-full bg-white hover:bg-[#4F39F6] hover:text-white transition-colors cursor-pointer disabled:text-neutral-500 disabled:pointer-events-none disabled:bg-white", filter === "users" && "bg-[#331fcf] text-white")}
        disabled={!searchTerm}
        onClick={async () => {
          await queryClient.invalidateQueries({queryKey: ["search", searchTerm, "users"]});
          setFilter("users");
        }}
      >
        <UserCheck />
        <span>Personas</span>
      </button>

      <button
        className={cn("flex justify-center items-center gap-2 px-4 py-2 text-neutral-600 rounded-full bg-white hover:bg-[#4F39F6] hover:text-white transition-colors cursor-pointer disabled:text-neutral-500 disabled:pointer-events-none disabled:bg-white", filter === "posts" && "bg-[#331fcf] text-white")}
        disabled={!searchTerm}
        onClick={async () => {
          await queryClient.invalidateQueries({queryKey: ["search", searchTerm, "posts"]});
          setFilter("posts");
        }}
      >
        <Image />
        <span>Publicaciones</span>
      </button>
    </div>
  )
}

export default FiltersBar