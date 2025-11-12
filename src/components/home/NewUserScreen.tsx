import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2Icon, Search } from "lucide-react";
import { toast } from "sonner";
import UserSearchResultItem from "./UserSearchResultItem";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useDebounce } from "@/hooks/useDebounce";
import useIntersectionObserver from "@/hooks/useIntersectionObserver";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { SearchUsersResult } from "@/types/global";

const NewUserScreen = () => {
  const paginationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const {getToken} = useAuth();

  const {debouncedValue} = useDebounce(searchTerm);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  });

  // Función para buscar los usuarios
  const searchUsers = async (page: number, term: string) => {
    const token = await getToken();

    const {data} = await axiosInstance<{
      data: SearchUsersResult[];
      hasMore: boolean;
      nextPage: number | null;
    }>({
      method: "GET",
      url: "/search/search-users",
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page,
        limit: 5,
        keyword: term
      }
    });

    return data;
  }

  const {data: usersData, error, isLoading, isFetchingNextPage, status, hasNextPage, fetchNextPage} = useInfiniteQuery({
    queryKey: ["search-users", debouncedValue],
    queryFn: ({pageParam}) => searchUsers(pageParam, debouncedValue),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    refetchOnWindowFocus: false,
    enabled: debouncedValue.trim().length > 0,
    retry: 1
  });

  const {isIntersecting} = useIntersectionObserver({data: usersData, paginationRef});

  // Consultar las siguientes paginas de usuarios cuando la referencia de la paginación sea visible
  useEffect(() => {
    if (isIntersecting) {
      fetchNextPage();
    }
  }, [isIntersecting]);

  const onChangeHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.currentTarget.value);
  }

  if (error) {
    toast.error(errorMessage(error));
  }

  const users = usersData?.pages.flatMap((page) => page.data) ?? [];

  return (
    <section className="flex flex-col justify-start items-center w-full max-w-[600px] h-full mx-auto">
      {/* <UserRoundPlus className="size-[100px] text-[#4F39F6] stroke-[0.5px]"/> */}

      <h1 className="mt-1 text-3xl text-center text-neutral-700 font-light leading-[1.1]">
        Comienza a seguir cuentas <br /> para ver más contenido
      </h1>

      <div className="flex flex-col gap-3 w-full h-[420px] mt-6 p-4 bg-white rounded-lg overflow-hidden">
        <div className="relative w-full mb-6 bg-neutral-100 rounded-full shadow">
          <Search className="absolute left-2 top-1/2 size-6 text-neutral-500 translate-y-[-50%] stroke-1 z-10" />

          <Input
            ref={inputRef}
            type="search"
            className="w-full h-full px-4 pl-10 py-3 rounded-full border-none"
            placeholder="Busca amigos o creadores de contenido..."
            disabled={isLoading || isFetchingNextPage}
            value={searchTerm}
            onChange={onChangeHandler}
          />
        </div>

        <div className="flex flex-col w-full h-full translate-y-[-20px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          {!isLoading && status === "pending" && users.length === 0 &&
            <div className="flex flex-col justify-center items-center gap-2 w-full h-full">
              <Search className="size-[50px] text-[#4F39F6] stroke-1" />
              <p className="text-center text-base text-neutral-700 leading-tight">
                Explora y descubre contenido <br /> que se adapte a tus pasiones
              </p>
            </div>
          }

          {isLoading && users.length === 0 &&
            <div className="flex justify-center items-center w-full h-full">
              <Loader2Icon className="size-[30px] text-[#4F39F6] animate-spin" />
            </div>
          }

          {users.length > 0 &&
            <ul className="flex flex-col gap-2 w-full h-full">
              {users.map((user) => (
                <UserSearchResultItem key={user.clerkId} userData={user} />
              ))}
            </ul>
          }

          {isFetchingNextPage &&
            <div className="flex justify-center items-center w-full h-[60px]">
              <Loader2Icon className="size-[30px] text-[#4F39F6] animate-spin" />
            </div>
          }

          {!hasNextPage && status === "success" && searchTerm &&
            <div className="flex flex-col items-center gap-2 w-full mt-auto">
              <Separator className="w-full" />
              <span className="text-sm text-neutral-600">
                No hay mas resultados
              </span>
            </div>
          }

          {hasNextPage && !isFetchingNextPage &&
            <div ref={paginationRef} className="w-full h-10" />
          }
        </div>
      </div>
    </section>
  )
}

export default NewUserScreen