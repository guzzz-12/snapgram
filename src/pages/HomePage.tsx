import PostCard from "@/components/posts/PostCard";
import StoriesSlider from "@/components/stories/StoriesSlider";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { dummyPostsData } from "@/dummy-data";

const HomePage = () => {
  return (
    <main className="relative flex justify-between gap-12 w-full h-full px-14 pt-6 pb-9 bg-slate-200">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />
      <div className="w-full h-full shrink-[2]">
        <StoriesSlider />
        
        <section className="flex flex-col gap-6 w-full">
          {dummyPostsData.map((post) => (
            <PostCard key={post._id} postData={post} />
          ))}
        </section>
      </div>

      <aside className="w-[320px] h-full shrink-[1] p-1 rounded-md shadow bg-neutral-100">
        <p>Sección de sugerencias</p>
      </aside>
    </main>
  )
}

export default HomePage