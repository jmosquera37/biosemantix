import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkBackendHealth,
  getApiBaseUrl,
  getGeneDetails,
} from "./biosemantix";

type FetchOptions = { method?: string; signal?: AbortSignal };

function pendingFetch() {
  return (_url: string, options: FetchOptions) =>
    new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("checkBackendHealth", () => {
  it("devuelve true cuando el backend responde correctamente", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkBackendHealth()).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, FetchOptions];
    expect(String(url)).toMatch(/\/$/);
    expect(options.method).toBe("GET");
  });

  it("devuelve false cuando el backend responde con un error HTTP", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(checkBackendHealth()).resolves.toBe(false);
  });

  it("rechaza si no es posible conectar con el backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    );

    await expect(checkBackendHealth()).rejects.toThrow();
  });

  it("cancela la comprobación cuando se aborta la señal externa", async () => {
    vi.stubGlobal("fetch", vi.fn(pendingFetch()));

    const controller = new AbortController();
    const promise = checkBackendHealth(controller.signal);

    controller.abort();

    await expect(promise).rejects.toThrow();
  });

  it("se interrumpe sola si el backend no responde dentro del tiempo máximo", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(pendingFetch()));

    const promise = checkBackendHealth();
    promise.catch(() => undefined);

    vi.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow();
  });
});

describe("getApiBaseUrl", () => {
  it("usa el valor local por defecto cuando la variable no está definida", () => {
    expect(getApiBaseUrl()).toBe("http://127.0.0.1:8000");
  });

  it("usa VITE_API_BASE_URL cuando está definida", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");

    expect(getApiBaseUrl()).toBe("https://api.example.test");
  });

  it("recorta espacios y quita la barra final", () => {
    vi.stubEnv("VITE_API_BASE_URL", "  https://api.example.test/  ");

    expect(getApiBaseUrl()).toBe("https://api.example.test");
  });

  it("cae al valor por defecto si la variable está vacía", () => {
    vi.stubEnv("VITE_API_BASE_URL", "   ");

    expect(getApiBaseUrl()).toBe("http://127.0.0.1:8000");
  });
});

describe("URL de las llamadas al backend", () => {
  it("checkBackendHealth consulta la raíz de la URL configurada", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await checkBackendHealth();

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/");
  });

  it("getGeneDetails consulta /api/genes en la URL configurada", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", identifier: "BRCA1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getGeneDetails("BRCA1");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.example.test/api/genes/BRCA1"
    );
  });

  it("en desarrollo usa la URL local por defecto", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", identifier: "TP53" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getGeneDetails("TP53");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://127.0.0.1:8000/api/genes/TP53"
    );
  });
});
