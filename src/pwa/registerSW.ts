// Guarded PWA registration wrapper — Lovable preview/dev safe.
import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

const SW_URL = "/sw.js";

async function unregisterAppSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(SW_URL);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* noop */
  }
}

function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  const url = new URL(window.location.href);
  if (url.searchParams.get("sw") === "off") return true;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  return false;
}

export function setupPWA() {
  if (isRefusedContext()) {
    void unregisterAppSW();
    return;
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast("Nova versão disponível", {
        description: "Atualizar agora para carregar as melhorias?",
        duration: Infinity,
        action: {
          label: "Atualizar",
          onClick: () => updateSW(true),
        },
        cancel: {
          label: "Depois",
          onClick: () => {},
        },
      });
    },
    onOfflineReady() {
      toast.success("App pronto para uso offline");
    },
  });
}
