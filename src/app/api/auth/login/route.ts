import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Missing username or password" },
        { status: 400 }
      );
    }

    // Select explicitly to guarantee passwordHash is present
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        fullName: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.passwordHash) {
      // This should never happen if your schema requires it, but protects against nulls
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      select: { id: true },
    });

    // ✅ Next.js 16: cookies() is async
    const cookieStore = await cookies();
    cookieStore.set("sis_session", session.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      // secure: true, // uncomment if you're always on https (you are, in prod)
    });

    return NextResponse.json({
      id: user.id,
      fullName: user.fullName,
      role: user.role,
    });
  } catch (e: any) {
    // DEBUG: exposes the real failure both in Railway logs and browser Network response
    console.error("LOGIN ERROR >>>", e);

    return NextResponse.json(
      {
        error: "Server error",
        message: e?.message ?? String(e),
        name: e?.name,
        code: e?.code, // Prisma often provides e.code (e.g. P2021)
      },
      { status: 500 }
    );
  }
}
