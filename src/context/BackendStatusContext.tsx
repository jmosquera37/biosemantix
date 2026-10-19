import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { checkBackendHealth } from "../services/biosemantix";
import type { BackendStatus } from "../utils/backendStatus";

interface BackendStatusContextValue {
  status: BackendStatus;
  /** Momento de la última comprobación completada (o ``null``). */
  checkedAt: Date | null;
  /** Vuelve a comprobar el backend manualmente. */
  refresh: () => void;
}

const BackendStatusContext = createContext<
  BackendStatusContextValue | undefined
>(undefined);

/**
 * Comprueba el backend una sola vez al montar y expone el resultado, para que
 * varias vistas (menú lateral, configuración) compartan la misma comprobación
 * en lugar de repetirla.
 *
 * La petición se cancela al desmontar y cada nueva comprobación aborta la
 * anterior, de modo que nunca queda más de una petición en curso.
 */
export function BackendStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const mountedRef = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);

  // Inicia una comprobación sin cambiar el estado de forma síncrona, para no
  // provocar renders en cascada desde el efecto de montaje.
  const startCheck = useCallback(() => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    checkBackendHealth(controller.signal)
      .then((ok) => {
        if (!mountedRef.current || controller.signal.aborted) return;
        setStatus(ok ? "connected" : "unavailable");
        setCheckedAt(new Date());
      })
      .catch(() => {
        if (!mountedRef.current || controller.signal.aborted) return;
        setStatus("unavailable");
        setCheckedAt(new Date());
      });
  }, []);

  const refresh = useCallback(() => {
    setStatus("checking");
    startCheck();
  }, [startCheck]);

  useEffect(() => {
    mountedRef.current = true;
    startCheck();

    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, [startCheck]);

  return (
    <BackendStatusContext.Provider value={{ status, checkedAt, refresh }}>
      {children}
    </BackendStatusContext.Provider>
  );
}

export function useBackendStatus() {
  const context = useContext(BackendStatusContext);

  if (!context) {
    throw new Error(
      "useBackendStatus debe utilizarse dentro de BackendStatusProvider."
    );
  }

  return context;
}
