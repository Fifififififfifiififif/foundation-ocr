"use client";

import { useEffect } from "react";

import {
  applyAccentVariables,
  applyFontColorVariables,
  applyThemeClass,
} from "@/lib/apply-appearance";

type Props = {
  appearanceTheme: string;
  accentColor: string;
  fontColor: string | null;
};

/** Ustawia tryb jasny/ciemny, kolor akcentu (primary / ring / opcjonalnie gradient) oraz opcjonalnie kolor czcionki. */
export function AppearanceHydrator({ appearanceTheme, accentColor, fontColor }: Props) {
  useEffect(() => {
    const root = document.documentElement;
    applyAccentVariables(root, accentColor);
    applyFontColorVariables(root, fontColor);
    return applyThemeClass(root, appearanceTheme);
  }, [appearanceTheme, accentColor, fontColor]);

  return null;
}
