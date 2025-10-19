import { Search } from "lucide-react";

const Placeholder = () => {
  return (
    <section className="flex flex-col justify-center items-center gap-8 w-full h-[420px] p-5 rounded-md bg-white shadow">
      <div className="flex justify-center items-center w-16 h-16 bg-[#4F39F6]/10 rounded-full">
        <Search className="size-8 text-[#4F39F6]" />
      </div>

      <div className="flex flex-col justify-center items-center gap-1 w-full max-w-[70%]">
        <h2 className="text-center text-2xl text-neutral-700 font-semibold">
          Explora y descubre
        </h2>

        <span className="text-center text-base text-neutral-600">
          Explora contenido popular y cuentas que se adapten a tus pasiones.
        </span>
      </div>
    </section>
  )
}

export default Placeholder