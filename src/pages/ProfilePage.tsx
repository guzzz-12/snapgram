import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { dummyUsersData, type UserType } from "@/dummy-data";

const ProfilePage = () => {
  const {userId} = useParams<{userId: string}>();

  const [userData, setUserData] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setTimeout(() => {
      setLoading(false);

      const user = dummyUsersData.find((user) => user._id === userId);

      if (user) {
        setUserData(user);
      }
    }, 1500);
  }, [userId]);

  if (!loading && !userData) {
    toast.error("Usuario no encontrado.");
    return <Navigate to="/" replace />
  }

  return (
    <main className="min-h-screen p-6 bg-slate-200">
      <SidebarTrigger className="absolute block md:hidden top-4 left-4 cursor-pointer z-10" />

      {loading &&
        <section className="flex justify-center items-center w-full h-screen">
          <Loader2Icon className="size-10 animate-spin text-neutral-900" />
        </section>
      }
      
      {!loading && userData &&
        <section className="flex flex-col gap-6 w-full max-w-[800px] mx-auto">
          <ProfileHeader userData={userData} />
        </section>
      }
    </main>
  );
}

export default ProfilePage