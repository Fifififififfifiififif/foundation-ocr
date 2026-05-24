/** Wielojęzyczne etykiety pól faktury (regex sources). */

export const INVOICE_NUMBER_LABELS = [
  /numer\s+faktury/i,
  /nr\.?\s*faktury/i,
  /nr\s*faktury/i,
  /numer\s+dokumentu/i,
  /invoice\s*(?:no|number|#)/i,
  /invoice\s*id/i,
  /rechnungsnummer/i,
  /rechnung\s*nr/i,
  /facture\s*(?:n[o°]|num[eé]ro)/i,
  /n[uú]mero\s+de\s+factura/i,
  /faktura\s*(?:vat\s+)?nr/i,
  /fv\s*nr/i,
];

export const ISSUE_DATE_LABELS = [
  /data\s+wystawienia/i,
  /data\s+faktury/i,
  /data\s+dokumentu/i,
  /wystawion[aoey]/i,
  /issue\s*date/i,
  /date\s*of\s*issue/i,
  /invoice\s*date/i,
  /rechnungsdatum/i,
  /datum\s+der\s+rechnung/i,
  /date\s+de\s+facture/i,
  /fecha\s+de\s+factura/i,
];

export const SALE_DATE_LABELS = [
  /data\s+sprzeda[żz]y/i,
  /data\s+dostawy/i,
  /data\s+wykonania\s+us[łl]ugi/i,
  /sale\s*date/i,
  /date\s+of\s+supply/i,
  /service\s*date/i,
  /lieferdatum/i,
  /leistungsdatum/i,
];

export const DUE_DATE_LABELS = [
  /(?:termin|data)\s+p[łl]atno[śs]ci/i,
  /zap[łl]aci[ćc]\s+do/i,
  /termin\s+zap[łl]aty/i,
  /p[łl]atne\s+do/i,
  /due\s*date/i,
  /payment\s*due/i,
  /pay\s*by/i,
  /zahlbar\s+bis/i,
  /f[aä]llig(?:keitsdatum)?/i,
  /date\s+d['']?[eé]ch[eé]ance/i,
];

export const NET_LABELS = [
  /(?:kwota|warto[śs][ćc])\s+netto/i,
  /(?:razem\s+)?netto/i,
  /warto[śs][ćc]\s+netto/i,
  /suma\s+netto/i,
  /net\s+(?:amount|total|value)/i,
  /subtotal/i,
  /netto\s+summe/i,
  /montant\s+ht/i,
  /total\s+ht/i,
];

export const VAT_LABELS = [
  /(?:kwota|warto[śs][ćc])\s+(?:podatku\s+)?vat/i,
  /(?:kwota|warto[śs][ćc])\s+podatku/i,
  /podatek\s+vat/i,
  /kwota\s+vat/i,
  /(?:razem\s+)?vat\b/i,
  /tax\s+amount/i,
  /vat\s+amount/i,
  /mwst/i,
  /ust\./i,
  /tva\b/i,
];

export const GROSS_LABELS = [
  /do\s+zap[łl]aty/i,
  /(?:kwota\s+)?do\s+zap[łl]aty/i,
  /(?:razem\s+)?brutto/i,
  /warto[śs][ćc]\s+brutto/i,
  /suma\s+brutto/i,
  /(?:kwota\s+)?razem\b/i,
  /amount\s+due/i,
  /total\s+due/i,
  /gross\s+(?:amount|total)/i,
  /grand\s+total/i,
  /gesamtbetrag/i,
  /brutto\s+summe/i,
  /total\s+ttc/i,
  /montant\s+ttc/i,
];

export const DISCOUNT_LABELS = [
  /rabat/i,
  /upust/i,
  /discount/i,
  /skonto/i,
  /remise/i,
];

export const SELLER_LABELS = [
  /sprzedawca/i,
  /wystawca/i,
  /dostawca/i,
  /seller/i,
  /vendor/i,
  /supplier/i,
  /verk[aä]ufer/i,
  /lieferant/i,
  /fournisseur/i,
];

export const BUYER_LABELS = [
  /nabywca/i,
  /kupuj[aą]cy/i,
  /odbiorca/i,
  /buyer/i,
  /customer/i,
  /bill\s*to/i,
  /k[aä]ufer/i,
  /acheteur/i,
  /client/i,
];

export const BANK_LABELS = [
  /rachunek\s+bankowy/i,
  /numer\s+rachunku/i,
  /nr\.?\s*konta/i,
  /numer\s+konta/i,
  /konto\s+bankowe/i,
  /bank\s*account/i,
  /account\s*number/i,
  /iban/i,
  /swift/i,
  /\bbic\b/i,
];

export const PAYMENT_METHOD_LABELS = [
  /forma\s+p[łl]atno[śs]ci/i,
  /metoda\s+p[łl]atno[śs]ci/i,
  /payment\s*method/i,
  /zahlungsart/i,
  /mode\s+de\s+paiement/i,
];

export const LINE_ITEM_HEADER =
  /(?:lp|poz\.|nr\.?)\s+.*(?:nazwa|towar|us[łl]uga|opis|description|item|bezeichnung|designation)/i;
