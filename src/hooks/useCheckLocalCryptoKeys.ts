import { create } from "zustand";

interface State {
  hasLocalCryptoKeys: boolean;
  checkLocalCryptoKeys: () => void;
  setHasLocalCryptoKeys: (value: boolean) => void;
}

/** State global para chequear si el usuario tiene claves de cifrado guardadas en el localStorage */
export const useCheckLocalCryptoKeys = create<State>((set) => ({
  hasLocalCryptoKeys: false,

  checkLocalCryptoKeys: () => {
    const pubKey = localStorage.getItem("publicKey");
    const privKey = localStorage.getItem("privateKey");
    set({ hasLocalCryptoKeys: !!pubKey && !!privKey });
  },

  setHasLocalCryptoKeys: (value) => set({ hasLocalCryptoKeys: value }),
}));