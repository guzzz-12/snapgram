import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import SearchBar from "@/components/discover/SearchBar";
import FiltersBar from "@/components/discover/FiltersBar";
import UsersSearchResults from "@/components/discover/UsersSearchResults";
import PostsSearchResults from "@/components/discover/PostsSearchResults";
import Placeholder from "@/components/discover/Placeholder";
import { useSearchStatus } from "@/hooks/useSearchStatus";

const DiscoverPage = () => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("searchTerm");
  const searchTypeParam = searchParams.get("type") as "people" | "posts" | null;

  const [term, setTerm] = useState("");

  const {isSearching, searchType} = useSearchStatus();

  const isSearchingUsers = isSearching && searchType === "people";
  const isSearchingPosts = isSearching && searchType === "posts";

  return (
    <main className="pageWrapper">
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
          searchType={searchTypeParam}
          setTerm={(term) => setTerm(term)}
          searchInputRef={searchInputRef}
        />
        
        <FiltersBar
          searchTerm={searchTerm}
          searchType={searchTypeParam}
          loading={isSearchingUsers || isSearchingPosts}
        />

        {!isSearchingUsers && !isSearchingPosts && !searchTerm &&
          <Placeholder />
        }

        <UsersSearchResults
          searchTerm={searchTerm}
          searchType={searchTypeParam}
          setTerm={setTerm}
          searchInputRef={searchInputRef}
        />
        
        <PostsSearchResults
          searchTerm={searchTerm}
          searchType={searchTypeParam}
          setTerm={setTerm}
          searchInputRef={searchInputRef}
        />
      </section>
    </main>
  )
}

export default DiscoverPage