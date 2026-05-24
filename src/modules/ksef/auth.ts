export { authenticateKsefToken } from "@/src/modules/ksef/client";

export async function refreshKsefSessionIfNeeded(): Promise<null> {
  // Odświeżanie sesji — rozszerzenie pod refreshToken w kolejnej iteracji.
  return null;
}
