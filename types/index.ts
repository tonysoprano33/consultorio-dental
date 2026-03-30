export type Patient = {
  id: string;
  name: string;
  dni?: string;
  phone?: string;
  os?: string;
  dob?: string;
  notes?: string;
  created_at: string;
  clinical_history?: any;
};

export type Appointment = {
  id: string;
  patient_id: string;
  date: string;
  time: string;
  reason?: string;
  notes?: string;
  status: 'pending' | 'arrived' | 'completed' | 'cancelled';
  arrived_at?: string | null;
  created_at: string;
  patient?: Patient;
};