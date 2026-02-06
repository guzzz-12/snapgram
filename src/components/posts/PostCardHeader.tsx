import { useState, type HTMLAttributes } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import dayjs from "dayjs";
import PostOptionsDropdown from "./PostOptionsDropdown";
import DeletePostModal from "./DeletePostModal";
import EditHistoryModal from "./EditHistoryModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PostWithLikes } from "@/types/global";
import { cn } from "@/lib/utils";

interface Props {
  postData: PostWithLikes;
  className?: HTMLAttributes<HTMLElement>["className"];
  setisEditingPost: (value: boolean) => void;
};

const PostCardHeader = ({ postData, className, setisEditingPost }: Props) => {
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openChangelogModal, setOpenChangelogModal] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const {userId} = useAuth();

  const isPending = isDeletingPost

  return (
    <div className={cn("flex justify-start items-center gap-3 w-full", className)}>
      <Link
        className={cn(isPending && "pointer-events-none")}
        to={`/profile/${postData.user.clerkId}`}
      >
        <Avatar className="w-[40px] h-[40px] shrink-0 outline-2 outline-blue-600 outline-offset-1">
          <AvatarImage
            className="w-full h-full object-cover"
            src={postData.user.profilePicture}
          />
          <AvatarFallback className="w-full h-full object-cover">
            {postData.user.fullName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex flex-col justify-between items-start gap-0 w-full overflow-hidden">
        <Link
          className={cn("w-full font-semibold text-neutral-900 truncate", isPending && "pointer-events-none")}
          to={`/profile/${postData.user.clerkId}`}
        >
          {postData.user.fullName}
        </Link>

        <Link
          className="text-sm text-neutral-700"
          to={`/post/${postData._id}`}
          title={dayjs(postData.createdAt).format("dddd, DD [de] MMMM [de] YYYY [a las] hh:mm a")}
        >
          {dayjs(postData.createdAt).fromNow().replace("hace", "Hace")}
        </Link>
      </div>

      <DeletePostModal
        isOpen={openDeleteModal}
        postId={postData._id}
        setIsDeleting={(bool) => setIsDeletingPost(bool)}
        setIsOpen={setOpenDeleteModal}
      />

      <EditHistoryModal
        title="Historial de cambios"
        author={postData.user}
        changeLog={postData.changeLog}
        isOpen={openChangelogModal}
        setIsOpen={(bool) => setOpenChangelogModal(bool)}
      />

      <PostOptionsDropdown
        postData={postData}
        userId={userId}
        isPending={isPending}
        setisEditingPost={setisEditingPost}
        setOpenDeleteModal={setOpenDeleteModal}
        setOpenChangelogModal={setOpenChangelogModal}
      />
    </div>
  )
}

export default PostCardHeader