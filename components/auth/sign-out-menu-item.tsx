"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";

export function SignOutMenuItem() {
  return (
    <DropdownMenuItem
      onClick={() => {
        void signOut().then(() => {
          window.location.href = "/logowanie";
        });
      }}
    >
      Wyloguj
    </DropdownMenuItem>
  );
}
