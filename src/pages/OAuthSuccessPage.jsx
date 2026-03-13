import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeSelector from "../components/ThemeSelector";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";

const OAuthSuccessPage = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const completeOAuth = async () => {
      try {
        const data = await authService.getMe();
        setUser(data.user);

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: "GOOGLE_OAUTH_SUCCESS" }, window.location.origin);
          window.close();
          return;
        }

        navigate("/dashboard", { replace: true });
      } catch (_error) {
        setError("Google login failed. Please try again.");
        navigate("/login", { replace: true });
      }
    };

    completeOAuth();
  }, [navigate, setUser]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute right-4 top-4">
        <ThemeSelector />
      </div>
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-soft dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Signing you in...</h1>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
      </section>
    </main>
  );
};

export default OAuthSuccessPage;
