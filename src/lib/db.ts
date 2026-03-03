import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const LS_KEY = (year: number) => `1p1d-reminders-${year}`

// ── Firestore ─────────────────────────────────────────────────────────────────
// Structure: /users/{uid}/years/{year}  →  { reminders: { "42": "text", … } }

export async function loadRemindersFromFirestore(
  uid: string, year: number
): Promise<Record<number, string>> {
  const ref  = doc(db, 'users', uid, 'years', String(year))
  const snap = await getDoc(ref)
  if (!snap.exists()) return {}
  const raw = snap.data().reminders as Record<string, string> ?? {}
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [Number(k), v]))
}

export async function saveReminderToFirestore(
  uid: string, year: number, dayIndex: number, text: string
): Promise<void> {
  const ref = doc(db, 'users', uid, 'years', String(year))
  await setDoc(ref, { reminders: { [String(dayIndex)]: text } }, { merge: true })
}

export async function migrateToFirestore(
  uid: string, year: number, reminders: Record<number, string>
): Promise<void> {
  const ref = doc(db, 'users', uid, 'years', String(year))
  const stringKeyed = Object.fromEntries(
    Object.entries(reminders).map(([k, v]) => [k, v])
  )
  await setDoc(ref, { reminders: stringKeyed }, { merge: true })
}

// ── Custom layouts — Firestore ────────────────────────────────────────────────
// Structure: /users/{uid}/app/customLayouts  →  { layouts: [...] }

export interface StoredLayout {
  id: string
  name: string
  positions: { col: number; row: number }[]
}

export async function loadCustomLayoutsFromFirestore(uid: string): Promise<StoredLayout[]> {
  const ref  = doc(db, 'users', uid, 'app', 'customLayouts')
  const snap = await getDoc(ref)
  if (!snap.exists()) return []
  return (snap.data().layouts as StoredLayout[]) ?? []
}

export async function saveCustomLayoutsToFirestore(uid: string, layouts: StoredLayout[]): Promise<void> {
  const ref = doc(db, 'users', uid, 'app', 'customLayouts')
  await setDoc(ref, { layouts })
}

// ── Custom layouts — localStorage ─────────────────────────────────────────────

const LS_LAYOUTS_KEY = '1p1d-custom-layouts'

export function loadCustomLayoutsFromLocalStorage(): StoredLayout[] {
  try {
    const raw = localStorage.getItem(LS_LAYOUTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCustomLayoutsToLocalStorage(layouts: StoredLayout[]): void {
  localStorage.setItem(LS_LAYOUTS_KEY, JSON.stringify(layouts))
}

export function clearLocalStorageCustomLayouts(): void {
  localStorage.removeItem(LS_LAYOUTS_KEY)
}

// ── localStorage ──────────────────────────────────────────────────────────────

export function loadRemindersFromLocalStorage(year: number): Record<number, string> {
  try {
    const raw = localStorage.getItem(LS_KEY(year))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveReminderToLocalStorage(
  year: number, reminders: Record<number, string>
): void {
  localStorage.setItem(LS_KEY(year), JSON.stringify(reminders))
}

export function clearLocalStorageReminders(year: number): void {
  localStorage.removeItem(LS_KEY(year))
}
