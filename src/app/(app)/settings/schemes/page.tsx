"use client";

import React from "react";
import {
  getAssessments,
  getSchemeByReportType,
  resetSchemesToDefaults,
  upsertScheme,
  type ReportType,
  type SchemeComponent,
  type AssessmentDef,
} from "@/lib/store";
import { Button, Card, CardHeader, Input, Label, Select, Badge } from "@/components/ui";

const REPORTS: { type: ReportType; label: string }[] = [
  { type: "O_MID", label: "O-Level Midterm" },
  { type: "O_EOT", label: "O-Level Endterm" },
  { type: "A_MID", label: "A-Level Midterm" },
  { type: "A_EOT", label: "A-Level Endterm" },
];

export default function SchemesPage() {
  const [assessments, setAssessments] = React.useState<AssessmentDef[]>([]);
  const [activeType, setActiveType] = React.useState<ReportType>("O_MID");

  const [name, setName] = React.useState("");
  const [components, setComponents] = React.useState<SchemeComponent[]>([]);

  function refreshAssessments() {
    setAssessments(getAssessments().filter((a) => a.isActive));
  }

  function loadScheme(type: ReportType) {
    const s = getSchemeByReportType(type);
    if (!s) {
      setName("");
      setComponents([]);
      return;
    }
    setName(s.name);
    setComponents(s.components);
  }

  React.useEffect(() => {
    refreshAssessments();
    loadScheme(activeType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChangeType(next: ReportType) {
    setActiveType(next);
    loadScheme(next);
  }

  function addRow() {
    const first = assessments[0]?.id ?? "";
    setComponents((prev) => [...prev, { assessmentId: first, weightOutOf: 0 }]);
  }

  function updateRow(i: number, patch: Partial<SchemeComponent>) {
    setComponents((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function removeRow(i: number) {
    setComponents((prev) => prev.filter((_, idx) => idx !== i));
  }

  function save() {
    if (!name.trim()) return;
    const cleaned = components
      .filter((c) => c.assessmentId)
      .map((c) => ({ ...c, weightOutOf: Math.max(0, Number(c.weightOutOf) || 0) }));
    upsertScheme(activeType, name.trim(), cleaned);
    loadScheme(activeType);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Report Schemes</h1>
        <p className="mt-1 text-sm text-slate-600">
          Define how assessments contribute to each report type (teachers still enter marks out of 100).
        </p>
      </div>

      <Card>
        <CardHeader
          title="Recommended Defaults"
          subtitle="Creates O_MID, O_EOT, A_MID, A_EOT"
          right={
            <Button
              variant="secondary"
              onClick={() => {
                resetSchemesToDefaults();
                refreshAssessments();
                loadScheme(activeType);
              }}
            >
              Reset to Defaults
            </Button>
          }
        />
        <div className="p-5 pt-0 text-sm text-slate-600">
          If schemes are empty, click “Reset to Defaults” once.
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Edit Scheme"
          subtitle="Pick a report type then configure components"
          right={
            <Select value={activeType} onChange={(e) => onChangeType(e.target.value as ReportType)}>
              {REPORTS.map((r) => (
                <option key={r.type} value={r.type}>
                  {r.label}
                </option>
              ))}
            </Select>
          }
        />

        <div className="p-5 pt-0 space-y-3">
          <div className="space-y-2">
            <Label>Scheme Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. O-Level Endterm 10/10/80" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-900">Components</div>
              <Button variant="secondary" onClick={addRow}>
                + Add component
              </Button>
            </div>

            {components.length === 0 ? (
              <div className="text-sm text-slate-600">
                No components yet. Add one, or click “Reset to Defaults”.
              </div>
            ) : (
              <div className="space-y-2">
                {components.map((c, i) => (
                  <div key={i} className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 p-3 sm:grid-cols-12">
                    <div className="sm:col-span-7">
                      <Label>Assessment</Label>
                      <Select
                        value={c.assessmentId}
                        onChange={(e) => updateRow(i, { assessmentId: e.target.value })}
                      >
                        {assessments.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="sm:col-span-3">
                      <Label>Weight Out Of</Label>
                      <Input
                        type="number"
                        min={0}
                        value={c.weightOutOf}
                        onChange={(e) => updateRow(i, { weightOutOf: Number(e.target.value) })}
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-end">
                      <Button variant="danger" className="w-full" onClick={() => removeRow(i)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 text-xs text-slate-500">
              Tip: For O-Level midterm averaging of 2 CAs, use 50 + 50. For O-Level endterm, use 10 + 10 + 80.
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Badge>Report: {activeType}</Badge>
            <Button onClick={save}>Save Scheme</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
