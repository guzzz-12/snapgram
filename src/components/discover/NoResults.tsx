import type { RefObject } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
import { Button } from "../ui/button";

interface Props {
  term: string;
  searchType: "people" | "posts";
  setTerm: (term: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

const NoResults = ({term, searchType, setTerm, searchInputRef}: Props) => {
  const navigate = useNavigate();

  const onClickHandler = () => {
    if (!searchInputRef.current) return;

    // Scrollear al top
    window.scrollTo(0, 0);

    searchInputRef.current.focus();
    
    setTerm("");

    navigate("/discover", {replace: true});
  }

  return (
    <section className="flex flex-col justify-center items-center gap-8 w-full h-[420px] p-5 rounded-md bg-white shadow">
      <div className="flex justify-center items-center w-16 h-16 bg-[#4F39F6]/10 rounded-full">
        <Search className="size-8 text-[#4F39F6]" />
      </div>

      <div className="flex flex-col justify-center items-center gap-1 w-full max-w-[70%]">
        <p className="text-center text-xl text-neutral-700 ">
          No se encontraron {searchType === "people" ? "personas" : "publicaciones"} para <span className="font-semibold">"{term}"</span>
        </p>

        <span className="text-center text-sm text-neutral-600">
          Asegúrate de que la ortografía sea correcta.
        </span>

        <Button
          className="mt-6 text-white bg-[#4F39F6] hover:bg-[#331fcf] hover:text-white cursor-pointer"
          variant="outline"
          onClick={onClickHandler}
        >
          Intentar otra búsqueda
        </Button>
      </div>
    </section>
  )
}

export default NoResults