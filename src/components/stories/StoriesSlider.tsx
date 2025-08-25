import { useEffect, useState } from "react";
import { CirclePlus } from "lucide-react";
import StoryCard from "./StoryCard";
import StoryCardSkeleton from "./StoryCardSkeleton";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../ui/carousel";
import { dummyStoriesData } from "@/dummy-data";

export type StoryType = typeof dummyStoriesData[0];

const StoriesSlider = () => {
  const [stories, setStories] = useState<StoryType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setStories(dummyStoriesData);
      setLoading(false);
    }, 2000);
  }, []);

  return (
    <section className="w-full">
      <Carousel
        className="w-full h-[120px]"
        opts={{ align: "start"}}
      >
        <CarouselContent>
          <CarouselItem className="basis-1/6">
            <button className="relative flex flex-col justify-center items-center gap-2 h-full aspect-[3/4] p-3 bg-neutral-100 rounded-md border-2 border-dashed border-blue-600 overflow-hidden cursor-pointer">
              <CirclePlus
                className="size-9 fill-blue-600 stroke-1 stroke-white"
                aria-hidden
              />

              <p className="text-sm text-neutral-600 font-semibold">
                Crear historia
              </p>
            </button>
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

        <CarouselPrevious disabled={loading} />

        <CarouselNext disabled={loading} />
      </Carousel>
    </section>
  )
}

export default StoriesSlider