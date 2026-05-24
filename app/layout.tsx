import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppearanceHydrator } from "@/components/providers/appearance-hydrator";
import { tryResolveAppearanceOrganizationId } from "@/lib/app-context";
import { getOrganizationById } from "@/lib/organization-settings";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rejestr dokumentów fundacji",
  description: "Rejestr dokumentów finansowych dla projektów i grantów fundacji",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let appearanceTheme = "system";
  let accentColor = "#18181b";
  let fontColor: string | null = null;
  try {
    const orgId = await tryResolveAppearanceOrganizationId();
    if (orgId) {
      const s = await getOrganizationById(orgId);
      appearanceTheme = s.appearanceTheme;
      accentColor = s.accentColor;
      fontColor = s.fontColor;
    }
  } catch {
    /* build / brak bazy */
  }

  return (
    <html
      lang="pl"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="bg-background text-foreground flex min-h-full flex-col"
      >
        <AppearanceHydrator appearanceTheme={appearanceTheme} accentColor={accentColor} fontColor={fontColor} />
        {children}
      </body>
    </html>
  );
}
