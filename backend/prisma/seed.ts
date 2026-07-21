import { AppointmentStatus, PrismaClient, SlotStatus, Specialty } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateSlots } from '../src/services/slotGeneration.service';

const prisma = new PrismaClient();

const CLINICS = [
  { code: 'RYD', name: 'MediBook Olaya', nameAr: 'ميدي بوك العليا', address: 'King Fahd Road, Al Olaya', addressAr: 'طريق الملك فهد، العليا', city: 'Riyadh', cityAr: 'الرياض', phone: '+966 11 555 0101' },
  { code: 'JED', name: 'MediBook Corniche', nameAr: 'ميدي بوك الكورنيش', address: 'Corniche Road, Ash Shati', addressAr: 'طريق الكورنيش، الشاطئ', city: 'Jeddah', cityAr: 'جدة', phone: '+966 12 555 0188' },
];

const DOCTORS = [
  { name: 'Dr. Abdullah Al-Qahtani', nameAr: 'د. عبدالله القحطاني', specialty: Specialty.GENERAL_PRACTICE, clinics: ['RYD', 'JED'], bio: 'Family medicine, 12 years of practice.', bioAr: 'طب الأسرة، خبرة 12 عاماً.' },
  { name: 'Dr. Sara Al-Harbi', nameAr: 'د. سارة الحربي', specialty: Specialty.GENERAL_PRACTICE, clinics: ['JED'], bio: 'Preventive care and chronic condition management.', bioAr: 'الرعاية الوقائية وإدارة الأمراض المزمنة.' },
  { name: 'Dr. Reem Al-Otaibi', nameAr: 'د. ريم العتيبي', specialty: Specialty.PEDIATRICS, clinics: ['RYD'], bio: 'Newborn through adolescent care.', bioAr: 'رعاية الأطفال من الولادة حتى المراهقة.' },
  { name: 'Dr. Noura Al-Shehri', nameAr: 'د. نورة الشهري', specialty: Specialty.DERMATOLOGY, clinics: ['RYD'], bio: 'Medical dermatology and skin cancer screening.', bioAr: 'الأمراض الجلدية والكشف المبكر عن سرطان الجلد.' },
  { name: 'Dr. Khalid Al-Ghamdi', nameAr: 'د. خالد الغامدي', specialty: Specialty.CARDIOLOGY, clinics: ['JED'], bio: 'Non-invasive cardiology, ECG and stress testing.', bioAr: 'أمراض القلب غير التداخلية، تخطيط القلب واختبار الجهد.' },
  { name: 'Dr. Faisal Al-Mutairi', nameAr: 'د. فيصل المطيري', specialty: Specialty.ORTHOPEDICS, clinics: ['RYD', 'JED'], bio: 'Sports injuries and joint health.', bioAr: 'الإصابات الرياضية وصحة المفاصل.' },
];

const SERVICES = [
  { name: 'General Consultation', nameAr: 'استشارة عامة', durationMinutes: 30, price: 150, requiresApproval: false, specialties: [Specialty.GENERAL_PRACTICE] },
  { name: 'Follow-up Visit', nameAr: 'زيارة متابعة', durationMinutes: 15, price: 80, requiresApproval: false, specialties: [Specialty.GENERAL_PRACTICE, Specialty.PEDIATRICS, Specialty.DERMATOLOGY, Specialty.CARDIOLOGY, Specialty.ORTHOPEDICS] },
  { name: 'Annual Physical', nameAr: 'الفحص السنوي الشامل', durationMinutes: 45, price: 400, requiresApproval: true, specialties: [Specialty.GENERAL_PRACTICE] },
  { name: 'Pediatric Checkup', nameAr: 'فحص الأطفال', durationMinutes: 30, price: 180, requiresApproval: false, specialties: [Specialty.PEDIATRICS] },
  { name: 'Skin Screening', nameAr: 'فحص الجلد', durationMinutes: 30, price: 250, requiresApproval: true, specialties: [Specialty.DERMATOLOGY] },
  { name: 'ECG & Consultation', nameAr: 'تخطيط القلب مع استشارة', durationMinutes: 45, price: 450, requiresApproval: true, specialties: [Specialty.CARDIOLOGY] },
];

const AVAILABILITY: Array<{ doctor: number; clinic: string; days: number[]; start: string; end: string }> = [
  { doctor: 0, clinic: 'RYD', days: [1, 3, 5], start: '09:00', end: '17:00' },
  { doctor: 0, clinic: 'JED', days: [2, 4], start: '10:00', end: '16:00' },
  { doctor: 1, clinic: 'JED', days: [1, 2, 3, 4, 5], start: '08:00', end: '14:00' },
  { doctor: 2, clinic: 'RYD', days: [1, 2, 4, 5], start: '09:00', end: '15:00' },
  { doctor: 3, clinic: 'RYD', days: [2, 3], start: '11:00', end: '18:00' },
  { doctor: 4, clinic: 'JED', days: [1, 3, 5], start: '09:00', end: '13:00' },
  { doctor: 5, clinic: 'RYD', days: [1, 4], start: '13:00', end: '19:00' },
  { doctor: 5, clinic: 'JED', days: [2, 5], start: '09:00', end: '13:00' },
];

