import PostCard from "@/components/posts/PostCard";
import StoriesSlider from "@/components/stories/StoriesSlider";
import { SidebarTrigger } from "@/components/ui/sidebar";
import RecentMessages from "@/components/RecentMessages";
import sponsoredImg from "@/assets/sponsored_img.png";
import { dummyPostsData } from "@/dummy-data";

const HomePage = () => {
  return (
    <main className="relative flex justify-between gap-24 w-full h-full px-24 pt-6 pb-9 bg-slate-200">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />
      <div className="w-full h-full shrink-[2]">
        <StoriesSlider />
        
        <section className="flex flex-col gap-6 w-full">
          {dummyPostsData.map((post) => (
            <PostCard key={post._id} postData={post} />
          ))}
        </section>
      </div>

      <aside className="sticky top-0 flex max-xl:hidden flex-col gap-4 w-[270px] h-full shrink-0 rounded-md bg-transparent">
        <div className="flex flex-col w-full p-3 rounded-lg bg-white shadow">
          <p className="mb-1 text-sm text-neutral-600 font-semibold">
            Patrocinado
          </p>

          <img
            className="w-full h-auto mb-4 rounded-lg"
            src={sponsoredImg}
            alt="Patrocinado"
          />

          <h2 className="mb-1 text-neutral-700 font-semibold">
            Email Marketing
          </h2>

          <p className="text-sm text-neutral-600">
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Sint consectetur perferendis at consequatur provident mollitia atque facilis.
          </p>
        </div>

        <RecentMessages />
      </aside>
    </main>
  )
}

export default HomePage