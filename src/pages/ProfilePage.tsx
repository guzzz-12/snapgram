import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileHeaderSkeleton from "@/components/posts/ProfileHeaderSkeleton";
import PostsTabContent from "@/components/profile/PostsTabContent";
import FollowersTabContent from "@/components/profile/FollowersTabContent";
import FollowingTabContent from "@/components/profile/FollowingTabContent";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { axiosInstance } from "@/utils/axiosInstance";
import type { UserType } from "@/types/global";

const ProfilePage = () => {
  const {userClerkId} = useParams<{userClerkId: string}>();

  const [activeTab, setActiveTab] = useState("posts");

  const {getToken} = useAuth();

  // Restablecer el tab default al cambiar de usuario
  useEffect(() => {
    setActiveTab("posts");
  }, [userClerkId]);

  const getUser = async () => {
    const token = await getToken();

    const {data} = await axiosInstance<{data: UserType}>({
      method: "GET",
      url: `/users/${userClerkId}`,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return data.data;
  }

  const {data: userData, isLoading: loadingUser, error: userError} = useQuery({
    queryKey: ["user", userClerkId],
    queryFn: getUser,
    enabled: !!userClerkId,
    refetchOnWindowFocus: false
  });

  if (!loadingUser && !userData) {
    toast.error("Usuario no encontrado.");
    return <Navigate to="/" replace />
  }

  if (userError) {
    toast.error("Error al obtener el usuario.");
  }

  return (
    <main className="w-full min-h-screen mx-auto p-6 bg-slate-200">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />

      <section className="w-full max-w-[900px] mx-auto">
        {loadingUser &&
          <ProfileHeaderSkeleton />
        }

        {!loadingUser && userData &&
          <ProfileHeader userData={userData} />
        }
      </section>

      {!loadingUser &&
        <section className="w-full max-w-[900px] mx-auto">
          <Tabs
            className="w-full pb-10" 
            defaultValue={activeTab}
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="flex items-center w-full h-auto mx-auto my-4 px-4 py-2 bg-white shadow-sm">
              <TabsTrigger
                className="!text-[16px] !text-center font-normal rounded-none border-t-0 border-l-0 border-r-0 border-b-3 border-transparent cursor-pointer transition-all data-[state=active]:text-[#4F39F6] data-[state=active]:font-semibold data-[state=active]:border-[#4F39F6] data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                value="posts"
              >
                {userData?.postsCount} Posts
              </TabsTrigger>

              <TabsTrigger
                className="text-[16px] font-normal rounded-none border-t-0 border-l-0 border-r-0 border-b-3 border-transparent cursor-pointer transition-all data-[state=active]:text-[#4F39F6] data-[state=active]:font-semibold data-[state=active]:border-[#4F39F6] data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                value="followers"
              >
                {userData?.followersCount} Seguidores
              </TabsTrigger>

              <TabsTrigger
                className="text-[16px] font-normal rounded-none border-t-0 border-l-0 border-r-0 border-b-3 border-transparent cursor-pointer transition-all data-[state=active]:text-[#4F39F6] data-[state=active]:font-semibold data-[state=active]:border-[#4F39F6] data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                value="following"
              >
                {userData?.followingCount} Siguiendo
              </TabsTrigger>
            </TabsList>

            <TabsContent className="w-full" value="posts">
              {userData && <PostsTabContent userData={userData} />}
            </TabsContent>

            <TabsContent className="w-full" value="followers">
              {userData && <FollowersTabContent userData={userData} />}
            </TabsContent>

            <TabsContent className="w-full" value="following">
              {userData && <FollowingTabContent userData={userData} />}
            </TabsContent>
          </Tabs>
        </section>
      }
    </main>
  );
}

export default ProfilePage