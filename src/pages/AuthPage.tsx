import { SignIn, SignUp } from "@clerk/clerk-react";

const AuthPage = ({type}: {type: "login" | "signup"}) => {
  return (
    <main className="flex flex-col min-[900px]:flex-row justify-between items-center gap-8 min-[900px]:gap-12 w-full max-w-[1280px] h-full pb-6">
      <section className="flex flex-col gap-2 min-[900px]:gap-4 w-[60%] h-full">
        <h1 className="text-4xl text-center min-[900px]:text-left text-neutral-700 font-bold">
          Tu espacio, tus historias. <br /> Sube, Comparte, Inspira.
        </h1>

        <p className="text-center min-[900px]:text-left text-neutral-600">
          Comparte tu vida, chatea, comparte ideas geniales y encuentra esa comunidad que siempre has estado buscando. ¡Fácil y sin rollos!
        </p>
      </section>

      <section className="flex flex-col gap-2 grow h-full">
        {type === "login" ? <SignIn signUpUrl="/signup"/> : <SignUp signInUrl="/login"/>}
      </section>
    </main>
  )
}

export default AuthPage