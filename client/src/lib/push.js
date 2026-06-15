import api from "./api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!import.meta.env.VITE_VAPID_PUBLIC_KEY
  );
}

/**
 * The real, current push state for this browser/device.
 * @returns {Promise<{supported:boolean, permission:string, subscribed:boolean}>}
 */
export async function getPushState() {
  if (!isPushSupported()) {
    return { supported: false, permission: "unsupported", subscribed: false };
  }
  const permission = Notification.permission; // "default" | "granted" | "denied"
  let subscribed = false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      subscribed = !!sub;
    }
  } catch {
    /* ignore */
  }
  return { supported: true, permission, subscribed };
}

// Register SW, subscribe (or reuse), and save the subscription on the server.
async function subscribeAndSave() {
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) return false;

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  await api.post("/users/push", { subscription });
  return true;
}

/**
 * Auto re-subscribe on login — NEVER prompts. Only refreshes the
 * subscription if the user already granted permission previously.
 */
export async function registerPush() {
  try {
    if (!isPushSupported()) return false;
    if (Notification.permission !== "granted") return false;
    return await subscribeAndSave();
  } catch {
    return false;
  }
}

/**
 * User-initiated enable — prompts for permission, then subscribes.
 * @returns {Promise<boolean>} true if notifications are now on.
 */
export async function enablePush() {
  try {
    if (!isPushSupported()) return false;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
    return await subscribeAndSave();
  } catch {
    return false;
  }
}

/**
 * Turn push off for this device (unsubscribes locally). The server prunes
 * the dead subscription automatically on its next send attempt.
 */
export async function disablePush() {
  try {
    if (!isPushSupported()) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        try {
          await api.post("/users/push/unsubscribe", { endpoint: sub.endpoint });
        } catch {
          /* server cleanup is best-effort */
        }
        await sub.unsubscribe();
      }
    }
    return true;
  } catch {
    return false;
  }
}
