import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router";
import { toast } from "sonner";
import PostCard from "@/components/posts/PostCard";
import ProfileHeader from "@/components/profile/ProfileHeader";
import PostCardSkeleton from "@/components/posts/PostCardSkeleton";
import ProfileHeaderSkeleton from "@/components/posts/ProfileHeaderSkeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { dummyPostsData, dummyUsersData, type PostType, type UserType } from "@/dummy-data";

const ProfilePage = () => {
  const {userId} = useParams<{userId: string}>();

  const [userData, setUserData] = useState<UserType | null>(null);
  const [postsData, setPostsData] = useState<PostType[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  
  useEffect(() => {
    const user = dummyUsersData.find((user) => user._id === userId)!;
    const posts = dummyPostsData.filter((post) => post.user._id === userId);

    setTimeout(() => {
      setLoadingUser(false);
      setUserData(user);
    }, 1500);

    setTimeout(() => {
      setLoadingPosts(false);
      setPostsData(posts);
    }, 2500);
  }, [userId]);

  if (!loadingUser && !userData) {
    toast.error("Usuario no encontrado.");
    return <Navigate to="/" replace />
  }

  return (
    <main className="w-full min-h-screen mx-auto p-6 bg-slate-200">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />

      <section className="w-full max-w-[800px] mx-auto mb-10">
        {loadingUser &&
          <ProfileHeaderSkeleton />
        }

        {!loadingUser && userData &&
          <ProfileHeader userData={userData} />
        }
      </section>

      <section className="flex flex-col gap-6 w-full max-w-[600px] mx-auto">
        {loadingPosts &&
          Array(3).fill(0).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))
        }

        {!loadingPosts && postsData.length > 0 &&
          postsData.map((post) => (
            <PostCard key={post._id} postData={post} />
          ))
        }

        {!loadingPosts && postsData.length === 0 &&
          <p className="text-center text-lg text-neutral-700">
            No se encontraron publicaciones.
          </p>
        }
      </section>
    </main>
  );
}

export default ProfilePage