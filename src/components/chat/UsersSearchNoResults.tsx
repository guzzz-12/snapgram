import { SearchX } from "lucide-react";

const UsersSearchNoResults = () => {
  return (
    <li className="flex justify-center items-center gap-1 w-full">
      <SearchX className="size-6 text-neutral-600 shrink-0 stroke-1" />
      <p className="text-sm text-neutral-600">
        No se encontraron resultados
      </p>
    </li>
  )
}

export default UsersSearchNoResults