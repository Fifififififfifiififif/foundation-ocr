import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nowe hasło</CardTitle>
          <CardDescription>Ustaw nowe hasło do konta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResetPasswordForm />
          <Link href="/logowanie" className="text-muted-foreground inline-block text-sm hover:text-foreground">
            ← Powrót do logowania
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
