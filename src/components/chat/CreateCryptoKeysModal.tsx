import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { OTPInput } from "input-otp";
import { IoWarningOutline } from "react-icons/io5";
import { toast } from "sonner";
import OtpInputSlot from "@/components/OtpInputSlot";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { useCheckCryptoKeys } from "@/providers/CheckCryptoKeysProvider";
import { generateKeyPair } from "@/utils/hybridCrypto";
import { decryptPrivateKeyFromPin, protectPrivateKey } from "@/utils/encryptDecryptPrivateKey";
import { axiosInstance } from "@/utils/axiosInstance";

const CreateCryptoKeysModal = () => {
  const pinRef = useRef<string>(null);

  const [createPinStep, setCreatePinStep] = useState(1);
  const [pin, setPin] = useState("");

  const { getToken } = useAuth();

  const queryClient = useQueryClient();

  const {
    hasCryptoKeys,
    loadingPrivateKey,
    openCryptoKeysModal,
    setHasCryptoKeys,
    setOpenCryptoKeysModal,
  } = useCheckCryptoKeys();

  // Mutation para crear y almacenar la llave de cifrado privada
  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      const token = await getToken();

      const keyPair = await generateKeyPair();
      
      // Cifrar la llave privada para almacenarla de manera segura en la base de datos
      const {encryptedKey, salt, iv} = await protectPrivateKey(keyPair.privateKey, pin);

      const {data} = await axiosInstance<{
        publicKey: CryptoKey;
        privateKeyLock: {
          key: string;
          salt: string;
          iv: string;
        };
      }>({
        method: "POST",
        url: "/crypto-keys/store-user-keys",
        data: {
          publicKey: keyPair.publicKey,
          privateKey: encryptedKey,
          salt,
          iv
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const {key} = data.privateKeyLock
      
      // Desencriptar la llave privada usando el pin
      const decryptedPrivateKey = await decryptPrivateKeyFromPin(key, salt, iv, pin);

      localStorage.setItem("publicKey", JSON.stringify(keyPair.publicKey));
      localStorage.setItem("privateKey", JSON.stringify(decryptedPrivateKey));

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["chats", "all"]});
      await queryClient.invalidateQueries({queryKey: ["getCryptoKeys"]});

      toast.success("Cifrado habilitado exitosamente.");

      setPin("");

      pinRef.current = null;

      setHasCryptoKeys(true);
      setCreatePinStep(1);
      setOpenCryptoKeysModal(false);
    },
    onError: (error) => {
      console.log(error);

      toast.error("Error al habilitar el cifrado de extremo a extremo. Inténtalo de nuevo.");

      setPin("");
      setCreatePinStep(1);

      pinRef.current = null;
    }
  });

  const onChangeHandler = (val: string) => {
    if (createPinStep === 1 && val.length === 6) {
      pinRef.current = val;
      setPin(val);
    }

    if (createPinStep === 2 && val.length === 6) {
      if (pinRef.current !== val) {
        toast.error("Los pins no coinciden. Inténtalo de nuevo.");
        setCreatePinStep(1);
      }
    }
  }

  return (
    <Dialog
      open={!loadingPrivateKey && !hasCryptoKeys && openCryptoKeysModal}
      onOpenChange={(isOpen) => {
        if (!hasCryptoKeys || isPending) {
          return;
        }

        setOpenCryptoKeysModal(isOpen);
      }}
    >
      <DialogOverlay className="bg-black/70" />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Habilita el cifrado de extremo a extremo del chat
          </DialogTitle>

          <DialogDescription>
            Para usar el chat debes habilitar el cifrado de extremo a extremo. <br />
            Crea un pin para habilitar el cifrado de extremo a extremo. <br />
          </DialogDescription>
        </DialogHeader>

        <div className="w-[70%] mx-auto">
          {createPinStep === 2 &&
            <p className="w-full mb-3 text-center text-neutral-700 font-semibold">
              Confirma tu pin
            </p>
          }

          { createPinStep === 1 &&
            <OTPInput
              maxLength={6}
              disabled={isPending}
              onComplete={() => setCreatePinStep(2)}
              onChange={onChangeHandler}
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
          }

          { createPinStep === 2 &&
            <OTPInput
              maxLength={6}
              disabled={isPending}
              onComplete={() => mutate()}
              onChange={onChangeHandler}
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
          }
        </div>

        <div className="flex justify-center items-center gap-2 w-full text-destructive">
          <IoWarningOutline className="size-6 shrink-0" />
          <span className="text-xs text-center">
            Si pierdes este pin no podrás recuperarlo y perderás tu historial de mensajes.
          </span>
        </div>

        <DialogFooter>
          <Button
            className="cursor-pointer"
            variant="outline"
            disabled={isPending}
            onClick={() => setOpenCryptoKeysModal(false)}
          >
            {!isPending ? "Crear en otro momento": "Guardando..."}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateCryptoKeysModal