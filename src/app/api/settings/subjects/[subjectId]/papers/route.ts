import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";

export async function GET(_: Request, ctx: { params: Promise<{ subjectId: string }> }) {
  try {
    await requireUser();
    const { subjectId } = await ctx.params;

    const papers = await prisma.subjectPaper.findMany({
      where: { subjectId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(papers);
  } catch (e: any) {
    const code = e?.message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: e?.message || "Error" }, { status: code });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ subjectId: string }> }) {
  try {
    const user = await requireUser();
    requireAdmin(user);

    const { subjectId } = await ctx.params;
    const body = await req.json();

    // Allow creating one paper OR many papers at once
    const items = Array.isArray(body?.papers) ? body.papers : [body];

    const created = [];
    for (const it of items) {
      const name = String(it?.name || "").trim();
      const order = Number(it?.order ?? 1);

      if (!name) continue;

      created.push(
        await prisma.subjectPaper.upsert({
          where: { subjectId_name: { subjectId, name } },
          update: { order, isActive: true },
          create: { subjectId, name, order, isActive: true },
        })
      );
    }

    return NextResponse.json(created);
  } catch (e: any) {
    const msg = e?.message || "Error";
    const code = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
