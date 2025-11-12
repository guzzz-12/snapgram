import { Link } from "react-router";
import Slider from "react-slick";
import { SLIDER_SETTINGS } from "@/utils/constants";
import type { PostType, PostWithLikes } from "@/types/global";

interface Props {
  data: PostType | PostWithLikes;
}

const PostCardSlider = ({data}: Props) => {
  return (
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
  )
}

export default PostCardSlider