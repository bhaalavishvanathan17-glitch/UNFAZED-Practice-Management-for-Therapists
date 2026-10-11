const Therapist = require('../models/Therapist');
const Availability = require('../models/Availability');
const Client = require('../models/Client');
const Package = require('../models/Package');

const seedDemoData = async () => {
  try {
    const existing = await Therapist.findOne({ email: 'dr.kabir@unfazed.test' });
    if (existing) return;

    console.log('🌱 Seeding demo therapists, clients & packages for development...');

    // 1. Dr. Kabir Roy
    const drKabir = await Therapist.create({
      name: 'Dr. Kabir Roy',
      email: 'dr.kabir@unfazed.test',
      password: 'password123',
      slug: 'dr-kabir-roy',
      title: 'Senior Clinical Psychologist, Ph.D.',
      specialization: 'Cognitive Behavioral Therapy & Anxiety Specialist',
      bio: 'Over 12 years of clinical experience supporting individuals through generalized anxiety, panic disorders, and academic/executive burnout.',
      city: 'Bengaluru',
      yearsOfExperience: 12,
      pricing: {
        individualSession: 1500,
        couplesSession: 2200,
      },
      services: [
        {
          title: 'Individual Therapy',
          description: '1-on-1 evidence-based cognitive behavioral therapy.',
          durationMinutes: 60,
          priceInr: 1500,
          mode: 'both',
          isActive: true,
        },
        {
          title: 'Anxiety & Panic Intensive',
          description: 'Targeted session for acute anxiety and somatic symptoms.',
          durationMinutes: 45,
          priceInr: 1200,
          mode: 'video',
          isActive: true,
        },
        {
          title: 'Couples Consultation',
          description: 'Conflict resolution and interpersonal attachment therapy.',
          durationMinutes: 90,
          priceInr: 2200,
          mode: 'both',
          isActive: true,
        },
      ],
      isPublished: true,
    });

    // 2. Default Availability for Dr. Kabir
    await Availability.create({
      therapistId: drKabir._id,
      weeklySchedule: [
        { dayOfWeek: 1, isAvailable: true, slots: [{ startTime: '10:00', endTime: '18:00' }] }, // Monday
        { dayOfWeek: 2, isAvailable: true, slots: [{ startTime: '10:00', endTime: '18:00' }] }, // Tuesday
        { dayOfWeek: 3, isAvailable: true, slots: [{ startTime: '10:00', endTime: '18:00' }] }, // Wednesday
        { dayOfWeek: 4, isAvailable: true, slots: [{ startTime: '10:00', endTime: '18:00' }] }, // Thursday
        { dayOfWeek: 5, isAvailable: true, slots: [{ startTime: '10:00', endTime: '18:00' }] }, // Friday
        { dayOfWeek: 6, isAvailable: false, slots: [] },
        { dayOfWeek: 0, isAvailable: false, slots: [] },
      ],
      sessionDuration: 60,
      bufferMinutes: 15,
      advanceNoticeHours: 2,
    });

    // 3. Demo Clients for Dr. Kabir
    await Client.create({
      therapistId: drKabir._id,
      name: 'Meera Patel',
      email: 'meera@example.com',
      phone: '+91 9123456780',
      status: 'active',
      tags: ['Individual', 'Anxiety'],
      internalNotes: 'Referred by Dr. Mehta for cognitive therapy.',
      intakeCompleted: true,
      intakeForm: {
        dateOfBirth: '1994-06-15',
        gender: 'female',
        emergencyContactName: 'Rajesh Patel',
        emergencyContactPhone: '+91 9988771122',
        emergencyContactRelation: 'Spouse',
        presentingConcerns: ['Work burnout', 'Generalized Anxiety', 'Insomnia'],
        priorTherapyExperience: 'yes',
        currentMedications: 'None',
        goalsForTherapy: 'Develop healthy boundaries and overcome panic attacks.',
        submittedAt: new Date(),
      },
      consentRecord: {
        agreed: true,
        agreedAt: new Date(),
        ipAddress: '127.0.0.1',
        consentVersion: 'v1.0-standard-intake-consent',
        consentText: 'Digital informed consent captured during client intake questionnaire.',
      },
    });

    await Client.create({
      therapistId: drKabir._id,
      name: 'Nisha Singhania',
      email: 'nisha@test.com',
      phone: '+91 9811223344',
      status: 'active',
      tags: ['Individual', 'Anxiety'],
      internalNotes: 'Client presented with acute work-related anxiety and boundary distress.',
      intakeCompleted: true,
      intakeForm: {
        dateOfBirth: '1995-08-20',
        gender: 'female',
        emergencyContactName: 'Vikram Singhania',
        emergencyContactPhone: '+91 9877665544',
        emergencyContactRelation: 'Brother',
        presentingConcerns: ['Work & Academic Burnout', 'Generalized Anxiety & Panic'],
        priorTherapyExperience: 'yes',
        currentMedications: 'None',
        goalsForTherapy: 'Improve coping mechanisms, manage stress, and establish healthy work-life balance.',
        submittedAt: new Date(),
      },
      consentRecord: {
        agreed: true,
        agreedAt: new Date(),
        ipAddress: '127.0.0.1',
        consentVersion: 'v1.0-standard-intake-consent',
        consentText: 'Digital informed consent captured during client intake questionnaire.',
      },
    });

    // 4. Default Packages for Dr. Kabir
    await Package.create({
      therapistId: drKabir._id,
      title: 'Therapy Starter Package',
      sessionCount: 3,
      discountPercent: 10,
      pricePaise: 405000, // 3 * 1500 * 0.9 = 4050 INR = 405000 paise
      perSessionPricePaise: 135000,
      validityDays: 60,
      description: 'Ideal for tackling specific situational stressors and developing initial coping strategies.',
      isActive: true,
    });

    await Package.create({
      therapistId: drKabir._id,
      title: 'Deep Healing Package',
      sessionCount: 6,
      discountPercent: 15,
      pricePaise: 765000, // 6 * 1500 * 0.85 = 7650 INR = 765000 paise
      perSessionPricePaise: 127500,
      validityDays: 120,
      description: 'Comprehensive course for sustained progress, emotional regulation, and cognitive restructuring.',
      isActive: true,
    });

    await Package.create({
      therapistId: drKabir._id,
      title: 'Long-term Transformation',
      sessionCount: 12,
      discountPercent: 20,
      pricePaise: 1440000, // 12 * 1500 * 0.8 = 14400 INR = 1440000 paise
      perSessionPricePaise: 120000,
      validityDays: 240,
      description: 'In-depth therapeutic journey for trauma resolution, deep relationship patterns, and self-actualization.',
      isActive: true,
    });

    // 5. Dr. Ananya Sharma
    await Therapist.create({
      name: 'Dr. Ananya Sharma',
      email: 'dr.ananya@unfazed.test',
      password: 'password123',
      slug: 'dr-ananya-sharma',
      title: 'Licensed Clinical Psychologist, M.Phil',
      specialization: 'Trauma-Informed Therapy & Relational Counseling',
      city: 'New Delhi',
      yearsOfExperience: 9,
      pricing: { individualSession: 1800 },
      services: [{
        title: 'Individual Therapy',
        description: 'Comprehensive trauma-informed consultation.',
        durationMinutes: 60,
        priceInr: 1800,
        mode: 'video',
        isActive: true,
      }],
      isPublished: true,
    });

    console.log('✅ Demo seed data initialized successfully.');
  } catch (err) {
    console.error('Seed data error:', err.message);
  }
};

module.exports = { seedDemoData };
