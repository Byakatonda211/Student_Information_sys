import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export type AuthedUser = {
  id: string;
  fullName: string;
  username: string;
  role: string;
};

export async function requireUser(): Promise<AuthedUser> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("sis_session")?.value;

  if (!sessionId) {
    throw new Error("UNAUTHENTICATED");
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    throw new Error("UNAUTHENTICATED");
  }

  return {
    id: session.user.id,
    fullName: session.user.fullName,
    username: session.user.username,
    role: session.user.role,
  };
}

export function requireAdmin(user: AuthedUser) {
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
}
