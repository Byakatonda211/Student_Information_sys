import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();
    const years = await prisma.academicYear.findMany({
      orderBy: { name: "desc" },
    });
    return NextResponse.json(years);
  } catch (e: any) {
    const code = e?.message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: e?.message || "Error" }, { status: code });
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const body = await req.json().catch(() => ({}));

    const name = String(body?.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const makeCurrent = Boolean(body?.isCurrent);

    const created = await prisma.$transaction(async (tx) => {
      if (makeCurrent) {
        await tx.academicYear.updateMany({
          data: { isCurrent: false },
        });
      }

      const year = await tx.academicYear.create({
        data: {
          name,
          isCurrent: makeCurrent,
        },
      });

      return year;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    const msg = e?.message || "Error";
    const code = msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

/**
 * PATCH supports:
 * - set current year: { id: "..." }
 */
export async function PATCH(req: Request) {
  try {
    await requireUser();
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.academicYear.updateMany({ data: { isCurrent: false } });
      const y = await tx.academicYear.update({ where: { id }, data: { isCurrent: true } });
      return y;
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    const msg = e?.message || "Error";
    const code = msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

/**
 * DELETE supports:
 * - /api/settings/academic-years?id=...
 */
export async function DELETE(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await prisma.academicYear.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "Error";
    const code = msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
