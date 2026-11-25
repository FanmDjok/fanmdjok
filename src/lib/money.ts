import type { Currency } from "./territories";

/** Le franc Pacifique n'a pas de centimes ; l'euro en a. */
export function formatMoney(amount: number, currency: Currency, whole = false): string {
  const n = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: currency === "XPF" || whole ? 0 : 2,
    maximumFractionDigits: currency === "XPF" || whole ? 0 : 2,
  }).format(amount);
  return `${n.replace(/ /g, " ")} ${currency === "XPF" ? "XPF" : "€"}`;
}

/** Additionne par devise : on ne mélange jamais EUR et XPF dans un même total. */
export function sumByCurrency<T>(items: T[], pick: (i: T) => { amount: number; currency: Currency }): Record<Currency, number> {
  const out: Record<Currency, number> = { EUR: 0, XPF: 0 };
  for (const i of items) {
    const { amount, currency } = pick(i);
    out[currency] += amount;
  }
  return out;
}
