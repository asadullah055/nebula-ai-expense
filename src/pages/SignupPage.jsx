import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { HiOutlineLockClosed, HiOutlineMail, HiOutlineUser } from "react-icons/hi";
import { authService } from "../services/authService";
import { useAuth } from "../hooks/useAuth";
import { useGoogleOneTap } from "../hooks/useGoogleOneTap";

const SignupPage = () => {
  const navigate = useNavigate();
  const { setUser, isAuthenticated, isInitializing } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authService.signup(form);
      setUser(data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const apiError =
        err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || "Signup failed";
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  const { openGoogleLoginPopup } = useGoogleOneTap({
    onSuccess: (data) => {
      setUser(data.user);
      navigate("/dashboard", { replace: true });
    },
    onError: (message) => setError(message),
    autoPrompt: import.meta.env.VITE_GOOGLE_ONE_TAP_AUTO_PROMPT !== "false"
  });

  if (isInitializing) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-950 sm:p-7">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Sign Up</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Create your account</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Name
          </label>
          <div className="relative">
            <HiOutlineUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={onChange}
              required
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email
          </label>
          <div className="relative">
            <HiOutlineMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              required
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Password
          </label>
          <div className="relative">
            <HiOutlineLockClosed className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              minLength={6}
              required
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span>or</span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <button
          type="button"
          onClick={openGoogleLoginPopup}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <FcGoogle size={20} />
          Continue with Google
        </button>

        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[var(--brand)] hover:underline">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
};

export default SignupPage;
