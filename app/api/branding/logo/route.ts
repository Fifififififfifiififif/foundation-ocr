import fs from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getCurrentOrganizationId } from "@/lib/app-context";

function resolveSafeLogo(logoPathFromDb: string): string | null {
  const normalized = path.normalize(logoPathFromDb).replace(/^(\.\.(\/|\\|$))+/, "");
  if (normalized.includes("..")) return null;
  const unix = normalized.replace(/\\/g, "/");
  if (!unix.startsWith("branding/")) return null;
  const abs = path.resolve(process.cwd(), "uploads", ...unix.split("/"));
  const root = path.resolve(process.cwd(), "uploads");
  if (!abs.startsWith(root + path.sep) && abs !== root) return null;
  return abs;
}

export async function GET() {
  const orgId = await getCurrentOrganizationId();
  const s = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { logoPath: true },
  });
  if (!s?.logoPath) return new NextResponse(null, { status: 404 });

  const abs = resolveSafeLogo(s.logoPath);
  if (!abs) return new NextResponse(null, { status: 404 });

  try {
    const buf = await fs.readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    const type =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : "application/octet-stream";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
