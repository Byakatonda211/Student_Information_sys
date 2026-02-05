"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, Button } from "@/components/ui";
import { getStudentById } from "@/lib/store";

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const student = React.useMemo(() => getStudentById(params.id), [params.id]);

  if (!student) {
    return (
      <Card className="p-6">
        <div className="text-sm font-semibold text-slate-900">Student not found</div>
        <p className="mt-1 text-sm text-slate-600">This record may not exist in local storage.</p>
        <Button className="mt-4" onClick={() => router.push("/students")}>
          Back to Students
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={`${student.firstName} ${student.lastName}`} subtitle={`Student No: ${student.studentNo}`} />
        <div className="grid grid-cols-1 gap-3 p-5 pt-0 sm:grid-cols-2">
          <div className="text-sm text-slate-700">
            <span className="font-semibold">Class:</span> {student.className ?? "—"} {student.stream ? `(${student.stream})` : ""}
          </div>
          <div className="text-sm text-slate-700">
            <span className="font-semibold">Status:</span> {student.status}
          </div>
          <div className="text-sm text-slate-700">
            <span className="font-semibold">Guardian:</span> {student.guardianName ?? "—"}
          </div>
          <div className="text-sm text-slate-700">
            <span className="font-semibold">Phone:</span> {student.guardianPhone ?? "—"}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="text-sm font-semibold text-slate-900">Next</div>
        <p className="mt-1 text-sm text-slate-600">
          This page will later show enrollments, marks, report cards, and edit history.
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => router.push("/students")}>
          Back to Students
        </Button>
      </Card>
    </div>
  );
}
