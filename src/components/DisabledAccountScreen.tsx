import { GoInfo } from "react-icons/go";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";

interface Props {
  isPending: boolean;
  isSigningOut: boolean;
  mutate: () => void;
  signOutHandler: () => void;
}

const DisabledAccountScreen = ({ isPending, isSigningOut, mutate, signOutHandler }: Props) => {
  return (
    <main className="flex justify-center items-center w-full min-h-[100dvh] bg-slate-100">
      <section className="flex flex-col justify-center items-center px-10 py-4 border rounded-lg bg-white shadow">
        <h1 className="mb-2 text-center text-2xl text-neutral-900 font-semibold">
          ¿Reactivar tu cuenta?
        </h1>

        <div className="flex justify-center items-center gap-2">
          <GoInfo className="size-8 shrink-0 text-orange-700" />
          <p className="text-base text-left text-neutral-700 leading-tight">
            Desactivaste tu cuenta recientemente, <br /> para continuar debes reactivarla.
          </p>
        </div>

        <Separator className="w-full my-4 bg-neutral-200" />

        <div className="flex justify-center items-center gap-3 w-full">
          <Button
            className="cursor-pointer"
            variant="outline"
            disabled={isPending || isSigningOut}
            onClick={signOutHandler}
          >
            Cancelar
          </Button>

          <Button
            className="text-white bg-[#4F39F6] hover:bg-[#4F39F6]/80 cursor-pointer"
            disabled={isPending || isSigningOut}
            onClick={() => mutate()}
          >
            Reactivar
          </Button>
        </div>
      </section>
    </main>
  )
}

export default DisabledAccountScreen