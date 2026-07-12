import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ne from "./ne.json";

export const SUPPORTED_LOCALES = ["en", "ne"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = "claimsarathi.locale";

function getStoredLocale(): SupportedLocale {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "ne" ? "ne" : "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ne: { translation: ne },
  },
  lng: getStoredLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLocale(locale: SupportedLocale): void {
  localStorage.setItem(STORAGE_KEY, locale);
  void i18n.changeLanguage(locale);
}

export default i18n;
