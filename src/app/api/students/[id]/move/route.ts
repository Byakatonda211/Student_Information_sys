import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();

    const { id } = await ctx.params;
    const body = await req.json();

    const academicYearId = String(body?.academicYearId || "").trim();
    const classId = String(body?.classId || "").trim();
    const streamIdRaw = body?.streamId;
    const streamId =
      streamIdRaw === null || streamIdRaw === undefined || String(streamIdRaw).trim() === ""
        ? null
        : String(streamIdRaw).trim();

    if (!academicYearId || !classId) {
      return NextResponse.json(
        { error: "academicYearId and classId are required" },
        { status: 400 }
      );
    }

    // Ensure student exists
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) deactivate any active enrollment(s)
      await tx.enrollment.updateMany({
        where: { studentId: id, isActive: true },
        data: { isActive: false },
      });

      // 2) create a new active enrollment
      const enrollment = await tx.enrollment.create({
        data: {
          studentId: id,
          academicYearId,
          classId,
          streamId,
          isActive: true,
        },
      });

      return { enrollment };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    const msg = e?.message || "Move failed";
    const code = msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
