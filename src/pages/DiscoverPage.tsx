import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import SearchBar from "@/components/discover/SearchBar";
import FiltersBar from "@/components/discover/FiltersBar";
import UsersSearchResults from "@/components/discover/UsersSearchResults";
import PostsSearchResults from "@/components/discover/PostsSearchResults";
import Placeholder from "@/components/discover/Placeholder";
import { SidebarTrigger } from "@/components/ui/sidebar";

const DiscoverPage = () => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("searchTerm");

  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<"users" | "posts">("users");
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isSearchingPosts, setIsSearchingPosts] = useState(false);

  return (
    <main className="pageWrapper">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />

      <section className="flex flex-col gap-6 w-full max-w-[900px] mx-auto">
        <div className="">
          <h1 className="text-2xl font-semibold">
            Descubre
          </h1>

          <p className="text-base text-neutral-700">
            Descubre publicaciones y personas que compartan tus pasiones
          </p>
        </div>

        <SearchBar
          term={term}
          setTerm={(term) => setTerm(term)}
          loading={isSearchingUsers || isSearchingPosts}
          searchInputRef={searchInputRef}
        />
        
        <FiltersBar
          filter={filter}
          searchTerm={searchTerm}
          loading={isSearchingUsers || isSearchingPosts}
          setFilter={setFilter}
        />

        {!isSearchingUsers && !isSearchingPosts && !searchTerm &&
          <Placeholder />
        }

        <UsersSearchResults
          filter={filter}
          searchTerm={searchTerm}
          setTerm={setTerm}
          searchInputRef={searchInputRef}
          setIsSearchingUsers={(isSearching) => setIsSearchingUsers(isSearching)}
        />
        
        <PostsSearchResults
          filter={filter}
          searchTerm={searchTerm}
          setTerm={setTerm}
          searchInputRef={searchInputRef}
          setIsSearchingUsers={(isSearching) => setIsSearchingPosts(isSearching)}
        />
      </section>
    </main>
  )
}

export default DiscoverPage