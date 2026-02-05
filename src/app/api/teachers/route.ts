import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    requireAdmin(user);

    const teachers = await prisma.user.findMany({
      where: { role: { in: ["SUBJECT_TEACHER", "CLASS_TEACHER", "ADMIN"] } },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        initials: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(teachers);
  } catch (e: any) {
    const msg = e?.message || "Error";
    const code = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    requireAdmin(user);

    const body = await req.json();
    const fullName = String(body?.fullName || "").trim();
    const initials = String(body?.initials || "").trim().toUpperCase();
    const username = String(body?.username || "").trim();
    const role = String(body?.role || "SUBJECT_TEACHER"); // ADMIN | CLASS_TEACHER | SUBJECT_TEACHER
    const password = String(body?.password || "").trim();

    if (!fullName || !initials || !username || !password) {
      return NextResponse.json({ error: "Missing fullName/initials/username/password" }, { status: 400 });
    }
    if (!["ADMIN", "CLASS_TEACHER", "SUBJECT_TEACHER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await prisma.user.create({
      data: { fullName, initials, username, passwordHash, role, isActive: true },
      select: { id: true, fullName: true, initials: true, username: true, role: true, isActive: true },
    });

    return NextResponse.json(created);
  } catch (e: any) {
    const msg = e?.message || "Error";
    const code = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
