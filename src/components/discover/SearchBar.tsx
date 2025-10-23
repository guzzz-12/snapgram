import { useEffect, type RefObject } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { useDebounce } from "@/hooks/useDebounce";

interface Props {
  term: string;
  loading: boolean;
  searchType: "people" | "posts" | null;
  searchInputRef: RefObject<HTMLInputElement | null>;
  setTerm: (term: string) => void;
}

const SearchBar = ({loading, term, searchType, setTerm, searchInputRef}: Props) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("searchTerm");

  // Inicializar el searchTerm si existe al actualizar la página
  useEffect(() => {
    if (searchTerm) {
      setTerm(searchTerm);
    }
  }, [searchTerm]);

  const {debouncedValue} = useDebounce(term);

  // Enfocar el input cuando se cargue la página y cuando termine de buscar
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loading]);
  
  useEffect(() => {
    if (debouncedValue.length > 0 && searchType) {
      navigate(`/discover?searchTerm=${debouncedValue}&type=${searchType}`);      
    }

    // Por defecto buscar personas si no se especifica el tipo de búsqueda
    if (debouncedValue.length > 0 && !searchType) {
      navigate(`/discover?searchTerm=${debouncedValue}&type=people`);
    }
  }, [debouncedValue, searchType]);

  return (
    <search className="w-full p-4 bg-white rounded-md shadow border">
      <div className="relative">
        <Search className="absolute top-1/2 left-2 -translate-y-1/2 text-neutral-500" />

        <Input
          ref={searchInputRef}
          className="pl-10 bg-slate-100"
          type="search"
          placeholder="Introduce un término para buscar personas o publicaciones..."
          disabled={loading}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>
    </search>
  )
}

export default SearchBar