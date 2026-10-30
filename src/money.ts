export interface Child {
  id: string;
  name: string;
  color: string;
}

// One change of the money of one child. Positive amounts add money, negative
// amounts subtract money.
export interface Entry {
  id: string;
  childId: string;
  // Amount in cents, so that sums have no rounding errors.
  cents: number;
  // Time of the change in milliseconds since the epoch.
  time: number;
  note: string;
}

export interface Data {
  children: Child[];
  // All changes, oldest first.
  entries: Entry[];
}

const STORAGE_KEY = 'taschengeld.v1';

// Colors that the user can select for a child.
export const COLORS = [
  '#43a047',
  '#1e88e5',
  '#8e24aa',
  '#d81b60',
  '#f4511e',
  '#fb8c00',
  '#00897b',
  '#6d4c41',
];

const EMPTY: Data = { children: [], entries: [] };

export function loadData(): Data {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Data>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function saveData(data: Data): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage is full or blocked; the data stays in memory only.
  }
}

// Return the first color that no child uses, or cycle through COLORS when all
// colors are in use.
export function nextColor(children: Child[]): string {
  const used = new Set(children.map((c) => c.color));
  return COLORS.find((c) => !used.has(c)) ?? COLORS[children.length % COLORS.length];
}

export function balance(data: Data, childId: string): number {
  return data.entries.reduce((sum, e) => (e.childId === childId ? sum + e.cents : sum), 0);
}

// The changes of one child, newest first.
export function history(data: Data, childId: string): Entry[] {
  return data.entries.filter((e) => e.childId === childId).reverse();
}

export function addChild(data: Data, name: string, color: string): Data {
  return { ...data, children: [...data.children, { id: crypto.randomUUID(), name, color }] };
}

export function updateChild(data: Data, id: string, name: string, color: string): Data {
  return { ...data, children: data.children.map((c) => (c.id === id ? { ...c, name, color } : c)) };
}

export function removeChild(data: Data, id: string): Data {
  return {
    children: data.children.filter((c) => c.id !== id),
    entries: data.entries.filter((e) => e.childId !== id),
  };
}

export function addEntry(data: Data, childId: string, cents: number, note: string): Data {
  if (cents === 0) return data;
  const entry = { id: crypto.randomUUID(), childId, cents, time: Date.now(), note };
  return { ...data, entries: [...data.entries, entry] };
}

export function removeEntry(data: Data, id: string): Data {
  return { ...data, entries: data.entries.filter((e) => e.id !== id) };
}

const CURRENCY = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' });
const CHANGE = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'EUR',
  signDisplay: 'exceptZero',
});

export function formatMoney(cents: number): string {
  return CURRENCY.format(cents / 100);
}

// Format a change of money with a sign also for positive amounts.
export function formatChange(cents: number): string {
  return CHANGE.format(cents / 100);
}

// The decimal separator of the locale of the browser.
export const DECIMAL =
  new Intl.NumberFormat().formatToParts(1.5).find((p) => p.type === 'decimal')?.value ?? '.';

const TIME = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function formatTime(time: number): string {
  return TIME.format(time);
}
