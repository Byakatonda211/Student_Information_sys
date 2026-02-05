"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, CardHeader, Input, Label, Select } from "@/components/ui";

type AcademicYear = { id: string; name: string; isCurrent: boolean };
type Term = { id: string; academicYearId: string; name: string; isCurrent?: boolean };
type ClassDef = { id: string; name: string; order?: number; sortOrder?: number };
type StreamDef = { id: string; classId: string; name: string };

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `Request failed (${res.status})`);
  return data as T;
}

export default function MoveStudentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [years, setYears] = React.useState<AcademicYear[]>([]);
  const [terms, setTerms] = React.useState<Term[]>([]);
  const [classes, setClasses] = React.useState<ClassDef[]>([]);
  const [streams, setStreams] = React.useState<StreamDef[]>([]);

  const [yearId, setYearId] = React.useState("");
  const [termId, setTermId] = React.useState("");
  const [classId, setClassId] = React.useState("");
  const [streamId, setStreamId] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [student, setStudent] = React.useState<any>(null);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [y, t, c, s, stu] = await Promise.all([
          apiGet<AcademicYear[]>("/api/settings/academic-years"),
          apiGet<Term[]>("/api/settings/terms"),
          apiGet<ClassDef[]>("/api/settings/classes"),
          apiGet<StreamDef[]>("/api/settings/streams"),
          apiGet<any>(`/api/students/${id}`),
        ]);

        setYears(y || []);
        setTerms(t || []);
        setClasses((c || []).slice().sort((a, b) => ((a.order ?? a.sortOrder ?? 0) - (b.order ?? b.sortOrder ?? 0))));
        setStreams(s || []);
        setStudent(stu);

        const currentYear = (y || []).find((yy) => yy.isCurrent) ?? (y || [])[0];
        if (currentYear) setYearId(currentYear.id);
        const firstClass = (c || [])[0];
        if (firstClass) setClassId(firstClass.id);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const termsForYear = React.useMemo(() => terms.filter((t) => t.academicYearId === yearId), [terms, yearId]);

  React.useEffect(() => {
    const currentTerm = termsForYear.find((tt) => tt.isCurrent) ?? termsForYear[0];
    setTermId(currentTerm?.id || "");
  }, [termsForYear]);

  const streamOptions = React.useMemo(() => streams.filter((s) => s.classId === classId), [streams, classId]);

  React.useEffect(() => {
    if (streamId && !streamOptions.some((x) => x.id === streamId)) setStreamId("");
  }, [streamId, streamOptions]);

  async function submitMove() {
    if (!yearId || !classId) return alert("Select Academic Year and Class.");

    try {
      const res = await fetch(`/api/students/${id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: yearId,
          termId: termId || null,
          classId,
          streamId: streamId || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Move failed (${res.status})`);

      router.push(`/students/${id}`);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Failed to move student");
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-sm text-slate-700">Loading...</div>
      </Card>
    );
  }

  if (notFound || !student) {
    return (
      <Card className="p-6">
        <div className="text-sm font-semibold text-slate-900">Student not found</div>
        <p className="mt-1 text-sm text-slate-600">This record may not exist in the database.</p>
        <Button className="mt-4" onClick={() => router.push("/students")} variant="secondary">
          Back to Students
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Move Student" subtitle="Change class/stream for this student" />
      <div className="grid grid-cols-1 gap-4 p-5 pt-0 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Academic Year *</Label>
          <Select value={yearId} onChange={(e) => setYearId(e.target.value)}>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name} {y.isCurrent ? "(current)" : ""}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Term</Label>
          <Select value={termId} onChange={(e) => setTermId(e.target.value)}>
            <option value="">(optional)</option>
            {termsForYear.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isCurrent ? "(current)" : ""}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Class *</Label>
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Stream</Label>
          <Select value={streamId} onChange={(e) => setStreamId(e.target.value)}>
            <option value="">(none)</option>
            {streamOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => router.push(`/students/${id}`)}>
            Cancel
          </Button>
          <Button onClick={submitMove}>Move Student</Button>
        </div>
      </div>
    </Card>
  );
}
