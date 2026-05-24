"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";

/** Toasty z parametrów URL (np. po wylogowaniu). */
export function AuthQueryToasts() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const signedOut = searchParams.get("signedOut");
    const confirmed = searchParams.get("confirmed");
    const key = `${signedOut ?? ""}:${confirmed ?? ""}`;
    if (key === ":" || handled.current === key) return;
    handled.current = key;

    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (signedOut === "1") {
      toast.success("Wylogowano pomyślnie.");
      params.delete("signedOut");
      changed = true;
    }

    if (confirmed === "1") {
      toast.success("Email potwierdzony. Zaloguj się hasłem z rejestracji.");
      params.delete("confirmed");
      changed = true;
    }

    if (changed) {
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  return <Toaster />;
}
