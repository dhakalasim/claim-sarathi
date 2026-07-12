import { useTranslation } from "react-i18next";
import { setLocale, type SupportedLocale } from "../i18n";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex overflow-hidden rounded-md border border-gray-300 text-xs font-medium">
      {(["en", "ne"] as SupportedLocale[]).map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => setLocale(locale)}
          className={[
            "px-2 py-1",
            i18n.language === locale ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
          ].join(" ")}
        >
          {locale === "en" ? "EN" : "ने"}
        </button>
      ))}
    </div>
  );
}
