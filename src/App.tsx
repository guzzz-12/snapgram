import { useEffect } from "react";
import { Route, Routes } from "react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import AuthLayout from "@/AuthLayout";
import Layout from "@/Layout";
import HomePage from "@/pages/HomePage";
import MessagesPage from "@/pages/MessagesPage";
import NotificationsPage from "@/pages/NotificationsPage";
import DiscoverPage from "@/pages/DiscoverPage";
import ProfilePage from "@/pages/ProfilePage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import NoAuthRoute from "@/components/NoAuthRoute";
import ProtectedRoute from "@/components/ProtectedRoute";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { UserType } from "@/types/global";

const App = () => {
  const {isSignedIn} = useUser();
  const {getToken, userId} = useAuth();

  const {setUser, setLoadingUser} = useCurrentUser();

  // Consultar la data del usuario autenticado
  const {data, isFetching, error} = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const token = await getToken();

      const {data} = await axiosInstance<{data: UserType}>({
        method: "GET",
        url: `/users/${userId}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return data.data;
    },
    enabled: !!userId,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    setLoadingUser(isFetching);

    if (data) {
      setUser(data);
    }
  }, [data, isFetching]);

  if (error) {
    toast.error(errorMessage(error));
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-neutral-50">
        <Loader2Icon className="size-[30px] text-neutral-700 animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={!isSignedIn ? <AuthLayout /> : <Layout />}>
        <Route index element={!isSignedIn ? <LoginPage /> : <HomePage />} />
        <Route
          path="login"
          element={
            <NoAuthRoute>
              <LoginPage />
            </NoAuthRoute>
          }
        />
        <Route
          path="signup"
          element={
            <NoAuthRoute>
              <SignupPage />
            </NoAuthRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="discover"
          element={
            <ProtectedRoute>
              <DiscoverPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="messages/:userId"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile/:userClerkId"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

export default App