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
import AuthPage from "@/pages/AuthPage";
import StoriesPage from "@/pages/StoriesPage";
import ErrorPage from "@/pages/ErrorPage";
import UpdateCryptoKeysPage from "@/pages/UpdateCryptoKeysPage";
import NoAuthRoute from "@/components/NoAuthRoute";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useGetCurrentUser } from "./services/user";
import { useGetUnseenNotificationsCount } from "./services/notifications";
import { useGetUnreadChats } from "./services/chats";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";
import { useUnreadChats } from "@/hooks/useUnreadChats";
import { axiosInstance, setupAxiosInterceptors } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

/** Cantidad de intentos de ping al servidor */
const PING_RETRY = 6;

const App = () => {
  const { isSignedIn, isLoaded } = useUser();
  const { userId, signOut, getToken } = useAuth();

  const [serverStarted, setServerStarted] = useState(false);
  const [serverError, setServerError] = useState(false);

  const { user: currentUser, setUser, setLoadingUser } = useCurrentUser();
  const { setUnseenNotifications } = useUnseenNotifications();
  const { addToUnreadChats } = useUnreadChats();

  // Realizar ping al servidor para inicializarlo
  // en caso de estar deshabilitado por inactividad.
  const { data: keepAliveData, status: serverStatus, failureCount } = useQuery({
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
    setServerStarted(serverStatus === "success");

    // failureCount = primer intento + el número de retries
    if (failureCount === PING_RETRY + 1) {
      setServerError(true);
    }
  }, [serverStatus, failureCount]);

  // Inicializar el interceptor de axios para incluir el token en cada consulta
  useEffect(() => {
    if (serverStarted) {
      setupAxiosInterceptors(getToken);
    }
  }, [serverStarted, getToken]);

  // Consultar la data del usuario autenticado
  const { userData, loadingUser, userError } = useGetCurrentUser({
    enabled: !!userId && serverStarted
  });

  // Consultar la cantidad de notificaciones no vistas
  const { unseenNotificationsCount, loadingNotifications } = useGetUnseenNotificationsCount({
    enabled: serverStarted && !!currentUser
  });

  // Consultar la cantidad de chats con mesajes sin leer
  const { unreadChatsIds, loadingUnreadChats } = useGetUnreadChats({
    enabled: serverStarted && !!currentUser
  });

  // Cerrar sesión en caso de error al consultar el usuario
  useEffect(() => {
    if (userError) {
      signOut()
        .then(() => {
          toast.error("Ocurrió un error al iniciar sesión.");
        })
        .catch((_error) => { });
    }
  }, [userError]);

  // Actualizar el state global del usuario
  useEffect(() => {
    setLoadingUser(loadingUser);

    if (userData) {
      setUser(userData);
    }
  }, [userData, loadingUser]);

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
        <Route index element={!isSignedIn ? <AuthPage type="login" /> : <HomePage />} />

        <Route
          path="login"
          element={
            <NoAuthRoute>
              <AuthPage type="login" />
            </NoAuthRoute>
          }
        />

        <Route
          path="signup"
          element={
            <NoAuthRoute>
              <AuthPage type="signup" />
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
          path="stories/:username"
          element={
            <ProtectedRoute>
              <StoriesPage />
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

        <Route
          path="/update-crypto-keys"
          element={
            <ProtectedRoute>
              <UpdateCryptoKeysPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

export default App