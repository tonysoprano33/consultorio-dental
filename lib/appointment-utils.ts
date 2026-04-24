import { Appointment } from '../types';
import { createClient } from './supabase';

const supabase = createClient();
const CONFIG_RECORD_NAME = 'SYSTEM_CONFIG_TREATMENTS';

export let TREATMENT_DURATIONS: Record<string, number> = {
  'Consulta': 15,
  'Tratamiento de conducto': 150,
  'Extracción': 60,
  'Cirugía': 90,
  'Limpieza': 40,
  'Operatoria': 60,
};

export async function loadTreatmentDurations(): Promise<Record<string, number>> {
  try {
    const { data } = await supabase
      .from('patients')
      .select('clinical_history')
      .eq('name', CONFIG_RECORD_NAME)
      .maybeSingle();
    
    if (data?.clinical_history) {
      TREATMENT_DURATIONS = data.clinical_history as Record<string, number>;
    }
  } catch (e) {
    console.error('Error loading treatments:', e);
  }
  return TREATMENT_DURATIONS;
}

export async function saveTreatmentDuration(name: string, duration: number): Promise<void> {
  const updated = { ...TREATMENT_DURATIONS, [name]: duration };
  try {
    const { error } = await supabase
      .from('patients')
      .update({ clinical_history: updated })
      .eq('name', CONFIG_RECORD_NAME);
    
    if (error) throw error;
    TREATMENT_DURATIONS = updated;
  } catch (e) {
    console.error('Error saving treatment:', e);
    throw e;
  }
}

export function getDurationFromNotes(notes: string | undefined | null): number {
  if (!notes) return 15; // Default if not found
  const match = notes.match(/\[DURATION:(\d+)\]/);
  return match ? parseInt(match[1], 10) : 15;
}

export function setDurationInNotes(notes: string | undefined | null, duration: number): string {
  const baseNotes = notes ? notes.replace(/\[DURATION:\d+\]/g, '').trim() : '';
  return `${baseNotes} [DURATION:${duration}]`.trim();
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function checkOverlap(
  newDate: string,
  newStartTime: string,
  newDuration: number,
  existingAppointments: Appointment[],
  editingId?: string
): Appointment | null {
  const newStart = timeToMinutes(newStartTime);
  const newEnd = newStart + newDuration;

  for (const appt of existingAppointments) {
    if (appt.id === editingId) continue;
    if (appt.date !== newDate) continue;
    if (appt.status === 'cancelled') continue;

    const apptStart = timeToMinutes(appt.time);
    const apptDuration = getDurationFromNotes(appt.notes);
    const apptEnd = apptStart + apptDuration;

    // Check overlap
    if (newStart < apptEnd && newEnd > apptStart) {
      return appt;
    }
  }

  return null;
}
