import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";

import { AppearanceHydrator } from "@/components/providers/appearance-hydrator";
import { auth } from "@/lib/auth";
import { getOrganizationById } from "@/lib/organization-settings";
import prisma from "@/lib/prisma";
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
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user?.id) {
      const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { organizationId: true },
      });
      if (u?.organizationId) {
        const s = await getOrganizationById(u.organizationId);
        appearanceTheme = s.appearanceTheme;
        accentColor = s.accentColor;
        fontColor = s.fontColor;
      }
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
