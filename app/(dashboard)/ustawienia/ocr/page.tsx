import { PageHeader } from "@/components/layout/page-header";
import { OcrSettingsForm } from "@/components/settings/ocr-settings-form";
import { requireOrganizationSettings } from "@/lib/require-organization-settings";

export default async function OcrSettingsPage() {
  const s = await requireOrganizationSettings();
  return (
    <>
      <PageHeader
        title="OCR"
        description="Sterowanie automatycznym odczytem faktur oraz limitami przesyłanych plików."
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