const SLOT_DAYS = 21;
const SLOT_MINUTES = 30;

async function main() {
  console.log('Clearing existing data...');
  await prisma.appointment.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.timeOff.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.doctorClinic.deleteMany();
  await prisma.service.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding clinics...');
  const clinics = new Map<string, string>();
  for (const c of CLINICS) {
    const created = await prisma.clinic.create({ data: c });
    clinics.set(created.code, created.id);
  }

  console.log('Seeding users (one per role)...');
  const passwordHash = await bcrypt.hash('password123', 10);
  const patient = await prisma.user.create({
    data: { email: 'patient@medibook.test', passwordHash, fullName: 'Aisha Al-Zahrani', role: 'PATIENT', gender: 'FEMALE', phone: '+966 50 555 0111' },
  });
  const staff = await prisma.user.create({
    data: { email: 'staff@medibook.test', passwordHash, fullName: 'Omar Al-Amri', role: 'STAFF', phone: '+966 50 555 0122' },
  });
  const doctorUser = await prisma.user.create({
    data: { email: 'doctor@medibook.test', passwordHash, fullName: 'Dr. Abdullah Al-Qahtani', role: 'DOCTOR', phone: '+966 50 555 0133' },
  });

  console.log('Seeding doctors...');
  const doctorIds: string[] = [];
  for (const [i, d] of DOCTORS.entries()) {
    const created = await prisma.doctor.create({
      data: {
        name: d.name,
        nameAr: d.nameAr,
        specialty: d.specialty,
        bio: d.bio,
        bioAr: d.bioAr,
        userId: i === 0 ? doctorUser.id : undefined,
        clinics: { create: d.clinics.map((code) => ({ clinicId: clinics.get(code)! })) },
      },
    });
    doctorIds.push(created.id);
  }

  console.log('Seeding services...');
  const serviceIds = new Map<string, string>();
  for (const s of SERVICES) {
    const created = await prisma.service.create({ data: s });
    serviceIds.set(created.name, created.id);
  }

  console.log('Seeding availability rules...');
  for (const a of AVAILABILITY) {
    for (const day of a.days) {
      await prisma.availability.create({
        data: {
          doctorId: doctorIds[a.doctor],
          clinicId: clinics.get(a.clinic)!,
          dayOfWeek: day,
          startTime: a.start,
          endTime: a.end,
        },
      });
    }
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const DAY_MS = 24 * 60 * 60 * 1000;
  const ymd = (d: Date) => d.toISOString().slice(0, 10);

  console.log('Seeding a time-off block (Dr. Al-Shehri, dermatology conference)...');
  const offStart = new Date(today.getTime() + 8 * DAY_MS);
  await prisma.timeOff.create({
    data: {
      doctorId: doctorIds[3],
      startAt: offStart,
      endAt: new Date(offStart.getTime() + 3 * DAY_MS),
      reason: 'Dermatology conference',
    },
  });

  console.log('Generating slots...');
  let slotCount = 0;
  for (const doctorId of doctorIds) {
    const result = await generateSlots({
      doctorId,
      from: ymd(new Date(today.getTime() + 1 * DAY_MS)),
      to: ymd(new Date(today.getTime() + (SLOT_DAYS + 1) * DAY_MS)),
      slotMinutes: SLOT_MINUTES,
    });
    slotCount += result.created;
  }

  console.log('Seeding some pre-existing appointments...');
  const bookableSlots = await prisma.slot.findMany({
    where: { status: SlotStatus.OPEN, doctorId: doctorIds[0] },
    orderBy: { startAt: 'asc' },
    take: 3,
  });
  const preBookings: Array<{ service: string; status: AppointmentStatus; bookedBy: string }> = [
    { service: 'General Consultation', status: AppointmentStatus.CONFIRMED, bookedBy: patient.id },
    { service: 'Annual Physical', status: AppointmentStatus.REQUESTED, bookedBy: patient.id },
    { service: 'Follow-up Visit', status: AppointmentStatus.CONFIRMED, bookedBy: staff.id },
  ];
  for (const [i, slot] of bookableSlots.entries()) {
    const pre = preBookings[i];
    await prisma.appointment.create({
      data: {
        reference: `SEED${(i + 1).toString().padStart(2, '0')}`,
        status: pre.status,
        patientId: patient.id,
        slotId: slot.id,
        serviceId: serviceIds.get(pre.service)!,
        bookedById: pre.bookedBy,
      },
    });
    await prisma.slot.update({ where: { id: slot.id }, data: { status: SlotStatus.BOOKED } });
  }

  console.log(`\nDone. Seeded ${CLINICS.length} clinics, ${DOCTORS.length} doctors, ` +
    `${SERVICES.length} services, ${slotCount} slots, ${bookableSlots.length} appointments.`);
  console.log('Logins (password for all: password123)');
  console.log('  patient@medibook.test  (PATIENT)');
  console.log('  staff@medibook.test    (STAFF)');
  console.log('  doctor@medibook.test   (DOCTOR, Dr. Abdullah Al-Qahtani)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
