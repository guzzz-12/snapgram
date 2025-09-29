import { Route, Routes } from "react-router";
import { useUser } from "@clerk/clerk-react";
import AuthLayout from "@/AuthLayout";
import Layout from "@/Layout";
import HomePage from "@/pages/HomePage";
import MessagesPage from "./pages/MessagesPage";
import ConnectionsPage from "@/pages/ConnectionsPage";
import CreatePostPage from "@/pages/CreatePostPage";
import DiscoverPage from "@/pages/DiscoverPage";
import ProfilePage from "@/pages/ProfilePage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import NoAuthRoute from "./components/NoAuthRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatBoxPage from "./pages/ChatBoxPage";

const App = () => {
  const {isSignedIn} = useUser();

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
          path="connections"
          element={
            <ProtectedRoute>
              <ConnectionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="create-post"
          element={
            <ProtectedRoute>
              <CreatePostPage />
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
              <ChatBoxPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile/:userId"
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