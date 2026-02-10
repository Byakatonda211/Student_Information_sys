import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// ✅ Minimal helper: accepts number or numeric string, returns Int | null | undefined
function toNullableIntOrUndefined(v: any): number | null | undefined {
  if (v === undefined) return undefined; // don't set field at all
  if (v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);

    const id = (searchParams.get("id") || "").trim(); // 👈 for profile page support
    const q = (searchParams.get("q") || "").trim();
    const classId = (searchParams.get("classId") || "").trim();
    const streamId = (searchParams.get("streamId") || "").trim();

    // ✅ If an ID is provided, return a single student (profile use-case)
    if (id) {
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

      const latest = student.enrollments?.[0];
      const mapped = {
        ...student,
        classId: latest?.classId || null,
        className: latest?.class?.name || null,
        streamId: latest?.streamId || null,
        streamName: latest?.stream?.name || null,
        academicYearId: latest?.academicYearId || null,
        academicYearName: latest?.academicYear?.name || null,
      };

      // ✅ return multiple shapes (some pages may expect raw object)
      return NextResponse.json({
        student: mapped,
        data: mapped,
      });
    }

    // ✅ Otherwise, return list (students page use-case)
    const enrollmentFilter =
      classId || streamId
        ? {
            enrollments: {
              some: {
                isActive: true,
                ...(classId ? { classId } : {}),
                ...(streamId ? { streamId } : {}),
              },
            },
          }
        : {};

    const students = await prisma.student.findMany({
      where: q
        ? {
            isActive: true,
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { otherNames: { contains: q, mode: "insensitive" } },
              { admissionNo: { contains: q, mode: "insensitive" } },
            ],
            ...enrollmentFilter,
          }
        : { isActive: true, ...enrollmentFilter },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 500,
      include: {
        enrollments: {
          where: {
            isActive: true,
            ...(classId ? { classId } : {}),
            ...(streamId ? { streamId } : {}),
          },
          include: { class: true, stream: true, academicYear: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const mapped = students.map((s) => {
      const latest = s.enrollments?.[0];
      return {
        id: s.id,
        admissionNo: s.admissionNo,
        firstName: s.firstName,
        lastName: s.lastName,
        otherNames: s.otherNames,
        gender: s.gender,

        classId: latest?.classId || null,
        className: latest?.class?.name || null,
        streamId: latest?.streamId || null,
        streamName: latest?.stream?.name || null,
      };
    });

    return NextResponse.json({
      students: mapped,
      data: mapped,
      items: mapped,
    });
  } catch (e: any) {
    const code = e?.message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: e?.message || "Error" }, { status: code });
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const body = await req.json();

    const rawAdmission = body?.admissionNo ? String(body.admissionNo).trim() : "";
    const admissionNo =
      rawAdmission && !rawAdmission.endsWith("-") ? rawAdmission : undefined;

    const firstName = String(body?.firstName || "").trim();
    const lastName = String(body?.lastName || "").trim();

    const academicYearId = String(body?.academicYearId || "").trim();
    const classId = String(body?.classId || "").trim();
    const streamId = body?.streamId ? String(body.streamId).trim() : null;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "firstName and lastName are required" },
        { status: 400 }
      );
    }
    if (!academicYearId || !classId) {
      return NextResponse.json(
        { error: "academicYearId and classId are required" },
        { status: 400 }
      );
    }

    if (admissionNo) {
      const exists = await prisma.student.findUnique({ where: { admissionNo } });
      if (exists) {
        return NextResponse.json(
          { error: `Student number already exists: ${admissionNo}` },
          { status: 409 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          admissionNo: admissionNo || undefined,
          firstName,
          lastName,
          otherNames: body?.otherNames ? String(body.otherNames).trim() : undefined,
          gender: body?.gender || undefined,
          dateOfBirth: body?.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
          phone: body?.phone ? String(body.phone).trim() : undefined,
          email: body?.email ? String(body.email).trim() : undefined,
          address: body?.address ? String(body.address).trim() : undefined,
          guardianName: body?.guardianName ? String(body.guardianName).trim() : undefined,
          guardianPhone: body?.guardianPhone ? String(body.guardianPhone).trim() : undefined,
          guardianEmail: body?.guardianEmail ? String(body.guardianEmail).trim() : undefined,

          // ✅ extended fields (numeric coercion already handled here)
          pleSittingYear: toNullableIntOrUndefined(body?.pleSittingYear),
          plePrimarySchool: body?.plePrimarySchool
            ? String(body.plePrimarySchool).trim()
            : undefined,
          pleIndexNumber: body?.pleIndexNumber
            ? String(body.pleIndexNumber).trim()
            : undefined,
          pleAggregates: toNullableIntOrUndefined(body?.pleAggregates),
          pleDivision: body?.pleDivision ? String(body.pleDivision).trim() : undefined,

          village: body?.village ? String(body.village).trim() : undefined,
          parish: body?.parish ? String(body.parish).trim() : undefined,
          districtOfResidence: body?.districtOfResidence
            ? String(body.districtOfResidence).trim()
            : undefined,
          homeDistrict: body?.homeDistrict ? String(body.homeDistrict).trim() : undefined,

          emergencyContactName: body?.emergencyContactName
            ? String(body.emergencyContactName).trim()
            : undefined,
          emergencyContactPhone: body?.emergencyContactPhone
            ? String(body.emergencyContactPhone).trim()
            : undefined,

          medicalConditions: body?.medicalConditions
            ? String(body.medicalConditions).trim()
            : undefined,
          recurrentMedication: body?.recurrentMedication
            ? String(body.recurrentMedication).trim()
            : undefined,
          knownDisability: body?.knownDisability ? String(body.knownDisability).trim() : undefined,
        },
      });

      const enrollment = await tx.enrollment.create({
        data: {
          studentId: student.id,
          academicYearId,
          classId,
          streamId,
          isActive: true,
          updatedAt: new Date(), // ✅ REQUIRED because DB has updatedAt NOT NULL with no default
        },
      });

      return { student, enrollment };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      const target = Array.isArray(e?.meta?.target)
        ? e.meta.target.join(",")
        : String(e?.meta?.target || "");
      if (target.includes("admissionNo")) {
        return NextResponse.json(
          { error: "Student number already exists. Please use a different one." },
          { status: 409 }
        );
      }
    }

    const msg = e?.message || "Error";
    const code = msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
