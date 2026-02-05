import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { TermType } from "@prisma/client";

function termTypeFromName(name: string): TermType {
  const n = (name || "").trim().toLowerCase();

  if (n === "term 1" || n === "term1" || n === "t1" || n === "1") return TermType.TERM_1;
  if (n === "term 2" || n === "term2" || n === "t2" || n === "2") return TermType.TERM_2;
  if (n === "term 3" || n === "term3" || n === "t3" || n === "3") return TermType.TERM_3;

  // Fallback: if caller sent enum values directly
  if ((name || "").trim() === "TERM_1") return TermType.TERM_1;
  if ((name || "").trim() === "TERM_2") return TermType.TERM_2;
  if ((name || "").trim() === "TERM_3") return TermType.TERM_3;

  throw new Error(`Invalid term name: ${name}`);
}

export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const academicYearId = String(searchParams.get("academicYearId") || "").trim();

    const terms = await prisma.term.findMany({
      where: academicYearId ? { academicYearId } : undefined,
      orderBy: [{ academicYearId: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(terms);
  } catch (e: any) {
    const code = e?.message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: e?.message || "Error" }, { status: code });
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const body = await req.json().catch(() => ({}));

    const academicYearId = String(body?.academicYearId || "").trim();
    const name = String(body?.name || "").trim();
    if (!academicYearId || !name) {
      return NextResponse.json(
        { error: "academicYearId and name are required" },
        { status: 400 }
      );
    }

    const makeCurrent = Boolean(body?.isCurrent);

    const created = await prisma.$transaction(async (tx) => {
      if (makeCurrent) {
        await tx.term.updateMany({
          where: { academicYearId },
          data: { isCurrent: false },
        });
      }

      // avoid duplicate term names for same year (optional safety)
      const exists = await tx.term.findFirst({ where: { academicYearId, name } });
      if (exists) return exists;

      const term = await tx.term.create({
        data: {
          academicYearId,
          name,
          type: termTypeFromName(name), // ✅ REQUIRED by schema
          isCurrent: makeCurrent,
        },
      });

      return term;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    const msg = e?.message || "Error";
    const code = msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireUser();
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const term = await prisma.term.findUnique({ where: { id } });
    if (!term) return NextResponse.json({ error: "Term not found" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.term.updateMany({
        where: { academicYearId: term.academicYearId },
        data: { isCurrent: false },
      });
      const t = await tx.term.update({ where: { id }, data: { isCurrent: true } });
      return t;
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    const msg = e?.message || "Error";
    const code = msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await prisma.term.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "Error";
    const code = msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
