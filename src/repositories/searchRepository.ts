import { axiosInstance } from "@/utils/axiosInstance";
import type { PostWithLikes, SearchUsersResult } from "@/types/global";

type SearchUsersProps = {
  page: number;
  keyword: string | null | undefined;
  setIsSearching: (status: boolean) => void;
  setSearchType: (type: "people" | "posts" | null) => void;
}

type SearchPostsProps = {
  page: number;
  keyword: string | null | undefined;
  setIsSearching: (status: boolean) => void;
  setSearchType: (type: "people" | "posts" | null) => void;
}

/** Función para buscar usuarios por término de búsqueda */
export const searchUsers = async ({page, keyword, setIsSearching, setSearchType}: SearchUsersProps) => {
  setIsSearching(true);
  setSearchType("people");

  const {data} = await axiosInstance<{
    data: SearchUsersResult[];
    hasMore: boolean;
    nextPage: number | null;
  }>({
    method: "GET",
    url: "/search/search-users",
    params: {
      keyword,
      page,
      limit: 10
    }
  });

  setIsSearching(false);
  setSearchType(null);

  return data;
}


/** Función para buscar posts por término de búsqueda */
export const searchPosts = async ({keyword, page, setIsSearching, setSearchType}: SearchPostsProps) => {
  setIsSearching(true);
  setSearchType("posts");

  const {data} = await axiosInstance<{
    data: PostWithLikes[];
    hasMore: boolean;
    nextPage: number | null;
    totalResults: number;
  }>({
    method: "GET",
    url: "/search/search-posts",
    params: {
      page,
      keyword,
      limit: 5
    }
  });

  setIsSearching(false);
  setSearchType(null);

  return data;
}