import { afterEach, describe, expect, it, vi } from "vitest";

import { checkBackendHealth } from "./biosemantix";

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
