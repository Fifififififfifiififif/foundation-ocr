import { NextResponse } from "next/server";

/** Informacja diagnostyczna — lokalny OCR bez kluczy zewnętrznych. */
export async function GET() {
  return NextResponse.json({
    engine: "tesseract.js",
    pdf: "pdf-parse",
    langs: "pol+eng",
    message: "OCR działa lokalnie — bez Google Cloud Vision.",
  });
}
