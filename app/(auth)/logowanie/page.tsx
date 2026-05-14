import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export default function LogowaniePage() {
  return (
    <Suspense fallback={<p className="p-12 text-center text-sm text-muted-foreground">Ładowanie…</p>}>
      <LoginForm />
    </Suspense>
  );
}
