import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { axiosInstance } from "@/utils/axiosInstance";

interface State {
  isMounted: boolean;
  hasCryptoKeys: boolean;
  openCryptoKeysModal: boolean;
  openGetCryptoKeysModal: boolean;
  loadingPrivateKey: boolean;
  setHasCryptoKeys: (hasCryptoKeys: boolean) => void;
  setOpenCryptoKeysModal: (open: boolean) => void;
  setOpenGetCryptoKeysModal: (open: boolean) => void;
}

const CheckCryptoKeysContext = createContext<State>({
  isMounted: false,
  hasCryptoKeys: false,
  openCryptoKeysModal: false,
  openGetCryptoKeysModal: false,
  loadingPrivateKey: true,
  setHasCryptoKeys: () => {},
  setOpenCryptoKeysModal: () => {},
  setOpenGetCryptoKeysModal: () => {}
});

/** Provider para verificar si el usuario tiene claves de cifrado */
export const CheckCryptoKeysProvider = ({ children }: { children: ReactNode }) => {
  const {pathname} = useLocation();

  const [isMounted, setIsMounted] = useState(false);
  const [hasCryptoKeys, setHasCryptoKeys] = useState(false);

  const [openCryptoKeysModal, setOpenCryptoKeysModal] = useState(false);
  const [openGetCryptoKeysModal, setOpenGetCryptoKeysModal] = useState(false);

  const { getToken } = useAuth();

  // Se verifica si el usuario tiene claves de cifrado almacenadas en el localStorage
  useEffect(() => {
    const localPublicKey = localStorage.getItem("publicKey");
    const localPrivateKey = localStorage.getItem("privateKey");

    setHasCryptoKeys(!!localPublicKey && !!localPrivateKey);

    setIsMounted(true);

    return () => {
      setIsMounted(false);
    }
    
  }, [pathname]);

  // Query para consultar si el usuario tiene claves de cifrado
  const {data, isFetching: loadingPrivateKey, error: privateKeyError} = useQuery({
    queryKey: ["getCryptoKeys"],
    queryFn: async () => {
      const token = await getToken();

      const {data} = await axiosInstance<{hasCryptoKeys: boolean}>({
        method: "GET",
        url: "/crypto-keys/check-my-keys",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Se actualiza el estado de si el usuario tiene claves de cifrado
      setHasCryptoKeys(data.hasCryptoKeys);

      // Se abre el modal de crear claves de cifrado si el usuario no las ha creado
      setOpenCryptoKeysModal(!data.hasCryptoKeys);

      // Se abre el modal de obtener las claves de cifrado si el usuario ya las ha creado
      if (data.hasCryptoKeys) {
        setOpenGetCryptoKeysModal(true);
      }

      return data;
    },
    enabled: !hasCryptoKeys && isMounted,
    retry: 1,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    return () => {
      if (!hasCryptoKeys && isMounted) {
        setOpenCryptoKeysModal(true);
      }
    }
  }, [pathname, hasCryptoKeys, isMounted]);
  
  if (privateKeyError) {
    toast.error("Error al obtener tus claves de cifrado. Inténtalo de nuevo.");
  }

  return (
    <CheckCryptoKeysContext.Provider
      value={{ isMounted,
        hasCryptoKeys,
        openCryptoKeysModal,
        openGetCryptoKeysModal,
        loadingPrivateKey,
        setHasCryptoKeys,
        setOpenCryptoKeysModal,
        setOpenGetCryptoKeysModal
      }}
    >
      {children}
    </CheckCryptoKeysContext.Provider>
  );
}

export const useCheckCryptoKeys = () => {
  const context = useContext(CheckCryptoKeysContext);

  if (!context) {
    throw new Error("useCheckCryptoKeys debe usarse dentro del provider <CheckCryptoKeysProvider />");
  }

  return context;
}