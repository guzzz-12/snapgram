import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { FiSearch } from "react-icons/fi";
import { Input } from "@/components/ui/input";

interface Props {
  searchTerm: string;
  autoFocus?: boolean;
  setSearchTerm: Dispatch<SetStateAction<string>>;
}

const UsersSearchBar = (props: Props) => {
  const { searchTerm, autoFocus, setSearchTerm } = props;

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && autoFocus) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <search className="relative bg-white" aria-labelledby="searchLabel">
      <FiSearch
        className="absolute left-2 top-1/2 size-5 text-neutral-500 translate-y-[-50%]"
        aria-hidden
      />

      <label className="sr-only" htmlFor="searchInput">
        Buscar amigos por nombre o por usuario.
      </label>

      <Input
        ref={inputRef}
        id="searchInput"
        className="pl-9"
        type="search"
        placeholder="Busca por nombre o usuario..."
        disabled={false}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <span id="searchLabel" className="sr-only">
        Buscar amigos por nombre o por usuario.
      </span>
    </search>
  )
}

export default UsersSearchBar