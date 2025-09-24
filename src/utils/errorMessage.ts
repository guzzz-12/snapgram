import { AxiosError } from "axios";

export const errorMessage = (error: Error | AxiosError) => {
  let message = error.message;

  if (error instanceof AxiosError) {
    message = error.response?.data.message;
  }

  return message;
}