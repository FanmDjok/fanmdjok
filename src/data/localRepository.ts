import type { Expense, Payment, Property, Repository } from "./types";

const read = <T,>(key: string): T[] => {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
};
const upsert = <T extends { id: string }>(key: string, item: T) => {
  const all = read<T>(key);
  const i = all.findIndex((x) => x.id === item.id);
  if (i >= 0) all[i] = item; else all.push(item);
  try { localStorage.setItem(key, JSON.stringify(all)); } catch { /* stockage indisponible */ }
};

export const localRepository: Repository = {
  async listProperties() { return read<Property>("kz.properties"); },
  async saveProperty(p) { upsert("kz.properties", p); },
  async listPayments() { return read<Payment>("kz.payments"); },
  async savePayment(p) { upsert("kz.payments", p); },
  async listExpenses() { return read<Expense>("kz.expenses"); },
  async saveExpense(e) { upsert("kz.expenses", e); },
};

export const uid = () => crypto.randomUUID();
