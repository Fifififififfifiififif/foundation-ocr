import { PageHeader } from "@/components/layout/page-header";
import { OcrSettingsForm } from "@/components/settings/ocr-settings-form";
import { requireOrganizationSettings } from "@/lib/require-organization-settings";
import { describeOcrEngineConfig } from "@/lib/ocr/config";
import { requireOcrModule } from "@/src/modules/permissions/require-ocr";

export default async function OcrSettingsPage() {
  await requireOcrModule();
  const s = await requireOrganizationSettings();
  const engine = describeOcrEngineConfig();
  return (
    <>
      <PageHeader
        title="OCR"
        description={`Tesseract (${engine.languages}), preprocess: ${engine.preprocess ? "wł." : "wył."}, skan PDF: ${engine.pdfScannedFallback ? "wł." : "wył."}`}
      />
      <OcrSettingsForm
        initial={{
          ocrEnabled: s.ocrEnabled,
          maxUploadBytes: s.maxUploadBytes,
        }}
      />
    </>
  );
}
