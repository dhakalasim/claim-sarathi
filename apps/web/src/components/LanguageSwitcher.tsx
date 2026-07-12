import { useTranslation } from "react-i18next";
import { setLocale, type SupportedLocale } from "../i18n";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex overflow-hidden rounded-full border border-white/40 bg-white/15 p-0.5 text-xs font-medium backdrop-blur-sm">
      {(["en", "ne"] as SupportedLocale[]).map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => setLocale(locale)}
          className={[
            "rounded-full px-2.5 py-1 transition",
            i18n.language === locale ? "bg-white text-brand-600 shadow-sm" : "text-white/90 hover:bg-white/10",
          ].join(" ")}
        >
          {locale === "en" ? "EN" : "ने"}
        </button>
      ))}
    </div>
  );
}
