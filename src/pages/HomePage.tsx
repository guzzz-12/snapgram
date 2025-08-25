import StoriesSlider from "@/components/stories/StoriesSlider";
import { SidebarTrigger } from "@/components/ui/sidebar";

const HomePage = () => {
  return (
    <main className="relative w-full h-full px-14 pt-6">
      <SidebarTrigger className="absolute top-4 left-1 mt-1 ml-1 cursor-pointer z-10" />
      <StoriesSlider />
    </main>
  )
}

export default HomePage