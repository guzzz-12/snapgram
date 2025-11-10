import { useEffect, useState } from "react";
import { Route, Routes } from "react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import AuthLayout from "@/AuthLayout";
import Layout from "@/Layout";
import HomePage from "@/pages/HomePage";
import PostPage from "@/pages/PostPage";
import MessagesPage from "@/pages/MessagesPage";
import NotificationsPage from "@/pages/NotificationsPage";
import DiscoverPage from "@/pages/DiscoverPage";
import ProfilePage from "@/pages/ProfilePage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ErrorPage from "@/pages/ErrorPage";
import NoAuthRoute from "@/components/NoAuthRoute";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";
import { useUnreadChats } from "@/hooks/useUnreadChats";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import type { UserType } from "@/types/global";

/** Cantidad de intentos de ping al servidor */
const PING_RETRY = 6;

const App = () => {
  const {isSignedIn, isLoaded} = useUser();
  const {getToken, userId} = useAuth();

  const [serverStarted, setServerStarted] = useState(false);
  const [serverError, setServerError] = useState(false);

  const {setUser, setLoadingUser} = useCurrentUser();
  const {setUnseenNotifications} = useUnseenNotifications();
  const {addToUnreadChats} = useUnreadChats();

  // Realizar ping al servidor para inicializarlo
  // en caso de estar deshabilitado por inactividad.
  const {data: keepAliveData, status, failureCount} = useQuery({
    queryKey: ["server-ping"],
    queryFn: async () => {
      return await axiosInstance({
        method: "GET",
        url: "/ping"
      });
    },
    retry: PING_RETRY,
    refetchOnWindowFocus: false
  });

  // Actualizar el state activo del servidor
  useEffect(() => {
    setServerStarted(status === "success");

    // failureCount = primer intento + el número de retries
    if (failureCount === PING_RETRY + 1) {
      setServerError(true);
    }
  }, [status, failureCount]);

  // Consultar la data del usuario autenticado
  const {data, isLoading: loadingUser, error: userError} = useQuery({
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
    enabled: !!userId && serverStarted,
    refetchOnWindowFocus: false
  });

  // Consultar la cantidad de notificaciones no vistas
  const {data: unseenNotificationsCount, isLoading: loadingNotifications} = useQuery({
    queryKey: ["unseenNotificationsCount"],
    queryFn: async () => {
      const token = await getToken();

      const {data} = await axiosInstance<{data: number}>({
        method: "GET",
        url: "/notifications/unseen",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return data.data;
    },
    enabled: !!userId && serverStarted,
    refetchOnWindowFocus: false
  });

  // Consultar la cantidad de chats con mesajes sin leer
  const {data: unreadChatsIds, isLoading: loadingUnreadChats} = useQuery({
    queryKey: ["unseenMessagesCount"],
    queryFn: async () => {
      const token = await getToken();

      const {data} = await axiosInstance<{data: string[]}>({
        method: "GET",
        url: "/chats/get-unread-chats",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return data.data;
    },
    enabled: !!userId && serverStarted,
    refetchOnWindowFocus: false
  });

  // Actualizar el state global del usuario
  useEffect(() => {
    setLoadingUser(loadingUser);

    if (data) {
      setUser(data);
    }
  }, [data, loadingUser]);

  // Actualizar el state del contador de notificaciones no vistas
  useEffect(() => {
    setUnseenNotifications(unseenNotificationsCount ?? 0);
  }, [unseenNotificationsCount]);

  // Actualizar el state del contador de chats sin leer
  useEffect(() => {
    if (unreadChatsIds && unreadChatsIds.length > 0) {
      addToUnreadChats(unreadChatsIds);
    }
  }, [unreadChatsIds]);

  if (userError) {
    toast.error(errorMessage(userError));
  }

  const isLoading = loadingUser || loadingNotifications || loadingUnreadChats;

  // Mostrar el loading mientras se inicia el servidor y se cargan los datos
  if ((!serverStarted && !serverError) || !isLoaded || isLoading) {
    return (
      <div className="flex justify-center items-center gap-2 h-screen w-full bg-neutral-50">
        <Loader2Icon className="size-[40px] text-[#4F39F6] animate-spin" />
      </div>
    )
  }

  // Mostrar pantalla de error si hay error en el servidor
  if (serverError) {
    return (
      <ErrorPage
        title="¡Oops! Algo salió mal"
        message="Actualiza la página e inténtalo de nuevo"
      />
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
          path="post/:postId"
          element={
            <ProtectedRoute>
              <PostPage />
            </ProtectedRoute>
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
          path="messages/:chatId"
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