import Link from "next/link";

import { requestPasswordReset } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset hasła</CardTitle>
          <CardDescription>Wyślemy link resetujący na Twój email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={requestPasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit" className="w-full">
              Wyślij link
            </Button>
          </form>
          <Link href="/logowanie" className="text-muted-foreground mt-4 inline-block text-sm hover:text-foreground">
            ← Powrót do logowania
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
