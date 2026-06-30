export type ChatMessage = { role: "user" | "assistant"; content: string };

export type MedicalSummary = {
  patientConcerns: string;
  symptoms: string[];
  duration: string;
  severity: string;
  additionalNotes: string;
  urgencyLevel: "low" | "medium" | "high" | "emergency";
  recommendedSpecialties: string[];
  preferredCity: string | null;
  preferredInsurance: string | null;
  doctorBrief: string;
};

export type ProfileUpdates = {
  age?: number | null;
  healthInsurance?: string | null;
  dateOfBirth?: string | null;
};

export type LlmChatResponse = {
  message: string;
  phase: "consultation" | "ready_for_summary";
  summary?: MedicalSummary;
  profileUpdates?: ProfileUpdates | null;
};
