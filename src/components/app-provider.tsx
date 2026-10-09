"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Command } from "@/domain/commands";
import type { Store } from "@/domain/types";
import type { AIStatus } from "@/server/ai-configuration";
import { useNavigation } from "./navigation";
import {
  initializeDevice,
  refreshDeviceAIStatus,
  requestDevice,
} from "@/client/transport";

type Context = {
  store: Store | null;
  aiMode: string;
  aiStatus: AIStatus;
  isPhone: boolean;
  busy: boolean;
  error: string;
  clearError: () => void;
  command: (command: Command) => Promise<Store | undefined>;
  request: (
    path: string,
    body: unknown,
  ) => Promise<Record<string, unknown> | undefined>;
  reload: () => Promise<void>;
};
const AppContext = createContext<Context | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { phone } = useNavigation();
  const [loadedMode, setLoadedMode] = useState<boolean>();
  const [store, setStore] = useState<Store | null>(null);
  const [aiMode, setAiMode] = useState("demo");
  const [aiStatus, setAiStatus] = useState<AIStatus>({
    configured: false,
    hasApiKey: false,
    model: "",
    source: "none",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const reload = useCallback(async () => {
    try {
      if (phone) {
        const data = await initializeDevice();
        setStore(data.store);
        setAiMode(data.aiMode);
        setAiStatus(data.aiStatus);
        setLoadedMode(true);
        return;
      }
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not read your local database.");
      const data = await response.json();
      setStore(data.store);
      setAiMode(data.aiMode);
      setAiStatus(data.aiStatus);
      setLoadedMode(false);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not load the app.",
      );
    }
  }, [phone]);
  useEffect(() => {
    const controller = new AbortController();
    const read = phone
      ? initializeDevice()
      : fetch("/api/state", {
          cache: "no-store",
          signal: controller.signal,
        }).then(async (response) => {
          if (!response.ok)
            throw new Error("Could not read your local database.");
          return response.json();
        });
    read
      .then((data) => {
        if (controller.signal.aborted) return;
        setStore(data.store);
        setAiMode(data.aiMode);
        setAiStatus(data.aiStatus);
        setLoadedMode(phone);
        if (phone) {
          void navigator.storage?.persist?.().catch(() => {});
          void refreshDeviceAIStatus().then((current) => {
            if (current && !controller.signal.aborted) {
              setAiMode(current.aiMode);
              setAiStatus(current.aiStatus);
            }
          });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Could not load the app.",
          );
      });
    return () => controller.abort();
  }, [phone]);
  useEffect(() => {
    if (!store) return;
    const theme = store.settings.theme;
    document.documentElement.dataset.theme = theme;
  }, [store]);
  const request = useCallback(
    async (path: string, body: unknown) => {
      if (pending.current) return;
      pending.current = true;
      setBusy(true);
      if ((body as { type?: string })?.type !== "tick") setError("");
      try {
        if (phone) {
          const data = await requestDevice(path, body);
          if (data.store) setStore(data.store as Store);
          if (data.aiMode) setAiMode(String(data.aiMode));
          if (data.aiStatus) setAiStatus(data.aiStatus as AIStatus);
          return data;
        }
        const response = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "The request failed.");
        if (data.store) setStore(data.store);
        if (data.aiMode) setAiMode(data.aiMode);
        if (data.aiStatus) setAiStatus(data.aiStatus);
        return data as Record<string, unknown>;
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "The request failed.",
        );
      } finally {
        pending.current = false;
        setBusy(false);
      }
    },
    [phone],
  );
  const command = useCallback(
    async (command: Command) =>
      (await request("/api/actions", command))?.store as Store | undefined,
    [request],
  );
  return (
    <AppContext.Provider
      value={{
        store: loadedMode === phone ? store : null,
        aiMode,
        aiStatus,
        isPhone: phone,
        busy,
        error,
        clearError: () => setError(""),
        command,
        request,
        reload,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("App provider missing.");
  return context;
}
