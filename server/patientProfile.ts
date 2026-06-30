import { getDb } from "./db.js";

export type PatientProfileContext = {
  age: number | null;
  healthInsurance: string | null;
};

export type ProfileUpdates = {
  age?: number | null;
  healthInsurance?: string | null;
  dateOfBirth?: string | null;
};

export function computeAgeFromDob(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth?.trim()) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age > 0 && age < 130 ? age : null;
}

export function getPatientProfileContext(userId: string): PatientProfileContext {
  const db = getDb();
  const row = db
    .prepare("SELECT age, health_insurance, date_of_birth FROM users WHERE id = ?")
    .get(userId) as { age: number | null; health_insurance: string | null; date_of_birth: string | null } | undefined;

  if (!row) return { age: null, healthInsurance: null };

  const storedAge = row.age != null && row.age > 0 ? row.age : null;
  const age = storedAge ?? computeAgeFromDob(row.date_of_birth);

  return {
    age,
    healthInsurance: row.health_insurance?.trim() || null,
  };
}

export function applyProfileUpdates(userId: string, updates: ProfileUpdates | undefined): void {
  if (!updates) return;

  const db = getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.age !== undefined && updates.age !== null) {
    const age = Math.round(Number(updates.age));
    if (age > 0 && age < 130) {
      sets.push("age = ?");
      values.push(age);
    }
  }

  if (updates.healthInsurance !== undefined) {
    const ins = updates.healthInsurance?.trim() || null;
    sets.push("health_insurance = ?");
    values.push(ins);
  }

  if (updates.dateOfBirth !== undefined) {
    sets.push("date_of_birth = ?");
    values.push(updates.dateOfBirth?.trim() || null);
  }

  if (sets.length === 0) return;
  values.push(userId);
  db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...values);
}
