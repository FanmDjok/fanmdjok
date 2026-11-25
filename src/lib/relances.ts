import type { Payment, Property } from "../data/types";
import { currentMonth, monthLabel } from "./period";
import { formatMoney } from "./money";
import { getTerritory } from "./territories";

export type RelanceLevel = 1 | 2 | 3;
export interface LateItem { payment: Payment; property: Property; monthsLate: number; level: RelanceLevel }

const diffMonths = (from: string, to: string) => {
  const [y1, m1] = from.split("-").map(Number); const [y2, m2] = to.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
};

/** Un loyer est à relancer s'il est marqué en retard, ou s'il est resté « en attente » après son mois. */
export function lateItems(properties: Property[], payments: Payment[], now = currentMonth()): LateItem[] {
  const out: LateItem[] = [];
  for (const payment of payments) {
    const property = properties.find((p) => p.id === payment.propertyId);
    if (!property) continue;
    const monthsLate = Math.max(0, diffMonths(payment.month, now));
    const late = payment.status === "retard" || (payment.status === "attente" && monthsLate >= 1);
    if (!late) continue;
    out.push({ payment, property, monthsLate, level: monthsLate >= 2 ? 3 : monthsLate === 1 ? 2 : 1 });
  }
  return out.sort((a, b) => a.payment.month.localeCompare(b.payment.month));
}

export const LEVELS: Record<RelanceLevel, string> = { 1: "Rappel amical", 2: "Deuxième rappel", 3: "Dernier rappel" };

export function relanceMessage(item: LateItem, bailleur: string): string {
  const { property: p, payment, level } = item;
  const nom = p.locataireNom?.trim() || "";
  const montant = formatMoney(payment.amount, p.currency);
  const mois = monthLabel(payment.month);
  const sig = `Cordialement,\n${bailleur.trim() || "Votre bailleur"}`;
  const hello = nom ? `Bonjour ${nom},` : "Bonjour,";
  if (level === 1)
    return `${hello}\n\nSauf erreur de ma part, le loyer de ${mois} (${montant}) pour ${p.name} ne m'est pas encore parvenu. Il s'agit peut-être d'un simple oubli : pourriez-vous procéder au règlement ou me dire si un souci est survenu ?\n\nMerci d'avance.\n${sig}`;
  if (level === 2)
    return `${hello}\n\nJe reviens vers vous au sujet du loyer de ${mois} (${montant}) pour ${p.name}, toujours impayé à ce jour. Pouvez-vous le régler dans les meilleurs délais, ou me proposer une date de règlement ? Je reste disponible pour en discuter.\n\n${sig}`;
  return `${hello}\n\nMalgré mes précédents rappels, le loyer de ${mois} (${montant}) pour ${p.name} reste impayé. Je vous demande de le régler sous huit jours, ou de me contacter pour convenir d'une solution. À défaut, je serai amené à envisager les démarches prévues par le bail.\n\n${sig}`;
}

/** Numéro au format international sans « + » (pour WhatsApp), à partir d'un numéro local ou international. */
export function internationalPhone(raw: string | undefined, territoryId: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("00")) return digits.slice(2);
  const local = digits.replace(/^0/, "");
  if (local.length < 6) return null;
  return getTerritory(territoryId).phone.replace("+", "") + local;
}
