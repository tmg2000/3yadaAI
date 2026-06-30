export type AppStep =
  | "login"
  | "home"
  | "chat"
  | "summary"
  | "doctors"
  | "booking"
  | "confirmation"
  | "history"
  | "calendar"
  | "profile"
  | "doctor-login"
  | "doctor-dashboard"
  | "admin-login"
  | "admin-dashboard";

export type UrgencyLevel = "low" | "medium" | "high" | "emergency";

export type MedicalSummary = {
  patientConcerns: string;
  symptoms: string[];
  duration: string;
  severity: string;
  additionalNotes: string;
  urgencyLevel: UrgencyLevel;
  recommendedSpecialties: string[];
  preferredCity: string | null;
  preferredInsurance: string | null;
  doctorBrief: string;
};

export type Attachment = {
  id: string;
  name: string;
  type: "image" | "pdf";
  url: string;
  size: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
};

export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  specialtyKey: string;
  hospital: string;
  city: string;
  area: string | null;
  licenseNumber: string | null;
  rating: number;
  experienceYears: number;
  consultationFee: number;
  availableSlots: string[];
  image: string;
  acceptedInsurances: string[];
};

export type Appointment = {
  id: string;
  doctor_id: string;
  doctor_name: string;
  specialty: string;
  hospital: string;
  city: string | null;
  slot: string;
  patient_name: string;
  phone: string | null;
  fee: number | null;
  status: string;
  user_id: string;
  session_id: string | null;
  created_at: string;
  googleMapLink?: string;
};

export type Session = {
  id: string;
  user_id: string;
  title: string;
  summary_json: string | null;
  status: "in_progress" | "completed";
  created_at: string;
  updated_at: string;
  conversation_count?: number;
  appointment_count?: number;
  doctor_name?: string;
  appointment_status?: string;
  conversations?: Array<{
    id: string;
    title: string;
    messages_count: number;
    first_message: string;
    created_at: string;
    updated_at: string;
  }>;
  appointments?: Array<{
    id: string;
    doctor_id: string;
    doctor_name: string;
    hospital: string;
    city: string;
    slot: string;
    patient_name: string;
    phone: string;
    fee: number;
    status: string;
  }>;
};

export type AIResponse = {
  message: string;
  phase: "consultation" | "ready_for_summary";
  summary?: MedicalSummary;
  conversationId?: string;
  sessionId?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  age: number | null;
  health_insurance: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
};

export type DoctorAppointment = {
  id: string;
  user_id: string;
  doctor_id: string;
  doctor_name: string;
  specialty: string;
  hospital: string;
  city: string | null;
  slot: string;
  patient_name: string;
  phone: string | null;
  fee: number | null;
  status: string;
  created_at: string;
};

export type DoctorStats = {
  total: number;
  period: number;
  approved: number;
  pending: number;
  lastMonth: { appointments: number; revenue: number; patients: number };
  thisMonth: { appointments: number; revenue: number };
};

export type DoctorReport = {
  periodLabel: string;
  months: number;
  totalAppointments: number;
  completedAppointments: number;
  totalRevenue: number;
  totalPatients: number;
  cancellations: number;
  clinicPatients: number;
  clinicRevenue: number;
  clinicExpenses: number;
  netProfit: number;
  monthlyBreakdown: { month: string; appointments: number; revenue: number }[];
};

export type AdminReport = {
  periodLabel: string;
  months: number;
  totalUsers: number;
  totalDoctors: number;
  totalAppointments: number;
  completedAppointments: number;
  totalRevenue: number;
  totalConversations: number;
  activeDoctors: number;
  monthlyBreakdown: { month: string; users: number; doctors: number; appointments: number; revenue: number }[];
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_patients: number | null;
  features: string[];
  active: number;
};

export type DoctorSubscription = {
  id: string;
  doctor_id: string;
  plan_id: string;
  plan_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_patients: number | null;
  features: string[];
  start_date: string;
  end_date: string;
  auto_renew: number;
  active: number;
  is_trial: number;
};

export type DoctorSummary = {
  id: string;
  appointment_id: string;
  doctor_id: string;
  user_id: string;
  content: string;
  patient_name: string;
  slot: string;
  created_at: string;
  edited_at: string | null;
};
