import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import AuthLayout from "@/AuthLayout";
import Layout from "@/Layout";
import ErrorPage from "@/pages/ErrorPage";
import NoAuthRoute from "@/components/NoAuthRoute";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useGetCurrentUser } from "./services/user";
import { useGetUnseenNotificationsCount } from "./services/notifications";
import { useGetUnreadChats } from "./services/chats";
import { useAuthContext } from "./providers/AuthProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUnseenNotifications } from "@/hooks/useUnseenNotifications";
import { useUnreadChats } from "@/hooks/useUnreadChats";
import { axiosInstance, setupAxiosInterceptors } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";

const HomePage = lazy(() => import("@/pages/HomePage"));
const PostPage = lazy(() => import("@/pages/PostPage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const DiscoverPage = lazy(() => import("@/pages/DiscoverPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const StoriesPage = lazy(() => import("@/pages/StoriesPage"));
const UpdateCryptoKeysPage = lazy(() => import("@/pages/UpdateCryptoKeysPage"));

const PageLoader = () => (
  <div className="flex justify-center items-center gap-2 h-screen w-full bg-neutral-50">
    <Loader2Icon className="size-[40px] text-[#4F39F6] animate-spin" />
  </div>
);

/** Cantidad de intentos de ping al servidor */
const PING_RETRY = 6;

const App = () => {
  const { isSignedIn, isLoaded, userId, signOut, getToken } = useAuthContext();

  const [interceptorReady, setInterceptorReady] = useState(false);

  const { setUser, setLoadingUser } = useCurrentUser();
  const { setUnseenNotifications } = useUnseenNotifications();
  const { addToUnreadChats } = useUnreadChats();

  // Realizar ping al servidor para inicializarlo
  // en caso de estar deshabilitado por inactividad.
  const { status: serverStatus, failureCount } = useQuery({
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

  const serverStarted = serverStatus === "success";
  const serverError = serverStatus === "error" || failureCount >= PING_RETRY + 1;

  // Inicializar el interceptor de axios y limpiarlo al desmontar o cambiar getToken
  useEffect(() => {
    if (!serverStarted) {
      setInterceptorReady(false);
      return;
    }

    const ejectInterceptor = setupAxiosInterceptors(getToken);
    setInterceptorReady(true);

    return () => {
      ejectInterceptor();
    };
  }, [serverStarted, getToken]);

  const canFetchAuthenticatedData = Boolean(userId && serverStarted && interceptorReady);

  // Consultar la data del usuario autenticado, notificaciones y chats en paralelo
  const { userData, loadingUser, userError } = useGetCurrentUser({
    enabled: canFetchAuthenticatedData
  });

  const { unseenNotificationsCount, loadingNotifications } = useGetUnseenNotificationsCount({
    enabled: canFetchAuthenticatedData
  });

  const { unreadChatsIds, loadingUnreadChats } = useGetUnreadChats({
    enabled: canFetchAuthenticatedData
  });

  // Cerrar sesión y notificar en caso de error al consultar el usuario
  useEffect(() => {
    if (!userError) return;

    toast.error(errorMessage(userError));

    signOut()
      .then(() => {
        toast.error("Ocurrió un error al iniciar sesión.");
      })
      .catch(() => {});
  }, [userError, signOut]);

  // Actualizar el state global del usuario
  useEffect(() => {
    setLoadingUser(loadingUser);

    if (userData) {
      setUser(userData);
    }
  }, [userData, loadingUser, setLoadingUser, setUser]);

  // Actualizar el state del contador de notificaciones no vistas
  useEffect(() => {
    setUnseenNotifications(unseenNotificationsCount ?? 0);
  }, [unseenNotificationsCount, setUnseenNotifications]);

  // Actualizar el state del contador de chats sin leer
  useEffect(() => {
    if (unreadChatsIds && unreadChatsIds.length > 0) {
      addToUnreadChats(unreadChatsIds);
    }
  }, [unreadChatsIds, addToUnreadChats]);

  const isLoading = loadingUser || loadingNotifications || loadingUnreadChats;

  // Mostrar el loading mientras se inicia el servidor y se cargan los datos
  if ((!serverStarted && !serverError) || !isLoaded || (Boolean(userId) && !interceptorReady) || isLoading) {
    return (
      <div className="flex justify-center items-center gap-2 h-screen w-full bg-neutral-50">
        <Loader2Icon className="size-[40px] text-[#4F39F6] animate-spin" />
      </div>
    );
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
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
  )
}

export default App