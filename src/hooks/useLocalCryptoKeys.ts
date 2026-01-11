import { useEffect, useState } from "react";

/** Hook para verificar si las claves del usuario estan guardadas en el localStorage */
export const useLocalCryptoKeys = () => {
  const [hasLocalCryptoKeys, setHasLocalCryptoKeys] = useState(false);

  useEffect(() => {
    const pubKey = localStorage.getItem("publicKey");
    const privKey = localStorage.getItem("privateKey");

    setHasLocalCryptoKeys(!!pubKey && !!privKey);
  }, []);

  return { hasLocalCryptoKeys, setHasLocalCryptoKeys };
}