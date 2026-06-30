export type DoctorSeed = {
  id: string;
  name: string;
  specialty: string;
  specialtyKey: string;
  hospital: string;
  city: string;
  rating: number;
  experienceYears: number;
  consultationFee: number;
  image: string;
};

export const defaultDoctors: DoctorSeed[] = [
  { id: "doc1", name: "د. أحمد عبدالله", specialty: "طب عام", specialtyKey: "general", hospital: "مستشفى النيل", city: "القاهرة", rating: 4.5, experienceYears: 10, consultationFee: 150, image: "👨‍⚕️" },
  { id: "doc2", name: "د. محمد علي", specialty: "باطنية", specialtyKey: "internal", hospital: "مستشفى السلام", city: "القاهرة", rating: 4.8, experienceYears: 15, consultationFee: 200, image: "👨‍⚕️" },
  { id: "doc3", name: "د. سارة حسن", specialty: "أطفال", specialtyKey: "pediatrics", hospital: "مستشفى الأطفال", city: "الإسكندرية", rating: 4.9, experienceYears: 12, consultationFee: 180, image: "👩‍⚕️" },
  { id: "doc4", name: "د. خالد عمر", specialty: "قلبية", specialtyKey: "cardiology", hospital: "مستشفى القلب", city: "الجيزة", rating: 4.7, experienceYears: 20, consultationFee: 300, image: "👨‍⚕️" },
  { id: "doc5", name: "د. نورة أحمد", specialty: "جلدية", specialtyKey: "dermatology", hospital: "مركز الجلدية", city: "القاهرة", rating: 4.6, experienceYears: 8, consultationFee: 200, image: "👩‍⚕️" },
  { id: "doc6", name: "د. فيصل الحربي", specialty: "عظام", specialtyKey: "orthopedics", hospital: "مستشفى الملك فهد", city: "الرياض", rating: 4.8, experienceYears: 18, consultationFee: 350, image: "👨‍⚕️" },
  { id: "doc7", name: "د. ليلى محمود", specialty: "نساء وولادة", specialtyKey: "gynecology", hospital: "مستشفى الولادة", city: "جدة", rating: 4.9, experienceYears: 14, consultationFee: 250, image: "👩‍⚕️" },
  { id: "doc8", name: "د. عثمان سليمان", specialty: "أنف وأذن وحنجرة", specialtyKey: "ent", hospital: "مستشفى الأنف والأذن", city: "الرياض", rating: 4.5, experienceYears: 11, consultationFee: 200, image: "👨‍⚕️" },
  { id: "doc9", name: "د. مريم إبراهيم", specialty: "طب نفسي", specialtyKey: "psychiatry", hospital: "مستشفى الصحة النفسية", city: "القاهرة", rating: 4.7, experienceYears: 9, consultationFee: 250, image: "👩‍⚕️" },
  { id: "doc10", name: "د. حسام الدين", specialty: "عيون", specialtyKey: "ophthalmology", hospital: "مستشفى العيون", city: "الإسكندرية", rating: 4.6, experienceYears: 13, consultationFee: 220, image: "👨‍⚕️" },
];
