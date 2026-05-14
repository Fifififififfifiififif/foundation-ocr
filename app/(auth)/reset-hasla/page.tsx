import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetHaslaPage() {
  return (
    <Suspense fallback={<p className="p-12 text-center text-sm text-muted-foreground">Ładowanie…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
