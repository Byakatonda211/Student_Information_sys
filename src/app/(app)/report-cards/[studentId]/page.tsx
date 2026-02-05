"use client";

import React from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  getStudentById,
  getCurrentEnrollment,
  getClasses,
  getSubjectsForClass,
  getPapersForSubject,
  computeOLevelSubjectTotal,
  computeALevelPaperScore,
  gradeOLevel,

  // ✅ remarks + teachers
  getRemarkOverride,
  upsertRemarkOverride,
  pickRemark,
  seedRemarkRulesIfEmpty,
  seedTeachersIfEmpty,
  getClassTeacherAssignment,
  getSubjectTeacherAssignment,
  getTeacherById,
} from "@/lib/store";
import { Card, CardHeader, Badge, Button } from "@/components/ui";

export default function StudentReportCardPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const sp = useSearchParams();

  const yearId = sp.get("yearId")!;
  const termId = sp.get("termId")!;
  const reportType = sp.get("reportType") as any;

  const [remarksVersion, setRemarksVersion] = React.useState(0);

  React.useEffect(() => {
    seedRemarkRulesIfEmpty();
    seedTeachersIfEmpty();
  }, []);

  const student = getStudentById(studentId);
  if (!student) return <div>Student not found</div>;

  const enrollment = getCurrentEnrollment(studentId);
  const classId = enrollment?.classId ?? "";
  const streamName =
    (enrollment as any)?.streamName ??
    (enrollment as any)?.stream ??
    (enrollment as any)?.streamLabel ??
    undefined;

  const className =
    getClasses().find((c) => c.id === classId)?.name ?? student.className ?? "";

  const isALevel = className === "S5" || className === "S6";
  const subjects = getSubjectsForClass(classId);

  function gradeALevel(score: number | null) {
    if (score === null) return "X";
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    if (score >= 50) return "D";
    return "E";
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Student Report Card"
          right={<Button onClick={() => window.print()}>Print</Button>}
        />
        <div className="p-4">
          <div className="font-semibold">
            {student.firstName} {student.lastName}
          </div>
          <div className="text-xs">
            {student.studentNo} • {className}
          </div>
        </div>
      </Card>

      {!isALevel ? (
        <Card>
          <CardHeader title="O-Level Results" />
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Subject</th>
                <th className="text-right">Total</th>
                <th>Grade</th>
                <th>Teacher</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => {
                const r = computeOLevelSubjectTotal({
                  studentId,
                  academicYearId: yearId,
                  termId,
                  reportType,
                  subjectId: s.id,
                });
                const total = r.total === null ? null : Math.round(r.total);
                return (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td className="text-right">{total ?? "—"}</td>
                    <td>
                      <Badge>{gradeOLevel(total)}</Badge>
                    </td>
                    <td>
                      {(() => {
                        const a = getSubjectTeacherAssignment({
                          classId,
                          subjectId: s.id,
                          streamName,
                        });
                        const t = a ? getTeacherById(a.teacherId) : null;
                        return t ? (
                          <span className="text-xs text-slate-600">
                            {t.initials}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card>
          <CardHeader title="A-Level Results" />
          {subjects.map((s) => (
            <div key={s.id} className="p-4 border rounded-xl mb-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{s.name}</div>
                {(() => {
                  const a = getSubjectTeacherAssignment({
                    classId,
                    subjectId: s.id,
                    streamName,
                  });
                  const t = a ? getTeacherById(a.teacherId) : null;
                  return t ? <Badge>{t.initials}</Badge> : <Badge>—</Badge>;
                })()}
              </div>

              <table className="w-full text-sm mt-2">
                <thead>
                  <tr>
                    <th>Paper</th>
                    <th className="text-right">MID</th>
                    <th className="text-right">EOT</th>
                    <th className="text-right">Final</th>
                  </tr>
                </thead>
                <tbody>
                  {getPapersForSubject(s.id).map((p) => {
                    const r = computeALevelPaperScore({
                      studentId,
                      academicYearId: yearId,
                      termId,
                      reportType,
                      subjectId: s.id,
                      paperId: p.id,
                    });
                    return (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td className="text-right">{r.mid ?? "—"}</td>
                        <td className="text-right">{r.eot ?? "—"}</td>
                        <td className="text-right">{r.final ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </Card>
      )}

      {/* ✅ REMARKS (auto + override) */}
      {(() => {
        let overall: number | null = null;
        let grade: string = "X";

        if (!isALevel) {
          const totals = subjects
            .map((s) =>
              computeOLevelSubjectTotal({
                studentId,
                academicYearId: yearId,
                termId,
                reportType,
                subjectId: s.id,
              }).total
            )
            .filter((x): x is number => x !== null);

          if (totals.length) {
            overall = totals.reduce((a, b) => a + b, 0) / totals.length;
            grade = gradeOLevel(Math.round(overall));
          }
        } else {
          const finals: number[] = [];
          for (const s of subjects) {
            for (const p of getPapersForSubject(s.id)) {
              const r = computeALevelPaperScore({
                studentId,
                academicYearId: yearId,
                termId,
                reportType,
                subjectId: s.id,
                paperId: p.id,
              });
              if (typeof r.final === "number") finals.push(r.final);
            }
          }
          if (finals.length) {
            overall = finals.reduce((a, b) => a + b, 0) / finals.length;
            grade = gradeALevel(Math.round(overall));
          }
        }

        const ov = getRemarkOverride({
          studentId,
          academicYearId: yearId,
          termId,
          reportType,
        });

        const autoTeacher = pickRemark({
          target: "teacher",
          reportType,
          grade,
          score: overall,
        });
        const autoHead = pickRemark({
          target: "headTeacher",
          reportType,
          grade,
          score: overall,
        });

        const teacherRemark = (ov?.teacherRemark ?? autoTeacher) || "";
        const headComment = (ov?.headTeacherComment ?? autoHead) || "";

        const classTeacher = (() => {
          const a = getClassTeacherAssignment(classId, streamName);
          const t = a ? getTeacherById(a.teacherId) : null;
          return t ? `${t.fullName} (${t.initials})` : "—";
        })();

        return (
          <Card key={remarksVersion}>
            <CardHeader
              title="Remarks"
              subtitle={`Overall: ${
                overall === null ? "—" : Math.round(overall)
              } • Grade: ${grade} • Class Teacher: ${classTeacher}`}
              right={
                <Button
                  variant="secondary"
                  onClick={() => {
                    const nextTeacher = prompt(
                      "Teacher remark (leave blank to clear override):",
                      ov?.teacherRemark ?? ""
                    );
                    if (nextTeacher === null) return;

                    const nextHead = prompt(
                      "Head teacher comment (leave blank to clear override):",
                      ov?.headTeacherComment ?? ""
                    );
                    if (nextHead === null) return;

                    upsertRemarkOverride({
                      studentId,
                      academicYearId: yearId,
                      termId,
                      reportType,
                      teacherRemark: nextTeacher.trim() || undefined,
                      headTeacherComment: nextHead.trim() || undefined,
                    });

                    setRemarksVersion((v) => v + 1);
                  }}
                >
                  Edit (override)
                </Button>
              }
            />
            <div className="p-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-slate-500">Teacher Remark</div>
                <div className="mt-1 text-sm text-slate-900">
                  {teacherRemark || "—"}
                </div>
                {ov?.teacherRemark ? (
                  <div className="mt-1 text-[11px] text-slate-500">
                    Override applied
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] text-slate-400">Auto</div>
                )}
              </div>

              <div>
                <div className="text-xs text-slate-500">Head Teacher Comment</div>
                <div className="mt-1 text-sm text-slate-900">
                  {headComment || "—"}
                </div>
                {ov?.headTeacherComment ? (
                  <div className="mt-1 text-[11px] text-slate-500">
                    Override applied
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] text-slate-400">Auto</div>
                )}
              </div>
            </div>
          </Card>
        );
      })()}
    </div>
  );
}
