import { redirect } from "next/navigation";

export default function LegacyFundacjaRedirect() {
  redirect("/ustawienia/organizacja");
}
