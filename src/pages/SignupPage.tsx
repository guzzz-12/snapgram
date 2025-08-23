import { SignUp } from "@clerk/clerk-react";
import { Star } from "lucide-react";
import users from "@/assets/group_users.png";

const SignupPage = () => {
  return (
    <main className="flex justify-center items-center w-full h-full grow">
      <div className="flex justify-between items-center gap-12 w-full max-w-[1280px] h-full translate-y-[-50px]">
        <section className="flex flex-col gap-4 w-[60%] h-full">
          <div className="flex justify-start items-center gap-2">
            <img
              className="w-[120px] h-auto"
              src={users}
              alt="Grupo de usuarios"
            />

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-0.5">
                {Array(5).fill(0).map((_, i) => {
                  return (
                    <Star
                      key={i}
                      className="size-4 text-yellow-600 fill-yellow-600"
                    />
                  )
                })}
              </div>

              <p className="text-left text-sm text-neutral-700">
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
              </p>
            </div>
          </div>

          <h1 className="text-5xl text-neutral-700 font-bold text-left">
            Más que sólo una red social
          </h1>

          <p className="text-left text-neutral-700 font-semibold">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam
            doloremque quae, natus quidem officia accusamus deserunt.
          </p>
        </section>

        <section className="flex flex-col gap-2 grow h-full">
          <SignUp signInUrl="/login" />
        </section>
      </div>
    </main>
  )
}

export default SignupPage