import { useEffect, useRef } from "react";
import { authService } from "../services/authService";

const GOOGLE_SCRIPT_ID = "google-gsi-script";
let googleScriptPromise = null;
const GOOGLE_AUTO_PROMPT_DEFAULT =
  String(import.meta.env.VITE_GOOGLE_ONE_TAP_AUTO_PROMPT ?? "true").toLowerCase() !== "false";
const GOOGLE_USE_FEDCM =
  String(import.meta.env.VITE_GOOGLE_USE_FEDCM ?? "true").toLowerCase() !== "false";

const loadGoogleScript = () => {
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
};

export const useGoogleOneTap = ({
  onSuccess,
  onError,
  autoPrompt = GOOGLE_AUTO_PROMPT_DEFAULT
}) => {
  const initializedRef = useRef(false);
  const promptedRef = useRef(false);

  const openFallbackPopup = () => {
    const width = 520;
    const height = 680;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const onMessage = async (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "GOOGLE_OAUTH_SUCCESS") return;

      window.removeEventListener("message", onMessage);

      try {
        const data = await authService.getMe();
        onSuccess?.(data);
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.errors?.[0]?.msg ||
          "Google popup login failed. Please try again.";
        onError?.(message);
      }
    };

    window.addEventListener("message", onMessage);

    const popup = window.open(
      authService.googleLoginUrl,
      "googleOAuthFallbackPopup",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      window.removeEventListener("message", onMessage);
      // Last fallback: full redirect if popup is blocked.
      window.location.href = authService.googleLoginUrl;
    }
  };

  const ensureGoogleIdentity = async () => {
    await loadGoogleScript();

    // In some browsers/extensions the global appears a moment after script onload.
    for (let i = 0; i < 8; i += 1) {
      if (window.google?.accounts?.id) return true;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    return false;
  };

  const initializeGoogle = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      onError?.("VITE_GOOGLE_CLIENT_ID is missing. Google One Tap requires this in frontend env.");
      return false;
    }

    const available = await ensureGoogleIdentity();
    if (!available) {
      onError?.("Google Identity Services is unavailable. Disable blockers and try again.");
      return false;
    }

    if (initializedRef.current) {
      return true;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        try {
          const data = await authService.googleTokenLogin(response.credential);
          onSuccess?.(data);
        } catch (error) {
          const message =
            error?.response?.data?.message ||
            error?.response?.data?.errors?.[0]?.msg ||
            "Google login failed. Please try again.";
          onError?.(message);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: GOOGLE_USE_FEDCM
    });
    initializedRef.current = true;

    return true;
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const ok = await initializeGoogle();
        if (!ok) return;
        if (cancelled) return;

        if (autoPrompt && !promptedRef.current) {
          promptedRef.current = true;
          // Default corner One Tap prompt on page load.
          window.google.accounts.id.prompt();
        }
      } catch (_error) {
        onError?.("Unable to initialize Google login");
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [onSuccess, onError, autoPrompt]);

  const promptGoogleOneTap = () => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return;

    initializeGoogle().then((ok) => {
      if (!ok) return;
      window.google.accounts.id.prompt((notification) => {
        const notDisplayed = notification?.isNotDisplayed?.() ?? false;
        const skipped = notification?.isSkippedMoment?.() ?? false;

        if (notDisplayed || skipped) {
          onError?.("One Tap popup unavailable.");
        }
      });
    });
  };

  const openGoogleLoginPopup = () => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      openFallbackPopup();
      return;
    }

    initializeGoogle().then((ok) => {
      if (!ok) return;

      let fallbackTriggered = false;
      window.google.accounts.id.prompt((notification) => {
        const notDisplayed = notification?.isNotDisplayed?.() ?? false;
        const skipped = notification?.isSkippedMoment?.() ?? false;

        if ((notDisplayed || skipped) && !fallbackTriggered) {
          fallbackTriggered = true;
          openFallbackPopup();
        }
      });
    });
  };

  return { promptGoogleOneTap, openGoogleLoginPopup };
};
