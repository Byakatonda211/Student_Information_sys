import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function normalizeStudentForUI(student: any) {
  const latest = student?.enrollments?.[0] || null;

  return {
    ...student,

    // Helpful UI-friendly fields
    academicYearId: latest?.academicYearId ?? null,
    academicYearName: latest?.academicYear?.name ?? null,

    classId: latest?.classId ?? null,
    className: latest?.class?.name ?? null,

    streamId: latest?.streamId ?? null,
    streamName: latest?.stream?.name ?? null,

    enrollmentId: latest?.id ?? null,
  };
}

// ---- Helpers for safe coercion (DOES NOT change UI) ----
function trimOrNull(v: any) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function intOrNull(v: any) {
  if (v === undefined) return undefined; // means “don’t update”
  if (v === null) return null;

  // Accept numbers or numeric strings
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : null;

  const s = String(v).trim();
  if (s === "") return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await ctx.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          where: { isActive: true },
          include: { class: true, stream: true, academicYear: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const shaped = normalizeStudentForUI(student);

    // ✅ Backward compatible: top-level fields + wrapped fields
    return NextResponse.json({
      ...shaped,
      student: shaped,
      data: shaped,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load student" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await ctx.params;

    const body = await req.json();

    const updated = await prisma.student.update({
      where: { id },
      data: {
        admissionNo: trimOrNull(body?.admissionNo),
        firstName: body?.firstName ?? undefined,
        lastName: body?.lastName ?? undefined,
        otherNames: trimOrNull(body?.otherNames),

        gender: body?.gender ?? undefined,
        dateOfBirth: body?.dateOfBirth ? new Date(body.dateOfBirth) : undefined,

        phone: trimOrNull(body?.phone),
        email: trimOrNull(body?.email),
        address: trimOrNull(body?.address),

        guardianName: trimOrNull(body?.guardianName),
        guardianPhone: trimOrNull(body?.guardianPhone),
        guardianEmail: trimOrNull(body?.guardianEmail),

        // ✅ FIX: coerce numeric strings to Int
        pleSittingYear: intOrNull(body?.pleSittingYear),
        plePrimarySchool: trimOrNull(body?.plePrimarySchool),
        pleIndexNumber: trimOrNull(body?.pleIndexNumber),
        pleAggregates: intOrNull(body?.pleAggregates),
        pleDivision: trimOrNull(body?.pleDivision),

        village: trimOrNull(body?.village),
        parish: trimOrNull(body?.parish),
        districtOfResidence: trimOrNull(body?.districtOfResidence),
        homeDistrict: trimOrNull(body?.homeDistrict),

        emergencyContactName: trimOrNull(body?.emergencyContactName),
        emergencyContactPhone: trimOrNull(body?.emergencyContactPhone),

        medicalConditions: trimOrNull(body?.medicalConditions),
        recurrentMedication: trimOrNull(body?.recurrentMedication),
        knownDisability: trimOrNull(body?.knownDisability),
      } as any, // (keeps TS quiet if your client types lag behind schema)
    });

    return NextResponse.json({
      ...updated,
      student: updated,
      data: updated,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to update student" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await ctx.params;

    await prisma.$transaction(async (tx) => {
      await tx.enrollment.updateMany({
        where: { studentId: id, isActive: true },
        data: { isActive: false },
      });
      await tx.student.update({
        where: { id },
        data: { isActive: false },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to delete student" },
      { status: 500 }
    );
  }
}
