"use client";

import React from "react";
import { Badge, Button, Card, CardHeader, Input, Select } from "@/components/ui";

type ApiAcademicYear = {
  id: string;
  name: string;
  isCurrent: boolean;
};

type ApiTerm = {
  id: string;
  name: string;
  academicYearId: string;
  isCurrent: boolean;
};

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `Request failed (${res.status})`);
  return data as T;
}

async function apiPost<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `Request failed (${res.status})`);
  return data as T;
}

async function apiPatch<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `Request failed (${res.status})`);
  return data as T;
}

async function apiDelete<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `Request failed (${res.status})`);
  return data as T;
}

export default function AcademicsSettingsPage() {
  const [years, setYears] = React.useState<ApiAcademicYear[]>([]);
  const [terms, setTerms] = React.useState<ApiTerm[]>([]);
  const [newYear, setNewYear] = React.useState("");
  const [selectedYearId, setSelectedYearId] = React.useState<string>("");

  const [newTerm, setNewTerm] = React.useState("Term 1");
  const [err, setErr] = React.useState<string>("");

  async function refresh() {
    setErr("");
    const y = await apiGet<ApiAcademicYear[]>("/api/settings/academic-years");
    const t = await apiGet<ApiTerm[]>("/api/settings/terms");
    setYears(y || []);
    setTerms(t || []);

    const current = (y || []).find((yy) => yy.isCurrent) ?? (y || [])[0];
    setSelectedYearId(current?.id ?? "");
  }

  React.useEffect(() => {
    refresh().catch((e: any) => setErr(e?.message || "Failed to load academic setup"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTerms = terms.filter((t) => t.academicYearId === selectedYearId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Academic Setup</h1>
        <p className="mt-1 text-sm text-slate-600">Set current academic year and term.</p>
        {err ? <p className="mt-2 text-sm font-semibold text-red-600">{err}</p> : null}
      </div>

      <Card>
        <CardHeader title="Academic Years" subtitle="Add years and choose the current year" />
        <div className="p-5 pt-0 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input placeholder="e.g. 2026" value={newYear} onChange={(e) => setNewYear(e.target.value)} />
            <Button
              onClick={async () => {
                const name = newYear.trim();
                if (!name) return;
                try {
                  await apiPost<ApiAcademicYear>("/api/settings/academic-years", { name, isCurrent: false });
                  setNewYear("");
                  await refresh();
                } catch (e: any) {
                  setErr(e?.message || "Failed to add year");
                }
              }}
            >
              Add Year
            </Button>
          </div>

          <div className="space-y-2">
            {years.length === 0 ? (
              <div className="text-sm text-slate-600">No academic years yet.</div>
            ) : (
              years.map((y) => (
                <div
                  key={y.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-extrabold text-slate-900">{y.name}</div>
                    {y.isCurrent ? <Badge>Current</Badge> : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!y.isCurrent ? (
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          try {
                            await apiPatch<ApiAcademicYear>("/api/settings/academic-years", { id: y.id });
                            await refresh();
                          } catch (e: any) {
                            setErr(e?.message || "Failed to set current year");
                          }
                        }}
                      >
                        Set Current
                      </Button>
                    ) : null}
                    <Button
                      variant="danger"
                      onClick={async () => {
                        try {
                          await apiDelete<{ ok: true }>(`/api/settings/academic-years?id=${encodeURIComponent(y.id)}`);
                          await refresh();
                        } catch (e: any) {
                          setErr(e?.message || "Failed to delete year");
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Terms" subtitle="Manage terms for the selected academic year" />
        <div className="p-5 pt-0 space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Select value={selectedYearId} onChange={(e) => setSelectedYearId(e.target.value)}>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.isCurrent ? "(current)" : ""}
                </option>
              ))}
            </Select>

            <Select value={newTerm} onChange={(e) => setNewTerm(e.target.value)}>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </Select>

            <Button
              onClick={async () => {
                if (!selectedYearId) return;
                try {
                  await apiPost<ApiTerm>("/api/settings/terms", {
                    academicYearId: selectedYearId,
                    name: newTerm,
                    isCurrent: false,
                  });
                  await refresh();
                } catch (e: any) {
                  setErr(e?.message || "Failed to add term");
                }
              }}
            >
              Add Term
            </Button>
          </div>

          <div className="space-y-2">
            {selectedTerms.length === 0 ? (
              <div className="text-sm text-slate-600">No terms for this year.</div>
            ) : (
              selectedTerms.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-extrabold text-slate-900">{t.name}</div>
                    {t.isCurrent ? <Badge>Current</Badge> : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!t.isCurrent ? (
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          try {
                            await apiPatch<ApiTerm>("/api/settings/terms", { id: t.id });
                            await refresh();
                          } catch (e: any) {
                            setErr(e?.message || "Failed to set current term");
                          }
                        }}
                      >
                        Set Current
                      </Button>
                    ) : null}
                    <Button
                      variant="danger"
                      onClick={async () => {
                        try {
                          await apiDelete<{ ok: true }>(`/api/settings/terms?id=${encodeURIComponent(t.id)}`);
                          await refresh();
                        } catch (e: any) {
                          setErr(e?.message || "Failed to delete term");
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
