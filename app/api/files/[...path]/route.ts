import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

import { getAppContext } from "@/lib/app-context";
import prisma from "@/lib/prisma";
import { isLimitedToOwnDocuments } from "@/lib/permissions";

const MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { organizationId: orgId, user } = await getAppContext();

  const segments = (await params).path;
  if (!segments || segments.length === 0) {
    return new NextResponse("Nieprawidłowa ścieżka", { status: 400 });
  }

  const joined = segments.map(decodeURIComponent).join("/");

  if (joined.includes("..")) {
    return new NextResponse("Nieprawidłowa ścieżka", { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "uploads");
  const fullPath = path.join(uploadsDir, joined);

  if (!fullPath.startsWith(uploadsDir)) {
    return new NextResponse("Nieprawidłowa ścieżka", { status: 400 });
  }

  const owned = await prisma.document.findFirst({
    where: {
      filePath: joined,
      organizationId: orgId,
      ...(isLimitedToOwnDocuments(user.role) ? { createdByUserId: user.id } : {}),
    },
    select: { id: true },
  });
  if (!owned) {
    return new NextResponse("Nie znaleziono pliku", { status: 404 });
  }

  try {
    const data = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).slice(1).toLowerCase();
    const contentType = MIME_MAP[ext] ?? "application/octet-stream";

    return new NextResponse(data, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return new NextResponse("Nie znaleziono pliku", { status: 404 });
  }
}
