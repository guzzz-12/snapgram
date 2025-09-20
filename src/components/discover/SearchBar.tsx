import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { useDebounce } from "@/hooks/useDebounce";

interface Props {
  loading: boolean;
}

const SearchBar = ({loading}: Props) => {
  const navigate = useNavigate();

  const [term, setTerm] = useState("");

  const {debouncedValue} = useDebounce(term);
  
  useEffect(() => {
    if (debouncedValue.length > 0) {
      navigate(`/discover?searchTerm=${debouncedValue}`);      
    } else {
      navigate("/discover");
    }
  }, [debouncedValue]);

  return (
    <search className="w-full p-4 bg-white rounded-md shadow border">
      <div className="relative">
        <Search className="absolute top-1/2 left-2 -translate-y-1/2 text-neutral-500" />

        <Input
          className="pl-10 bg-slate-100"
          type="search"
          placeholder="Buscar personas por nombre, email, username o biografía"
          disabled={loading}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>
    </search>
  )
}

export default SearchBar