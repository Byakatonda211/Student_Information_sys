import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();
    const classes = await prisma.class.findMany({
      orderBy: { order: "asc" },
      include: { streams: { orderBy: { name: "asc" } } },
    });
    return NextResponse.json(classes);
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
    const name = String(body?.name || "").trim(); // "S1"..."S6"
    const level = body?.level; // "O_LEVEL" | "A_LEVEL"
    const order = Number(body?.order ?? 0);

    if (!name || (level !== "O_LEVEL" && level !== "A_LEVEL")) {
      return NextResponse.json({ error: "Invalid name/level" }, { status: 400 });
    }

    const created = await prisma.class.create({
      data: { name, level, order, isActive: true },
    });

    return NextResponse.json(created);
  } catch (e: any) {
    const msg = e?.message || "Error";
    const code = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
