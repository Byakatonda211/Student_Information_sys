"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

type ClassItem = { id: string; name: string };
type StreamItem = { id: string; name: string; classId: string };

type ApiStudent = {
  id: string;
  admissionNo?: string | null;
  firstName: string;
  lastName: string;
  otherNames?: string | null;
  gender?: string | null;
  classId?: string | null;
  className?: string | null;
  streamId?: string | null;
  streamName?: string | null;
};

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export default function StudentsPage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<ApiStudent[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [classes, setClasses] = React.useState<ClassItem[]>([]);
  const [streams, setStreams] = React.useState<StreamItem[]>([]);
  const [classFilter, setClassFilter] = React.useState<string>("");
  const [streamFilter, setStreamFilter] = React.useState<string>("");

  const [debouncedQ, setDebouncedQ] = React.useState("");
  const debounceRef = React.useRef<number | null>(null);

  // live search debounce
  React.useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setDebouncedQ(q), 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q]);

  // load filters
  React.useEffect(() => {
    (async () => {
      try {
        const [cls, str] = await Promise.all([
          apiGet<ClassItem[]>("/api/settings/classes"),
          apiGet<StreamItem[]>("/api/settings/streams"),
        ]);
        setClasses(cls);
        setStreams(str);
      } catch {
        // filters optional
      }
    })();
  }, []);

  const visibleStreams = React.useMemo(() => {
    if (!classFilter) return streams;
    return streams.filter((s) => s.classId === classFilter);
  }, [streams, classFilter]);

  // auto-clear stream if not valid for the class
  React.useEffect(() => {
    if (streamFilter && classFilter) {
      const ok = visibleStreams.some((s) => s.id === streamFilter);
      if (!ok) setStreamFilter("");
    }
  }, [classFilter, streamFilter, visibleStreams]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
      if (classFilter) params.set("classId", classFilter);
      if (streamFilter) params.set("streamId", streamFilter);

      const url = params.toString() ? `/api/students?${params.toString()}` : "/api/students";

     // The API may return either an array (legacy) or an object { students: [...] } (current)
     const data = await apiGet<any>(url);

     const list: ApiStudent[] = Array.isArray(data)
        ? data
        : (data?.students || data?.data || data?.items || []);

setRows(list);

    } catch (e: any) {
      setError(e?.message || "Failed to load students");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, classFilter, streamFilter]);

  async function deleteStudent(id: string, name: string) {
    const ok = window.confirm(`Delete ${name}? This cannot be undone.`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Delete failed (${res.status})`);
      await load();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Students</h1>
          <p className="text-sm text-slate-600">Search, view, edit, move, and delete students.</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => router.push("/students/new")}>Add Student</Button>
        </div>
      </div>

      <Card>
        <div className="p-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 w-full">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Search name or admission number..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Class</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Stream</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                value={streamFilter}
                onChange={(e) => setStreamFilter(e.target.value)}
              >
                <option value="">All streams</option>
                {visibleStreams.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-sm text-slate-600">{loading ? "Loading..." : `${rows.length} student(s)`}</div>
        </div>

        <div className="border-t border-slate-200" />

        {error ? (
          <div className="p-4 text-sm text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Admission No</th>
                  <th className="px-4 py-3 font-medium">Student Name</th>
                  <th className="px-4 py-3 font-medium">Gender</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Stream</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-600" colSpan={6}>
                      Loading students...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-600" colSpan={6}>
                      No students found.
                    </td>
                  </tr>
                ) : (
                  rows.map((s) => {
                    const name = [s.firstName, s.otherNames, s.lastName].filter(Boolean).join(" ");
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">{s.admissionNo || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{name}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{s.gender || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{s.className || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{s.streamName || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2 justify-end">
                            <Button variant="secondary" onClick={() => router.push(`/students/${s.id}`)}>
                              View
                            </Button>

                            <Button variant="secondary" onClick={() => router.push(`/students/${s.id}/edit`)}>
                              Edit
                            </Button>

                            <Button variant="secondary" onClick={() => router.push(`/students/${s.id}/move`)}>
                              Move
                            </Button>

                            <Button variant="destructive" onClick={() => deleteStudent(s.id, name)}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
