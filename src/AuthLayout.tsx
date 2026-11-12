import { Link, Outlet } from "react-router";
import ThemeToggle from "./components/ThemeToggle";
import { useAuthContext } from "./providers/AuthProvider";
import logo from "@/assets/logo-simple.webp";

const AuthLayout = () => {
  const { isLoaded } = useAuthContext();

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-white dark:bg-slate-950">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white to-[#4F39F6]/10 dark:from-slate-950 dark:to-[#4F39F6]/15" />

      <header className="flex justify-between items-center w-full max-w-[1280px] mx-auto mb-1 min-[700px]:mb-0 p-4 z-10">
        <nav className="w-fit">
          <Link
            className="flex justify-start items-center gap-2"
            to="/"
          >
            <img
              className="w-10 h-10"
              src={logo}
              alt="logo"
            />

            <h1 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
              SnapGram
            </h1>
          </Link>
        </nav>

        <ThemeToggle variant="icon" />
      </header>

      <section className="relative flex justify-center items-center grow px-4 z-10">
        <Outlet />
      </section>

      <footer className="w-full p-4 bg-white dark:bg-slate-900 border-t border-transparent dark:border-slate-800 z-10">
        <nav className="w-full max-w-[1280px] mx-auto">
          <p className="text-center text-sm text-neutral-700 dark:text-slate-400">
            &copy; {new Date().getFullYear()} SnapGram. Todos los derechos reservados.
          </p>
        </nav>
      </footer>
    </div>
  )
}

export default AuthLayout