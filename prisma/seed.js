require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function upsertAcademicSetup() {
  // Academic Year 2026 + Term 1 (current) if missing
  const year = await prisma.academicYear.upsert({
    where: { name: "2026" },
    update: {},
    create: { name: "2026", isCurrent: true },
  });

  // Ensure only one current academic year
  await prisma.academicYear.updateMany({
    where: { id: { not: year.id }, isCurrent: true },
    data: { isCurrent: false },
  });

  const term1 = await prisma.term.upsert({
    where: {
      academicYearId_type: { academicYearId: year.id, type: "TERM_1" },
    },
    update: { isCurrent: true, name: "Term 1" },
    create: {
      academicYearId: year.id,
      type: "TERM_1",
      name: "Term 1",
      isCurrent: true,
    },
  });

  // Ensure only one current term
  await prisma.term.updateMany({
    where: { id: { not: term1.id }, isCurrent: true },
    data: { isCurrent: false },
  });

  return { year, term1 };
}

async function upsertDefaultClasses() {
  const classes = [
    { name: "S1", level: "O_LEVEL", order: 1 },
    { name: "S2", level: "O_LEVEL", order: 2 },
    { name: "S3", level: "O_LEVEL", order: 3 },
    { name: "S4", level: "O_LEVEL", order: 4 },
    { name: "S5", level: "A_LEVEL", order: 5 },
    { name: "S6", level: "A_LEVEL", order: 6 },
  ];

  for (const c of classes) {
    await prisma.class.upsert({
      where: { name: c.name },
      update: { level: c.level, order: c.order, isActive: true },
      create: { name: c.name, level: c.level, order: c.order, isActive: true },
    });
  }
}

async function upsertAssessmentDefaults() {
  // O-Level Midterm: either 1x100 or 2x50/50. We'll seed 2 components by default.
  const oMid = await prisma.assessmentDefinition.upsert({
    where: { level_type_name: { level: "O_LEVEL", type: "MIDTERM", name: "O-Level Midterm" } },
    update: { isActive: true },
    create: { level: "O_LEVEL", type: "MIDTERM", name: "O-Level Midterm", isActive: true },
  });

  await prisma.assessmentComponent.upsert({
    where: { definitionId_key: { definitionId: oMid.id, key: "CA1" } },
    update: { label: "Continuous Assessment 1", weight: 50, order: 1 },
    create: { definitionId: oMid.id, key: "CA1", label: "Continuous Assessment 1", weight: 50, order: 1 },
  });
  await prisma.assessmentComponent.upsert({
    where: { definitionId_key: { definitionId: oMid.id, key: "CA2" } },
    update: { label: "Continuous Assessment 2", weight: 50, order: 2 },
    create: { definitionId: oMid.id, key: "CA2", label: "Continuous Assessment 2", weight: 50, order: 2 },
  });

  // O-Level Endterm: CA1 10, CA2 10, EOT 80 (teacher enters all out of 100)
  const oEnd = await prisma.assessmentDefinition.upsert({
    where: { level_type_name: { level: "O_LEVEL", type: "ENDTERM", name: "O-Level Endterm" } },
    update: { isActive: true },
    create: { level: "O_LEVEL", type: "ENDTERM", name: "O-Level Endterm", isActive: true },
  });

  await prisma.assessmentComponent.upsert({
    where: { definitionId_key: { definitionId: oEnd.id, key: "CA1" } },
    update: { label: "Continuous Assessment 1", weight: 10, order: 1 },
    create: { definitionId: oEnd.id, key: "CA1", label: "Continuous Assessment 1", weight: 10, order: 1 },
  });
  await prisma.assessmentComponent.upsert({
    where: { definitionId_key: { definitionId: oEnd.id, key: "CA2" } },
    update: { label: "Continuous Assessment 2", weight: 10, order: 2 },
    create: { definitionId: oEnd.id, key: "CA2", label: "Continuous Assessment 2", weight: 10, order: 2 },
  });
  await prisma.assessmentComponent.upsert({
    where: { definitionId_key: { definitionId: oEnd.id, key: "EOT" } },
    update: { label: "End of Term Exam", weight: 80, order: 3, isRequired: true },
    create: { definitionId: oEnd.id, key: "EOT", label: "End of Term Exam", weight: 80, order: 3, isRequired: true },
  });

  // A-Level Midterm: MIDTERM 100 (per paper if papers exist)
  const aMid = await prisma.assessmentDefinition.upsert({
    where: { level_type_name: { level: "A_LEVEL", type: "MIDTERM", name: "A-Level Midterm" } },
    update: { isActive: true },
    create: { level: "A_LEVEL", type: "MIDTERM", name: "A-Level Midterm", isActive: true },
  });

  await prisma.assessmentComponent.upsert({
    where: { definitionId_key: { definitionId: aMid.id, key: "MIDTERM" } },
    update: { label: "Midterm", weight: 100, order: 1, isRequired: true },
    create: { definitionId: aMid.id, key: "MIDTERM", label: "Midterm", weight: 100, order: 1, isRequired: true },
  });

  // A-Level Endterm: MIDTERM 50 + ENDTERM 50 (avg later)
  const aEnd = await prisma.assessmentDefinition.upsert({
    where: { level_type_name: { level: "A_LEVEL", type: "ENDTERM", name: "A-Level Endterm" } },
    update: { isActive: true },
    create: { level: "A_LEVEL", type: "ENDTERM", name: "A-Level Endterm", isActive: true },
  });

  await prisma.assessmentComponent.upsert({
    where: { definitionId_key: { definitionId: aEnd.id, key: "MIDTERM" } },
    update: { label: "Midterm", weight: 50, order: 1, isRequired: true },
    create: { definitionId: aEnd.id, key: "MIDTERM", label: "Midterm", weight: 50, order: 1, isRequired: true },
  });
  await prisma.assessmentComponent.upsert({
    where: { definitionId_key: { definitionId: aEnd.id, key: "ENDTERM" } },
    update: { label: "Endterm", weight: 50, order: 2, isRequired: true },
    create: { definitionId: aEnd.id, key: "ENDTERM", label: "Endterm", weight: 50, order: 2, isRequired: true },
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL missing");
  }

  // Admin account
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: { isActive: true, role: "ADMIN" },
    create: {
      fullName: "System Administrator",
      initials: "ADMIN",
      username: "admin",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  await upsertAcademicSetup();
  await upsertDefaultClasses();
  await upsertAssessmentDefaults();

  console.log("✅ Seed complete: admin + academic setup + classes + assessment defaults");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
