declare global {
  namespace NodeJS {
    interface ProcessEnv {
      VITE_BASE_URL: string;
      VITE_SERVER_URL: string;
      VITE_API_URL: string;
      VITE_CLERK_PUBLISHABLE_KEY: string;
      VITE_IMAGEKIT_PUBLIC_KEY: string;
    }
  }
}

export {};
