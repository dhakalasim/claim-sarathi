import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ApiError } from "../api/client";

export function LoginPage() {
  const { t } = useTranslation();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(identifier, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-gradient px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_45%)]" />
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl shadow-orange-900/20 ring-1 ring-black/5">
        <h1 className="mb-6 bg-gradient-to-r from-brand-600 to-amber-500 bg-clip-text text-center text-2xl font-bold text-transparent">
          {t("app.title")}
        </h1>
        <h2 className="mb-4 text-center text-sm text-gray-500">{t("login.title")}</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="identifier" className="mb-1 block text-sm font-medium text-gray-700">
              {t("login.identifier")}
            </label>
            <input
              id="identifier"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              {t("login.password")}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-md bg-gradient-to-r from-brand-500 to-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-orange-900/20 transition hover:from-brand-600 hover:to-amber-600 disabled:opacity-50"
          >
            {t("login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
