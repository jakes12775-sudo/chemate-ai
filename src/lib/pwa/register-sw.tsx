"use client";

import { useEffect, useEffectEvent } from "react";

export function PwaRegistration() {
  const registerServiceWorker = useEffectEvent(async () => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "::1";

    if (process.env.NODE_ENV !== "production" || isLocalhost) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(
          cacheKeys
            .filter((key) => key.startsWith("chemate-"))
            .map((key) => window.caches.delete(key)),
        );
      }

      return;
    }

    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch (error) {
      console.error("Unable to register service worker", error);
    }
  });

  useEffect(() => {
    void registerServiceWorker();
  }, []);

  return null;
}
