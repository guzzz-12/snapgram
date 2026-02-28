import { axiosInstance } from "@/utils/axiosInstance";
import type { PostWithLikes, SearchUsersResult } from "@/types/global";

type SearchUsersProps = {
  page: number;
  keyword: string | null | undefined;
  getToken: () => Promise<string | null>;
  setIsSearching: (status: boolean) => void;
  setSearchType: (type: "people" | "posts" | null) => void;
}

type SearchPostsProps = {
  page: number;
  keyword: string | null | undefined;
  getToken: () => Promise<string | null>;
  setIsSearching: (status: boolean) => void;
  setSearchType: (type: "people" | "posts" | null) => void;
}

/** Función para buscar usuarios por término de búsqueda */
export const searchUsers = async ({page, keyword, getToken, setIsSearching, setSearchType}: SearchUsersProps) => {
  setIsSearching(true);
  setSearchType("people");

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
export const searchPosts = async ({keyword, page, getToken, setIsSearching, setSearchType}: SearchPostsProps) => {
  setIsSearching(true);
  setSearchType("posts");

  const token = await getToken();

  const {data} = await axiosInstance<{
    data: PostWithLikes[];
    hasMore: boolean;
    nextPage: number | null;
    totalResults: number;
  }>({
    method: "GET",
    url: "/search/search-posts",
    headers: {
      Authorization: `Bearer ${token}`
    },
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