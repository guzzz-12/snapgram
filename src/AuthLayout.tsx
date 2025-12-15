import { Link, Outlet } from "react-router";
import { useUser } from "@clerk/clerk-react";
import logo from "@/assets/logo-simple.webp";

const AuthLayout = () => {  
  const {isLoaded} = useUser();

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="relative flex flex-col min-h-screen">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white to-[#4F39F6]/10"/>

      <header className="flex justify-center min-[700px]:justify-start items-center w-full max-w-[1280px] mx-auto mb-1 min-[700px]:mb-0 p-4 z-10">
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

            <h1 className="text-xl font-semibold">
              SnapGram
            </h1>
          </Link>
        </nav>
      </header>

      <section className="relative flex justify-center items-center grow px-4 z-10">
        <Outlet />
      </section>

      <footer className="w-full p-4 bg-white z-10">
        <nav className="w-full max-w-[1280px] mx-auto">
          <p className="text-center text-sm text-neutral-700">
            &copy; {new Date().getFullYear()} SnapGram. Todos los derechos reservados.
          </p>
        </nav>
      </footer>
    </div>
  )
}

export default AuthLayout