import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { AxiosError } from "axios";
import { FaUserTimes } from "react-icons/fa";
import { toast } from "sonner";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileHeaderSkeleton from "@/components/posts/ProfileHeaderSkeleton";
import PostsTabContent from "@/components/profile/PostsTabContent";
import FollowersTabContent from "@/components/profile/FollowersTabContent";
import FollowingTabContent from "@/components/profile/FollowingTabContent";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { axiosInstance } from "@/utils/axiosInstance";
import { ACCOUNT_STATUS } from "@/utils/constants";
import type { UserType } from "@/types/global";

const ProfilePage = () => {
  const {userClerkId} = useParams<{userClerkId: string}>();
  const navigate = useNavigate();

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

  // Query para consultar los datos del usuario
  const {data: userData, isLoading: loadingUser, error: userError} = useQuery({
    queryKey: ["user", userClerkId],
    queryFn: getUser,
    enabled: !!userClerkId,
    refetchOnWindowFocus: false,
    retry: 1
  });

  if (userError) {
    const isClientError = userError instanceof AxiosError;

    const message = isClientError && userError.response?.data.message;

    const isBlocked = message === ACCOUNT_STATUS.isBlocked;
    const isDisabled = message === ACCOUNT_STATUS.accountDisabled;
    const isNotFound = isClientError && userError.response?.status === 404;

    if (isBlocked || isDisabled) {
      return (
        <main className="flex justify-center items-center w-full h-screen">
          <section className="flex flex-col justify-center items-center w-full max-w-[600px] mx-auto p-6 bg-white shadow border rounded-md">
            <FaUserTimes className="block mb-5 size-[80px] text-neutral-700 shrink-0" />
  
            <h1 className="text-center text-xl font-semibold text-neutral-700">
              Este perfil no está disponible actualmente.
            </h1>

            <p className="mb-5 text-center text-sm text-neutral-600">
              Es posible que el usuario haya desactivado su cuenta, <br /> te haya bloqueado o lo hayas bloqueado.
            </p>

            <Button
              className="w-[100px] cursor-pointer"
              onClick={() => navigate("/", {replace: true})}
            >
              Volver
            </Button>
          </section>
        </main>
      )
    }

    if (isNotFound) {
      toast.error("Usuario no encontrado.");
      return <Navigate to="/" replace />
    }

    toast.error("Error al obtener el usuario.");
  }

  return (
    <main className="w-full min-h-screen mx-auto p-6 bg-slate-200">
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