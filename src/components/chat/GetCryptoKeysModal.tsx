import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { OTPInput } from "input-otp";
import { toast } from "sonner";
import OtpInputSlot from "@/components/OtpInputSlot";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCheckCryptoKeys } from "@/providers/CheckCryptoKeysProvider";
import { axiosInstance } from "@/utils/axiosInstance";
import { errorMessage } from "@/utils/errorMessage";
import { decryptPrivateKeyFromPin } from "@/utils/encryptDecryptPrivateKey";

const GetCryptoKeysModal = () => {
  const navigate = useNavigate();

  const [pin, setPin] = useState("");

  const {getToken} = useAuth();

  const {loadedCryptoKeys, setLoadedCryptoKeys} = useCheckCryptoKeys();

  // Query para consultar las claves del usuario si las tiene
  const {data, isFetching, error} = useQuery({
    queryKey: ["getMyCryptoKeys"],
    queryFn: async () => {
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

      setLoadedCryptoKeys(true);

      return data;
    },
    retry: 1,
    enabled: pin.length === 6,
    refetchOnWindowFocus: false
  });

  if (error) {
    toast.error(errorMessage(error));
  }

  return (
    <Dialog
      open={!loadedCryptoKeys}
      onOpenChange={(open) => {
        return false;
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Introduce tu pin de cifrado
          </DialogTitle>

          <DialogDescription>
            Introduce tu pin de 6 digitos para recuperar el historial de mensajes.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full max-w-[320px] mx-auto">
          <OTPInput
            maxLength={6}
            disabled={isFetching}
            onChange={setPin}
            render={({slots}) => {
              return (
                <div className="flex justify-center w-full">
                  {slots.map((slot, index) => (
                    <OtpInputSlot key={index} props={slot} />
                  ))}
                </div>
              )
            }}
            />
        </div>

        <DialogFooter>
          <Button
            className="cursor-pointer"
            variant="outline"
            disabled={isFetching}
            onClick={() => navigate("/")}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default GetCryptoKeysModal;