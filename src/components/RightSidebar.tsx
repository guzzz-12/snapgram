import RecentMessages from "./RecentMessages";
import sponsoredImg from "@/assets/sponsored_img.webp";

const RightSidebar = () => {
  return (
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
  )
}

export default RightSidebar