import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { Link } from "react-router";
import { MapPin, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ConnectionType, FollowingType } from "@/dummy-data"
import { axiosInstance } from "@/utils/axiosInstance";

interface Props {
  data: ConnectionType;
  following: FollowingType[];
  setFollowing: Dispatch<SetStateAction<FollowingType[]>>;
}

const DiscoverCard = ({ data, following, setFollowing }: Props) => {
  const [loading, setLoading] = useState(false);

  const followHandler = async () => {
    try {
      setLoading(true);
      const {data: followingData} = await axiosInstance<{data: FollowingType[]}>({
        method: "GET",
        url: `/users/follow-or-unfollow?userId=${data._id}`
      });

      setFollowing(followingData.data);

    } catch (error: any) {
      toast.error(error.message);

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col p-5 border rounded-md bg-white">
      <div className="flex flex-col items-center w-full overflow-hidden">
        <Link to={`/profile/${data._id}`}>
          <Avatar className="w-[50px] h-[50px] mb-2">
            <AvatarImage src={data.profile_picture} />
            <AvatarFallback>
              {data.full_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>        
        </Link>

        <Link to={`/profile/${data._id}`}>
          <p className="w-full text-center font-semibold truncate">
            {data.full_name}
          </p>
        </Link>

        <p className="w-full text-sm text-center text-neutral-700 truncate">
          @{data.username}
        </p>
      </div>

      <Separator className="w-full my-3" />

      <p className="w-full mb-4 text-sm text-center text-neutral-700 line-clamp-4">
        {data.bio}
      </p>

      <div className="flex justify-center items-center gap-2 w-full mb-4">
        <Badge
          className="basis-1/2 bg-neutral-50 rounded-full overflow-hidden"
          variant="outline"
        >
          <MapPin className="shrink-0" />
          <span className="truncate">{data.location}</span>
        </Badge>
        
        <Badge
          className="basis-1/2 bg-neutral-50 rounded-full overflow-hidden"
          variant="outline"
        >
          <span className="truncate">2 followers</span>
        </Badge>
      </div>

      <div className="flex justify-start items-center gap-2 w-full">
        <Button
          className="grow text-sm text-center text-white bg-[#4F39F6] hover:bg-[#331fcf] transition-colors cursor-pointer"
          size="sm"
          disabled={loading}
          onClick={followHandler}
        >
          {following.some((user) => user.followed._id === data._id) ? "Siguiendo" : "Seguir"}
        </Button>

        <Button className="shrink-0 cursor-pointer" size="icon" variant="outline">
          <MessageCircle aria-hidden />
          <span className="sr-only">Enviar mensaje a {data.full_name}</span>
        </Button>
      </div>
    </div>
  )
}

export default DiscoverCard