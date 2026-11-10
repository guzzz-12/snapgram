import { describe, it, expect, vi } from "vitest";
import { axiosInstance, setupAxiosInterceptors } from "@/utils/axiosInstance";

describe("setupAxiosInterceptors", () => {
  it("agrega el header Authorization y elimina correctamente el interceptor de peticiones durante la limpieza.", async () => {
    const getTokenMock = vi.fn().mockResolvedValue("mock-jwt-token");
    const useSpy = vi.spyOn(axiosInstance.interceptors.request, "use");
    const ejectSpy = vi.spyOn(axiosInstance.interceptors.request, "eject");

    const cleanup = setupAxiosInterceptors(getTokenMock);

    expect(useSpy).toHaveBeenCalledTimes(1);
    const registeredInterceptorId = useSpy.mock.results[0].value;

    cleanup();

    expect(ejectSpy).toHaveBeenCalledWith(registeredInterceptorId);

    useSpy.mockRestore();
    ejectSpy.mockRestore();
  });
});