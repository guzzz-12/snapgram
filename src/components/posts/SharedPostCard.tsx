import { Link } from "react-router";
import Slider from "react-slick";
import dayjs from "dayjs";
import { FaLock } from "react-icons/fa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { PostType } from "@/types/global";
import { SLIDER_SETTINGS } from "@/utils/constants";

interface Props {
  data: PostType;
}

const SharedPostCard = ({data}: Props) => {
  const isOriginalPostDeleted = !data._id;

  return (
    <div className="flex flex-col w-full p-4 border rounded-md bg-neutral-100">
      {isOriginalPostDeleted &&
        <div className="flex flex-col justify-center items-center p-4">
          <h2 className="text-center text-lg text-neutral-600 font-semibold">
            Este contenido no está disponible
          </h2>

          <Separator className="w-full my-1 bg-neutral-200" />

          <div className="flex justify-center items-center w-full gap-3">
            <FaLock className="size-7 text-neutral-400 shrink-0" />
            <p className="text-sm text-neutral-600">
              Esto ocurre si el autor eliminó el contenido o si ha sido compartido con una audiencia privada.
            </p>
          </div>
        </div>
      }

      {!isOriginalPostDeleted &&
        <>
          <Link
            className="flex justify-start items-center gap-2 mb-2"
            to={`/profile/${data.user.clerkId}`}
          >
            <Avatar className="w-[30px] h-[30px] shrink-0">
              <AvatarImage
                className="w-full h-full object-cover"
                src={data.user.profilePicture}
                alt={data.user.username}
              />

              <AvatarFallback className="w-full h-full object-cover">
                {data.user.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col w-full overflow-hidden">
              <p className="w-full text-sm text-neutral-900 font-semibold truncate">
                {data.user.fullName}
              </p>

              <p className="text-xs text-neutral-700">
                {dayjs(data.createdAt).format("[Publicado el] DD/MM/YYYY [a las] hh:mm a")}
              </p>
            </div>
          </Link>

          <p className="mb-2 text-sm text-neutral-900 line-clamp-6">
            {data.content}
          </p>

          {data.imageUrls.length > 0 &&
            <Slider
              className="postCardSlider"
              {...SLIDER_SETTINGS}
            >
              {data.imageUrls.map((imageUrl, index) => (
                <Link
                  key={index}
                  to={`/post/${data._id}`}
                  style={{
                    filter: "blur(15px)",
                    backgroundImage: `url(${imageUrl})`
                  }}
                  className="relative w-full aspect-[4/3] rounded-lg bg-neutral-200 overflow-hidden cursor-pointer"
                >
                  <div
                    style={{
                      filter: "blur(15px)",
                      backgroundImage: `url(${imageUrl})`
                    }}
                    className="absolute top-0 left-0 w-full h-full opacity-70 bg-cover bg-center bg-no-repeat z-0"
                  />
                  
                  <img
                    className="relative w-full h-full object-contain z-30"
                    src={imageUrl}
                    alt={`Post de ${data.user.fullName}`}
                  />
                </Link>
              ))}
            </Slider>
          }
        </>
      }
    </div>
  )
}

export default SharedPostCard