import { Link, Outlet } from "react-router";
import { useUser } from "@clerk/clerk-react";
import bgImage from "@/assets/bgImage.webp";
import logo from "@/assets/logo-simple.webp";

const AuthLayout = () => {  
  const {isLoaded} = useUser();

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="relative flex flex-col min-h-screen">
      <img
        className="absolute top-0 left-0 w-full h-full object-cover opacity-50"
        src={bgImage}
      />

      <header className="w-full p-4 z-10">
        <nav className="w-full max-w-[1280px] mx-auto">
          <Link
            className="flex justify-start items-center gap-2"
            to="/"
          >
            <img
              className="w-8 h-8"
              src={logo}
              alt="logo"
            />
            <h1>SnapGram</h1>
          </Link>
        </nav>
      </header>

      <section className="relative flex flex-col justify-center grow px-4 z-10">
        <Outlet />
      </section>
    </div>
  )
}

export default AuthLayout