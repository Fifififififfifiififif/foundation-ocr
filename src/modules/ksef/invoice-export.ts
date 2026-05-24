/** Eksport faktur do KSeF — placeholder pod pełny flow wysyłki (sesja + UPO). */
export async function exportInvoiceToKsef(): Promise<{ ok: false; message: string }> {
  return {
    ok: false,
    message: "Eksport do KSeF będzie dostępny w kolejnej iteracji (wysyłka + UPO).",
  };
}
