/**
 * Ręczna faktura: jeden pasek przewijania (main), bez pustego miejsca pod przyciskiem.
 */
export default function ManualInvoiceLayout({ children }: { children: React.ReactNode }) {
  return <div className="manual-invoice-page w-full">{children}</div>;
}
