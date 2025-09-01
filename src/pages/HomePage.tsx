import PostCard from "@/components/posts/PostCard";
import StoriesSlider from "@/components/stories/StoriesSlider";
import { SidebarTrigger } from "@/components/ui/sidebar";
import RightSidebar from "@/components/RightSidebar";
import { dummyPostsData } from "@/dummy-data";

const HomePage = () => {
  return (
    <main className="pageWrapper">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />
      <div className="w-full h-full shrink-[2]">
        <StoriesSlider />
        
        <section className="flex flex-col gap-6 w-full">
          {dummyPostsData.map((post) => (
            <PostCard key={post._id} postData={post} />
          ))}
        </section>
      </div>

      <RightSidebar />
    </main>
  )
}

export default HomePage