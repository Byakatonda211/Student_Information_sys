"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { Role, setSession } from "@/lib/store";

function mapBackendRoleToUiRole(role: string): Role {
  // backend roles likely: ADMIN | CLASS_TEACHER | SUBJECT_TEACHER
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "CLASS_TEACHER":
      return "Class Teacher";
    case "SUBJECT_TEACHER":
      return "Teacher";
    case "SYSTEM_ADMIN":
      return "System Admin";
    default:
      return "Administrator";
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Invalid username or password.");
        setLoading(false);
        return;
      }

      // UI session (backend auth is via httpOnly cookie)
      setSession({
        username: data?.fullName || username,
        role: mapBackendRoleToUiRole(String(data?.role || "")),
        createdAt: new Date().toISOString(),
      });

      router.push("/dashboard");
    } catch {
      setError("Network error. Please confirm the server is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* ✅ reduced width here */}
        <Card className="max-w-sm p-6">
          {/* ✅ title fixed here */}
          <div className="text-center">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              Zana Christian High School
            </div>
            <p className="mt-1 text-sm text-slate-600">Student Information System</p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </Button>

            </form>
        </Card>
      </div>
    </div>
  );
}
