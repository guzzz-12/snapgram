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
  const searchType = searchParams.get("type") as "people" | "posts" | null;

  const [term, setTerm] = useState("");
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
          loading={isSearchingUsers || isSearchingPosts}
          searchType={searchType}
          setTerm={(term) => setTerm(term)}
          searchInputRef={searchInputRef}
        />
        
        <FiltersBar
          searchTerm={searchTerm}
          searchType={searchType}
          loading={isSearchingUsers || isSearchingPosts}
        />

        {!isSearchingUsers && !isSearchingPosts && !searchTerm &&
          <Placeholder />
        }

        <UsersSearchResults
          searchTerm={searchTerm}
          searchType={searchType}
          setTerm={setTerm}
          searchInputRef={searchInputRef}
          setIsSearchingUsers={(isSearching) => setIsSearchingUsers(isSearching)}
        />
        
        <PostsSearchResults
          searchTerm={searchTerm}
          searchType={searchType}
          setTerm={setTerm}
          searchInputRef={searchInputRef}
          setIsSearchingUsers={(isSearching) => setIsSearchingPosts(isSearching)}
        />
      </section>
    </main>
  )
}

export default DiscoverPage