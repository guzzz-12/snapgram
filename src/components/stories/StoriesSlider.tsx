import { useEffect, useState } from "react";
import { CirclePlus } from "lucide-react";
import StoryCard from "./StoryCard";
import CreateStoryModal from "./CreateStoryModal";
import StoryCardSkeleton from "./StoryCardSkeleton";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../ui/carousel";
import { Button } from "../ui/button";
import { dummyStoriesData } from "@/dummy-data";

export type StoryType = typeof dummyStoriesData[0];

const StoriesSlider = () => {
  const [stories, setStories] = useState<StoryType[]>([]);
  const [openStoryModal, setOpenStoryModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setStories(dummyStoriesData);
      setLoading(false);
    }, 2000);
  }, []);

  return (
    <section className="w-full">
      <CreateStoryModal isOpen={openStoryModal} onClose={setOpenStoryModal} />

      <Carousel
        className="w-full min-h-[120px] mb-6"
        opts={{ align: "start"}}
      >
        <CarouselContent>
          <CarouselItem className="basis-1/6">
            <Button
              className="relative flex flex-col justify-center items-center gap-2 w-full h-auto aspect-[1/1.7] p-3 bg-neutral-100 hover:bg-neutral-200 rounded-md border-2 border-dashed border-blue-600 overflow-hidden cursor-pointer group"
              variant="ghost"
              onClick={() => setOpenStoryModal(true)}
            >
              <CirclePlus
                className="mt-auto size-9 fill-blue-600 stroke-1 stroke-white group-hover:scale-[120%] transition-transform"
                aria-hidden
              />

              <p className="mt-auto text-sm">
                Crear historia
              </p>
            </Button>
          </CarouselItem>

          {loading && Array.from({ length: 5 }).map((_, i) => (
            <CarouselItem key={i} className="basis-1/6">
              <StoryCardSkeleton />
            </CarouselItem>
          ))}

          {!loading && stories.map((story) => (
            <CarouselItem key={story._id} className="basis-1/6">
              <StoryCard storyData={story} />
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="ml-2" disabled={loading} />

        <CarouselNext className="mr-2" disabled={loading} />
      </Carousel>
    </section>
  )
}

export default StoriesSlider