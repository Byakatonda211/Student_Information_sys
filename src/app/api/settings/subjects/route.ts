import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level"); // optional

    const subjects = await prisma.subject.findMany({
      where: level === "O_LEVEL" || level === "A_LEVEL" ? { level } : undefined,
      orderBy: { name: "asc" },
      include: { papers: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json(subjects);
  } catch (e: any) {
    const code = e?.message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: e?.message || "Error" }, { status: code });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    requireAdmin(user);

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const code = body?.code ? String(body.code).trim() : null;
    const level = body?.level; // O_LEVEL | A_LEVEL

    if (!name || (level !== "O_LEVEL" && level !== "A_LEVEL")) {
      return NextResponse.json({ error: "Invalid name/level" }, { status: 400 });
    }

    const created = await prisma.subject.create({
      data: { name, code: code || undefined, level, isActive: true },
    });

    return NextResponse.json(created);
  } catch (e: any) {
    const msg = e?.message || "Error";
    const code = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
