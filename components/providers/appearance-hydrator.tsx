"use client";

import { useEffect } from "react";

import { accentFirstStopHex, accentGradientCss } from "@/lib/accent-color";

type Props = {
  appearanceTheme: string;
  accentColor: string;
  fontColor: string | null;
};

const FONT_FOREGROUND_KEYS = [
  "--foreground",
  "--card-foreground",
  "--popover-foreground",
  "--sidebar-foreground",
] as const;

/** Jasność tła (YIQ) — dobór czytelnego koloru tekstu na przyciskach primary. */
function contrastTextForAccent(hex: string): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return "#fafafa";
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#0a0a0a" : "#fafafa";
}

/** Ustawia tryb jasny/ciemny, kolor akcentu (primary / ring / opcjonalnie gradient) oraz opcjonalnie kolor czcionki. */
export function AppearanceHydrator({ appearanceTheme, accentColor, fontColor }: Props) {
  useEffect(() => {
    const root = document.documentElement;
    const first = accentFirstStopHex(accentColor);
    const grad = accentGradientCss(accentColor);

    root.style.setProperty("--foundation-accent", first);
    root.style.setProperty("--primary", first);
    root.style.setProperty("--ring", first);
    root.style.setProperty("--primary-foreground", contrastTextForAccent(first));

    if (grad) {
      root.style.setProperty("--primary-gradient", grad);
      root.dataset.accentGradient = "1";
    } else {
      root.style.removeProperty("--primary-gradient");
      delete root.dataset.accentGradient;
    }

    const hex = fontColor?.trim();
    if (hex) {
      for (const key of FONT_FOREGROUND_KEYS) {
        root.style.setProperty(key, hex);
      }
    } else {
      for (const key of FONT_FOREGROUND_KEYS) {
        root.style.removeProperty(key);
      }
    }

    const apply = () => {
      root.classList.remove("dark");
      if (appearanceTheme === "dark") root.classList.add("dark");
      else if (appearanceTheme === "light") root.classList.remove("dark");
      else {
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (dark) root.classList.add("dark");
      }
    };

    apply();
    if (appearanceTheme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [appearanceTheme, accentColor, fontColor]);

  return null;
}
