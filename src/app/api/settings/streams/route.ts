import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");

    const streams = await prisma.stream.findMany({
      where: classId ? { classId } : undefined,
      orderBy: { name: "asc" },
      include: { class: true },
    });

    return NextResponse.json(streams);
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
    const classId = String(body?.classId || "");
    const name = String(body?.name || "").trim();

    if (!classId || !name) {
      return NextResponse.json({ error: "Missing classId/name" }, { status: 400 });
    }

    const created = await prisma.stream.create({
      data: { classId, name, isActive: true },
    });

    return NextResponse.json(created);
  } catch (e: any) {
    const msg = e?.message || "Error";
    const code = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
