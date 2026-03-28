import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { OTPInput } from "input-otp";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import OtpInputSlot from "@/components/OtpInputSlot";
import { useCryptoKeysService } from "@/services/cryptoKeysService";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCheckLocalCryptoKeys } from "@/hooks/useCheckLocalCryptoKeys";
import { errorMessage } from "@/utils/errorMessage";

const GetCryptoKeys = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [pin, setPin] = useState("");

  const {user, setUser} = useCurrentUser();

  const queryClient = useQueryClient();

  const {hasLocalCryptoKeys, setHasLocalCryptoKeys} = useCheckLocalCryptoKeys();

  const {getUserCryptoKeys} = useCryptoKeysService();
  
  // Query para consultar las claves de cifrado del usuario y almacenarlas en el localStorage
  const {status, isFetching, error} = getUserCryptoKeys({user, pin});

  useEffect(() => {
    if (status === "success" && user && !hasLocalCryptoKeys) {
      setUser({...user, hasCryptoKeys: true});
      setHasLocalCryptoKeys(true);
    }
  }, [user, status, isFetching]);

  // Restablecer el input y resetear la consulta al cerrar el modal
  useEffect(() => {
    return () => {
      setPin("");
      queryClient.resetQueries({queryKey: ["getMyCryptoKeys"]});
    }
  }, []);

  // Mostrar el error si lo hay
  useEffect(() => {
    if (error) {
      if (error.message.toLowerCase().includes("incorrecto")) {
        setPin("");        
      }

      toast.dismiss();
      toast.error(errorMessage(error));
      
      inputRef.current?.focus();
    }
  }, [error]);

  const onChangeHandler = (val: string) => {
    if (val.length > 6) return;

    setPin(val);
  }

  if (!user) {
    return null;
  }

  return (
    <section className="flex flex-col justify-center items-center w-full max-w-[420px] h-full mx-auto px-4">
      <div className="flex flex-col justify-center items-center gap-1 mb-6">
        <h2 className="text-xl text-left font-semibold leading-tight">
          Introduce tu pin de cifrado
        </h2>

        <span className="text-sm text-neutral-600 text-left leading-tight">
          Introduce tu pin de 6 digitos para cargar tus chats.
        </span>
      </div>

      <div className="relative w-full mx-auto mb-2 shrink-0">
        {isFetching &&
          <div className="absolute top-0 left-0 flex justify-center items-center w-full h-full bg-white opacity-75 rounded-lg z-10">
            <Loader2Icon className="size-7 text-[#4F39F6] animate-spin" />
          </div>
        }

        <OTPInput
          ref={inputRef}
          className="border-none"
          autoFocus
          maxLength={6}
          disabled={isFetching}
          value={pin}
          onChange={onChangeHandler}
          render={({slots}) => {
            return (
              <div className="flex justify-center w-full">
                {slots.map((slot, index) => (
                  <OtpInputSlot
                    key={index}
                    props={{...slot, hasFakeCaret: true}}
                  />
                ))}
              </div>
            )
          }}
        />
      </div>

      <div className="flex justify-center items-center w-full mb-4">
        <Link
          className="text-sm text-blue-600 underline"
          to="/update-crypto-keys"
        >
          ¿Olvidaste tu pin?
        </Link>
      </div>
    </section>
  )
}

export default GetCryptoKeys