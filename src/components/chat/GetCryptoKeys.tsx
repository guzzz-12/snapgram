import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OTPInput } from "input-otp";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import OtpInputSlot from "@/components/OtpInputSlot";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCheckLocalCryptoKeys } from "@/hooks/useCheckLocalCryptoKeys";
import { axiosInstance } from "@/utils/axiosInstance";
import { decryptPrivateKeyFromPin } from "@/utils/encryptDecryptPrivateKey";
import { errorMessage } from "@/utils/errorMessage";

const GetCryptoKeys = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [pin, setPin] = useState("");

  const {getToken} = useAuth();

  const {user, setUser} = useCurrentUser();

  const queryClient = useQueryClient();

  const {setHasLocalCryptoKeys} = useCheckLocalCryptoKeys();

  // Query para consultar las claves del usuario si las tiene
  const {error, isFetching} = useQuery({
    queryKey: ["getMyCryptoKeys"],
    queryFn: async () => {
      if (!user) {
        return;
      }

      const token = await getToken();

      const {data} = await axiosInstance<{
        publicKey: CryptoKey;
        privateKeyLock: {
          key: string;
          salt: string;
          iv: string;
        };
      }>({
        method: "GET",
        url: "/crypto-keys/get-my-keys",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const {key, salt, iv} = data.privateKeyLock

      const decryptedPrivateKey = await decryptPrivateKeyFromPin(key, salt, iv, pin);

      localStorage.setItem("publicKey", JSON.stringify(data.publicKey));
      localStorage.setItem("privateKey", JSON.stringify(decryptedPrivateKey));

      setUser({...user, hasCryptoKeys: true});

      setHasLocalCryptoKeys(true);

      return data;
    },
    retry: false,
    enabled: pin.length === 6,
    refetchOnWindowFocus: false,
  });

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
    <section className="flex flex-col justify-center items-center w-fit h-full mx-auto px-4">
      <div className="flex flex-col justify-center items-center gap-1 mb-6">
        <h2 className="text-xl text-left font-semibold leading-tight">
          Introduce tu pin de cifrado
        </h2>

        <span className="text-sm text-neutral-600 text-left leading-tight">
          Introduce tu pin de 6 digitos para cargar tus chats.
        </span>
      </div>

      <div className="relative w-full max-w-[320px] mx-auto mb-2 shrink-0">
        {isFetching &&
          <div className="absolute top-0 left-0 flex justify-center items-center w-full h-full bg-white opacity-75 rounded-lg z-10">
            <Loader2Icon className="text-[#4F39F6] animate-spin" />
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