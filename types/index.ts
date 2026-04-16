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
  odontogram?: Record<number, {
    status: 'none' | 'to-treat' | 'treated' | 'absent';
    notes?: string;
  }>;
  images?: Array<{
    name: string;
    url: string;
    created_at: string;
  }>;
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

export type InventoryItem = {
  id: string;
  name: string;
  stock: number;
  min_stock: number;
  unit: string;
  created_at: string;
};

export type Payment = {
  id: string;
  patient_id: string;
  amount: number;
  date: string;
  description: string;
  created_at: string;
};