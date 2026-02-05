"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  getAcademicYears,
  getTerms,
  getClasses,
  getStudentsInClassCurrent,
  getCurrentAcademicYear,
  getCurrentTerm,
  type ReportType,
} from "@/lib/store";
import { Card, CardHeader, Button, Input, Label, Select, Badge } from "@/components/ui";

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "O_MID", label: "O-Level Midterm" },
  { value: "O_EOT", label: "O-Level Endterm" },
  { value: "A_MID", label: "A-Level Midterm" },
  { value: "A_EOT", label: "A-Level Endterm" },
];

export default function ReportCardsPage() {
  const router = useRouter();

  const years = getAcademicYears();
  const terms = getTerms();
  const classes = getClasses();

  const year = getCurrentAcademicYear() ?? years[0];
  const term = getCurrentTerm() ?? terms[0];

  const [classId, setClassId] = React.useState(classes[0]?.id ?? "");
  const [reportType, setReportType] = React.useState<ReportType>("O_EOT");
  const [query, setQuery] = React.useState("");

  const students = classId ? getStudentsInClassCurrent(classId) : [];

  const filtered = students.filter((s) =>
    `${s.firstName} ${s.lastName} ${s.studentNo}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Report Cards" subtitle="Select a student to view report" />
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>

          <Select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>
            {REPORT_TYPES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>

          <Input
            placeholder="Search student..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Students" right={<Badge>{filtered.length}</Badge>} />
        <div className="p-4 space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className="flex justify-between items-center border p-3 rounded-xl">
              <div>
                <div className="font-semibold">{s.firstName} {s.lastName}</div>
                <div className="text-xs text-slate-500">{s.studentNo}</div>
              </div>
              <Button onClick={() =>
                router.push(`/report-cards/${s.id}?yearId=${year?.id}&termId=${term?.id}&reportType=${reportType}`)
              }>
                Open
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
