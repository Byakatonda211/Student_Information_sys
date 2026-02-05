"use client";

import React from "react";
import {
  getClasses,
  getTerms,
  getAcademicYears,
  getAssessments,
  getStudentsInClassCurrent,
  getSubjectsForClass,
  getPapersForSubject,
  upsertMark,
  getMarks,
  type ClassDef,
  type Term,
  type AcademicYear,
  type AssessmentDef,
  type Subject,
  type SubjectPaper,
  type Student,
} from "@/lib/store";
import { Card, CardHeader, Select, Input, Label, Badge, Button } from "@/components/ui";

function normalizeClassName(name: string) {
  return name.replace(/\s+/g, "").replace(/\./g, "").toUpperCase(); // "S.5" -> "S5"
}
function isALevelClass(name: string) {
  const n = normalizeClassName(name);
  return n === "S5" || n === "S6";
}

function keyFor(studentId: string, subjectId: string, paperId?: string) {
  return `${studentId}|${subjectId}|${paperId ?? ""}`;
}

export default function MarksPage() {
  const [classes, setClasses] = React.useState<ClassDef[]>([]);
  const [years, setYears] = React.useState<AcademicYear[]>([]);
  const [terms, setTerms] = React.useState<Term[]>([]);
  const [assessments, setAssessments] = React.useState<AssessmentDef[]>([]);

  const [classId, setClassId] = React.useState<string>("");
  const [termId, setTermId] = React.useState<string>("");
  const [assessmentId, setAssessmentId] = React.useState<string>("");

  const [students, setStudents] = React.useState<Student[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [papersBySubject, setPapersBySubject] = React.useState<Record<string, SubjectPaper[]>>({});

  // New: subject-first entry + student search
  const [subjectId, setSubjectId] = React.useState<string>("");
  const [paperId, setPaperId] = React.useState<string>("");
  const [studentQuery, setStudentQuery] = React.useState<string>("");

  // New: inline validation + drafts
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [marksVersion, setMarksVersion] = React.useState(0);

  const currentYear = React.useMemo(
    () => years.find((y) => y.isCurrent) ?? years[0] ?? null,
    [years]
  );

  const selectedClass = React.useMemo(
    () => classes.find((c) => c.id === classId) ?? null,
    [classes, classId]
  );

  const aLevel = selectedClass ? isALevelClass(selectedClass.name) : false;

  React.useEffect(() => {
    const cls = getClasses().sort((a, b) => a.sortOrder - b.sortOrder);
    const yrs = getAcademicYears();
    const t = getTerms();
    const as = getAssessments().filter((x) => x.isActive);

    setClasses(cls);
    setYears(yrs);
    setTerms(t);
    setAssessments(as);

    setClassId(cls[0]?.id ?? "");
    const ct = t.find((x) => x.isCurrent) ?? t[0];
    setTermId(ct?.id ?? "");
    setAssessmentId(as[0]?.id ?? "");
  }, []);

  React.useEffect(() => {
    if (!classId) return;

    setStudents(getStudentsInClassCurrent(classId));

    const subs = getSubjectsForClass(classId);
    setSubjects(subs);

    const map: Record<string, SubjectPaper[]> = {};
    subs.forEach((s) => {
      map[s.id] = getPapersForSubject(s.id);
    });
    setPapersBySubject(map);

    // set sensible defaults for subject/paper
    const firstSub = subs[0]?.id ?? "";
    setSubjectId(firstSub);

    const firstPaper = firstSub ? (map[firstSub]?.[0]?.id ?? "") : "";
    setPaperId(firstPaper);

    // clear drafts/errors on class change
    setDrafts({});
    setErrors({});
    setStudentQuery("");
  }, [classId]);

  // If user changes subject, pick first paper for that subject (A-Level)
  React.useEffect(() => {
    if (!aLevel) return;
    const first = subjectId ? (papersBySubject[subjectId]?.[0]?.id ?? "") : "";
    setPaperId(first);
    // clear drafts/errors for clarity
    setDrafts({});
    setErrors({});
  }, [aLevel, subjectId, papersBySubject]);

  const marks = React.useMemo(() => getMarks(), [marksVersion, classId, termId, assessmentId]);

  function getExistingScore(args: { studentId: string; subjectId: string; paperId?: string }) {
    if (!currentYear) return "";
    const found = marks.find(
      (m) =>
        m.studentId === args.studentId &&
        m.academicYearId === currentYear.id &&
        m.termId === termId &&
        m.assessmentId === assessmentId &&
        m.subjectId === args.subjectId &&
        (m.paperId ?? "") === (args.paperId ?? "")
    );
    return found ? String(found.score100) : "";
  }

  function validateScore(value: string) {
    const v = value.trim();
    if (v === "") return { ok: true as const, normalized: "" }; // allow empty (not entered)
    const n = Number(v);
    if (!Number.isFinite(n)) return { ok: false as const, message: "Enter a number" };
    if (n < 0 || n > 100) return { ok: false as const, message: "0–100 only" };
    return { ok: true as const, normalized: String(n) };
  }

  function onChangeScore(args: { studentId: string; subjectId: string; paperId?: string; value: string }) {
    const k = keyFor(args.studentId, args.subjectId, args.paperId);
    setDrafts((prev) => ({ ...prev, [k]: args.value }));

    const v = validateScore(args.value);
    setErrors((prev) => {
      const next = { ...prev };
      if (v.ok) delete next[k];
      else next[k] = v.message;
      return next;
    });
  }

  function onBlurScore(args: { studentId: string; subjectId: string; paperId?: string }) {
    if (!currentYear || !termId || !assessmentId) return;
    const k = keyFor(args.studentId, args.subjectId, args.paperId);

    const raw = drafts[k] ?? getExistingScore(args);
    const v = validateScore(raw);

    // If invalid, do not save
    if (!v.ok) return;

    // Empty => do not save (keep as not-entered)
    if (v.normalized === "") return;

    upsertMark({
      studentId: args.studentId,
      academicYearId: currentYear.id,
      termId,
      assessmentId,
      subjectId: args.subjectId,
      paperId: args.paperId,
      score100: Number(v.normalized),
    });

    // refresh local view (no reload needed)
    setMarksVersion((x) => x + 1);
  }

  const selectedSubject = React.useMemo(
    () => subjects.find((s) => s.id === subjectId) ?? null,
    [subjects, subjectId]
  );

  const selectedPaper = React.useMemo(() => {
    if (!aLevel) return null;
    const list = subjectId ? papersBySubject[subjectId] ?? [] : [];
    return list.find((p) => p.id === paperId) ?? null;
  }, [aLevel, subjectId, papersBySubject, paperId]);

  const filteredStudents = React.useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students;

    return students.filter((s) => {
      const full = `${s.firstName} ${s.lastName} ${s.otherName ?? ""}`.toLowerCase();
      const no = (s.studentNo ?? "").toLowerCase();
      return full.includes(q) || no.includes(q);
    });
  }, [students, studentQuery]);

  const canEnter = Boolean(subjectId) && (!aLevel || Boolean(paperId));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Enter Marks</h1>
        <p className="mt-1 text-sm text-slate-600">
          Teachers enter marks out of <span className="font-semibold">100</span>. Invalid values are rejected.
        </p>
      </div>

      <Card>
        <CardHeader title="Selection" subtitle="Choose class, term, assessment, and subject" />
        <div className="p-5 pt-0 grid grid-cols-1 gap-3 lg:grid-cols-6">
          <div className="space-y-2 lg:col-span-2">
            <Label>Class</Label>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label>Term</Label>
            <Select value={termId} onChange={(e) => setTermId(e.target.value)}>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label>Assessment</Label>
            <Select value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)}>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2 lg:col-span-3">
            <Label>Subject</Label>
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          {aLevel ? (
            <div className="space-y-2 lg:col-span-3">
              <Label>Paper</Label>
              <Select value={paperId} onChange={(e) => setPaperId(e.target.value)}>
                {(papersBySubject[subjectId] ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              {(papersBySubject[subjectId] ?? []).length === 0 ? (
                <div className="text-xs text-amber-700">
                  No papers set for this subject. Go to Settings → Subjects → Manage Papers.
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2 lg:col-span-6">
            <Label>Search student</Label>
            <Input
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              placeholder="Search by name or student number..."
            />
            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>
                Level: <span className="font-semibold">{aLevel ? "A-Level (S5/S6)" : "O-Level (other classes)"}</span>
              </span>
              <span>
                Entering:{" "}
                <span className="font-semibold">
                  {selectedSubject ? selectedSubject.name : "—"}
                  {aLevel ? ` → ${selectedPaper ? selectedPaper.name : "—"}` : ""}
                </span>
              </span>
            </div>
          </div>

          {!canEnter ? (
            <div className="lg:col-span-6 text-sm text-amber-700">
              Select a {aLevel ? "subject and paper" : "subject"} to begin.
            </div>
          ) : null}
        </div>
      </Card>

      {/* Mobile-first: student cards */}
      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {filteredStudents.length === 0 ? (
          <Card className="p-6">
            <div className="text-sm font-semibold text-slate-900">No students</div>
            <p className="mt-1 text-sm text-slate-600">No matching students found for your search.</p>
          </Card>
        ) : (
          filteredStudents.map((st) => {
            const k = keyFor(st.id, subjectId, aLevel ? paperId : undefined);
            const existing = getExistingScore({ studentId: st.id, subjectId, paperId: aLevel ? paperId : undefined });
            const value = drafts[k] ?? existing;
            const err = errors[k];

            return (
              <Card key={st.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {st.firstName} {st.lastName}
                    </div>
                    <div className="text-xs text-slate-500">{st.studentNo}</div>
                  </div>
                  <Badge>{st.status}</Badge>
                </div>

                <div className="space-y-1">
                  <Label>
                    Mark (/100) — {selectedSubject?.name}
                    {aLevel ? ` (${selectedPaper?.name ?? "Paper"})` : ""}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={value}
                    onChange={(e) =>
                      onChangeScore({
                        studentId: st.id,
                        subjectId,
                        paperId: aLevel ? paperId : undefined,
                        value: e.target.value,
                      })
                    }
                    onBlur={() =>
                      onBlurScore({
                        studentId: st.id,
                        subjectId,
                        paperId: aLevel ? paperId : undefined,
                      })
                    }
                    placeholder="0 - 100"
                    className={err ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}
                  />
                  {err ? <div className="text-xs text-red-600">{err}</div> : null}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <Card>
          <CardHeader
            title="Marks Table"
            subtitle="Subject-first entry (fast for large classes)"
            right={
              <Button
                variant="secondary"
                onClick={() => {
                  setDrafts({});
                  setErrors({});
                  setMarksVersion((x) => x + 1);
                }}
              >
                Refresh
              </Button>
            }
          />
          <div className="p-5 pt-0 overflow-auto">
            {filteredStudents.length === 0 ? (
              <div className="text-sm text-slate-600">No matching students found.</div>
            ) : !canEnter ? (
              <div className="text-sm text-slate-600">Select a subject (and paper for A-Level) to start.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr>
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4 whitespace-nowrap">
                      Mark (/100) — {selectedSubject?.name}
                      {aLevel ? ` (${selectedPaper?.name ?? "Paper"})` : ""}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((st) => {
                    const k = keyFor(st.id, subjectId, aLevel ? paperId : undefined);
                    const existing = getExistingScore({
                      studentId: st.id,
                      subjectId,
                      paperId: aLevel ? paperId : undefined,
                    });
                    const value = drafts[k] ?? existing;
                    const err = errors[k];

                    return (
                      <tr key={st.id} className="border-t border-slate-200">
                        <td className="py-2 pr-4">
                          <div className="font-semibold text-slate-900">
                            {st.firstName} {st.lastName}
                          </div>
                          <div className="text-xs text-slate-500">{st.studentNo}</div>
                        </td>

                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-3">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={value}
                              onChange={(e) =>
                                onChangeScore({
                                  studentId: st.id,
                                  subjectId,
                                  paperId: aLevel ? paperId : undefined,
                                  value: e.target.value,
                                })
                              }
                              onBlur={() =>
                                onBlurScore({
                                  studentId: st.id,
                                  subjectId,
                                  paperId: aLevel ? paperId : undefined,
                                })
                              }
                              className={`w-28 ${err ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
                              placeholder="0-100"
                            />
                            {err ? <span className="text-xs text-red-600">{err}</span> : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-5 pt-0 text-xs text-slate-500">
            Marks are saved automatically when a value is valid and you leave the input. Invalid values are not saved.
          </div>
        </Card>
      </div>
    </div>
  );
}
