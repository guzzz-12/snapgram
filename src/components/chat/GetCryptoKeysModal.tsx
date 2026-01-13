import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OTPInput } from "input-otp";
import { toast } from "sonner";
import OtpInputSlot from "@/components/OtpInputSlot";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCheckLocalCryptoKeys } from "@/hooks/useCheckLocalCryptoKeys";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import { decryptPrivateKeyFromPin } from "@/utils/encryptDecryptPrivateKey";

const GetCryptoKeysModal = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  const [pin, setPin] = useState("");

  const {getToken} = useAuth();

  const {user, setUser} = useCurrentUser();

  const queryClient = useQueryClient();

  const {hasLocalCryptoKeys, setHasLocalCryptoKeys} = useCheckLocalCryptoKeys();

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
    <Dialog
      open={!hasLocalCryptoKeys}
      onOpenChange={(open) => {
        return false;
      }}
    >
      <DialogContent>
        <DialogHeader className="gap-1">
          <DialogTitle>
            Introduce tu pin de cifrado
          </DialogTitle>

          <DialogDescription>
            Introduce tu pin de 6 digitos para cargar tus chats.
          </DialogDescription>
        </DialogHeader>

        <Separator className="w-full bg-neutral-200" />

        <div className="w-full max-w-[320px] mx-auto">
          <OTPInput
            ref={inputRef}
            autoFocus
            maxLength={6}
            disabled={isFetching}
            value={pin}
            onChange={onChangeHandler}
            render={({slots}) => {
              return (
                <div className="flex justify-center w-full">
                  {slots.map((slot, index) => (
                    <OtpInputSlot key={index} props={{...slot, hasFakeCaret: true}} />
                  ))}
                </div>
              )
            }}
          />
        </div>

        <div className="flex justify-center items-center w-full">
          <Link
            className="text-sm text-blue-600 underline"
            to="/update-crypto-keys"
          >
            ¿Olvidaste tu pin?
          </Link>
        </div>

        <Separator className="w-full my-1 bg-neutral-200" />

        <DialogFooter>
          <Button
            className="cursor-pointer"
            variant="outline"
            disabled={isFetching}
            onClick={() => {
              setPin("");
              navigate("/")
            }}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default GetCryptoKeysModal;