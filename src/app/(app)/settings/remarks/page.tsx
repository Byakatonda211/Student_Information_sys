"use client";

import React from "react";
import {
  getRemarkRules,
  saveRemarkRules,
  addRemarkRule,
  updateRemarkRule,
  deleteRemarkRule,
  seedRemarkRulesIfEmpty,
  type RemarkTarget,
  type RemarkMatchType,
  type ReportType,
} from "@/lib/store";
import { Card, CardHeader, Button, Input, Label, Select, Badge } from "@/components/ui";

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "O_MID", label: "O-Level Midterm" },
  { value: "O_EOT", label: "O-Level Endterm" },
  { value: "A_MID", label: "A-Level Midterm" },
  { value: "A_EOT", label: "A-Level Endterm" },
];

export default function RemarksSettingsPage() {
  const [version, setVersion] = React.useState(0);

  React.useEffect(() => {
    seedRemarkRulesIfEmpty();
    setVersion((v) => v + 1);
  }, []);

  const rules = React.useMemo(() => getRemarkRules(), [version]);

  const [reportType, setReportType] = React.useState<ReportType>("O_EOT");
  const [target, setTarget] = React.useState<RemarkTarget>("teacher");
  const [matchType, setMatchType] = React.useState<RemarkMatchType>("grade");

  const [grade, setGrade] = React.useState("A");
  const [min, setMin] = React.useState("0");
  const [max, setMax] = React.useState("100");
  const [text, setText] = React.useState("");

  const filtered = React.useMemo(
    () => rules.filter((r) => r.reportType === reportType && r.target === target),
    [rules, reportType, target]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Remarks & Comments"
          subtitle="Auto-generate remarks by grade or marks range. Report cards use these unless overridden."
          right={<Badge>{filtered.length}</Badge>}
        />
        <div className="p-5 pt-0 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>
              {REPORT_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Target</Label>
            <Select value={target} onChange={(e) => setTarget(e.target.value as RemarkTarget)}>
              <option value="teacher">Teacher Remark</option>
              <option value="headTeacher">Head Teacher Comment</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Match Type</Label>
            <Select value={matchType} onChange={(e) => setMatchType(e.target.value as RemarkMatchType)}>
              <option value="grade">By Grade</option>
              <option value="range">By Marks Range</option>
            </Select>
          </div>
        </div>

        <div className="p-5 pt-0 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {matchType === "grade" ? (
            <div className="space-y-2">
              <Label>Grade</Label>
              <Input value={grade} onChange={(e) => setGrade(e.target.value.toUpperCase())} placeholder="A, B, C..." />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Min</Label>
                <Input value={min} onChange={(e) => setMin(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max</Label>
                <Input value={max} onChange={(e) => setMax(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <div className="text-xs text-slate-500">Inclusive range, e.g. 0–39, 40–49…</div>
              </div>
            </>
          )}

          <div className="sm:col-span-3 space-y-2">
            <Label>Remark Text</Label>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type remark..." />
          </div>

          <div className="sm:col-span-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                if (!confirm("Reset rules to defaults? This overwrites current rules.")) return;
                saveRemarkRules([]);
                seedRemarkRulesIfEmpty();
                setVersion((v) => v + 1);
              }}
            >
              Reset to defaults
            </Button>
            <Button
              onClick={() => {
                if (!text.trim()) return;
                if (matchType === "grade") {
                  addRemarkRule({ reportType, target, matchType, grade: grade.trim(), text });
                } else {
                  const mn = Number(min), mx = Number(max);
                  if (!Number.isFinite(mn) || !Number.isFinite(mx)) return;
                  addRemarkRule({ reportType, target, matchType, min: mn, max: mx, text });
                }
                setText("");
                setVersion((v) => v + 1);
              }}
            >
              Add Rule
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Rules" subtitle="Used automatically on report cards (unless overridden per student)" />
        <div className="p-5 pt-0 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-sm text-slate-600">No rules yet for this selection.</div>
          ) : (
            filtered.map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {r.matchType === "grade" ? `Grade ${r.grade}` : `Range ${r.min}–${r.max}`}
                    <span className="ml-2 text-xs text-slate-500">({r.isActive ? "active" : "inactive"})</span>
                  </div>
                  <div className="text-xs text-slate-600">{r.text}</div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const next = prompt("Edit text:", r.text);
                      if (next === null) return;
                      updateRemarkRule(r.id, { text: next });
                      setVersion((v) => v + 1);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      updateRemarkRule(r.id, { isActive: !r.isActive });
                      setVersion((v) => v + 1);
                    }}
                  >
                    {r.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!confirm("Delete this rule?")) return;
                      deleteRemarkRule(r.id);
                      setVersion((v) => v + 1);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
