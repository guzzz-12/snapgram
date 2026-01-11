import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { OTPInput } from "input-otp";
import { IoWarningOutline } from "react-icons/io5";
import { toast } from "sonner";
import Logo from "./Logo";
import OtpInputSlot from "./OtpInputSlot";
import ConfirmationModal from "./ConfirmationModal";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Toaster } from "./ui/sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCheckLocalCryptoKeys } from "@/hooks/useCheckLocalCryptoKeys";
import { generateKeyPair } from "@/utils/hybridCrypto";
import { decryptPrivateKeyFromPin, protectPrivateKey } from "@/utils/encryptDecryptPrivateKey";
import { axiosInstance } from "@/utils/axiosInstance";

const CreateCryptoKeysScreen = ({operation}: {operation: "create" | "update"}) => {
  const pinRef = useRef<string>(null);

  const navigate = useNavigate();

  const { user, setUser } = useCurrentUser();

  const [createPinStep, setCreatePinStep] = useState(1);
  const [pin, setPin] = useState("");
  const [openConfirmationModal, setOpenConfirmationModal] = useState(false);

  const { getToken, signOut } = useAuth();

  const queryClient = useQueryClient();

  const {setHasLocalCryptoKeys} = useCheckLocalCryptoKeys();

  // Mutation para crear y almacenar la llave de cifrado privada
  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
      if (!user) {
        return;
      }

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
        params: {
          operation
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const {key} = data.privateKeyLock;
      
      // Desencriptar la llave privada usando el pin
      const decryptedPrivateKey = await decryptPrivateKeyFromPin(key, salt, iv, pin);

      localStorage.setItem("publicKey", JSON.stringify(keyPair.publicKey));
      localStorage.setItem("privateKey", JSON.stringify(decryptedPrivateKey));

      setUser({...user, hasCryptoKeys: true});

      setHasLocalCryptoKeys(true);

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["chats", "all"]});
      await queryClient.invalidateQueries({queryKey: ["getCryptoKeys"]});

      toast.success("Cifrado habilitado exitosamente.");

      setPin("");

      pinRef.current = null;

      setCreatePinStep(1);
      
      if (operation === "update") {
        setOpenConfirmationModal(false);
        navigate("/messages?type=all", {replace: true});        
      }
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

  const onCompleteHandler = () => {
    if (operation === "create") {
      mutate();
    } else {
      setOpenConfirmationModal(true);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <main className="flex justify-center items-center w-full h-screen bg-neutral-200">
      <ConfirmationModal
        isOpen={openConfirmationModal}
        isPending={isPending}
        title="Actualizar pin de cifrado"
        description="Estás a punto de actualizar tu pin de cifrado. Perderás permanentemente el acceso a los mensajes anteriores en todos tus chats. Esta acción no se puede deshacer."
        cb={mutate}
        setIsOpen={setOpenConfirmationModal}
      />

      <section className="w-full max-w-[600px] mx-auto p-6 rounded-lg bg-white shadow">
        {operation === "create" && <Logo className="mb-4" />}

        <h1 className="mb-1 text-left text-2xl text-neutral-900 font-semibold">
          {operation === "create" ? "Habilita el cifrado de extremo a extremo del chat" : "Actualizar pin de cifrado"}
        </h1>

        {operation === "create" &&
          <p className="text-left text-sm text-neutral-700 leading-tight">
            Para continuar debes habilitar el cifrado de extremo a extremo. <br />
            Crea un pin para habilitar el cifrado de extremo a extremo.
          </p>
        }

        {operation === "update" &&
          <p className="text-left text-sm text-neutral-700 leading-tight">
            Actualiza tu pin de cifrado de extremo a extremo del chat.
          </p>
        }

        <Separator className="w-full my-6" />

        <div className="w-[70%] mx-auto mb-2">
          {createPinStep === 2 &&
            <p className="w-full mb-3 text-center text-neutral-700 font-semibold">
              Confirma tu pin
            </p>
          }

          { createPinStep === 1 &&
            <OTPInput
              autoFocus
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
              autoFocus
              maxLength={6}
              disabled={isPending}
              onComplete={onCompleteHandler}
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

        <div className="flex justify-center items-center gap-2 w-full mb-6 text-destructive">
          <IoWarningOutline className="size-7 shrink-0" />
          {operation === "create" &&
            <span className="text-sm text-center leading-tight">
              Si pierdes este pin no podrás recuperar tu historial de mensajes.
            </span>
          }

          {operation === "update" &&
            <span className="text-sm text-left leading-tight">
              Al actualizar tu pin de cifrado de extremo a extremo, <br /> perderas todos los mensajes anteriores.
            </span>
          }
        </div>

        <div className="flex justify-end items-center w-full">
          <Button
            className="cursor-pointer"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              if (isPending) return;

              if (operation === "create") {
                signOut();
              } else {
                navigate("/", {replace: true});
              }
            }}
          >
            {!isPending ? "Cancelar": "Guardando..."}
          </Button>
        </div>
      </section>

      <Toaster position="bottom-right" />
    </main>
  )
}

export default CreateCryptoKeysScreen