"use client";

import { Card, CardHeader, Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import React from "react";
import { getStudents, getTeachers } from "@/lib/store";

const quick = [
  { title: "Add New Student", desc: "Register a new student profile", href: "/students/new" },
  { title: "View Students", desc: "Search, filter by class/stream", href: "/students" },
  { title: "Enter Student Marks", desc: "Select class, term, subject and enter marks", href: "/marks" },
  { title: "Generate Report Cards", desc: "Open and print student report cards", href: "/report-cards" },

  // ✅ NEW: teachers + remarks
  { title: "Add Teacher", desc: "Create teacher account + initials for reports", href: "/settings/teachers" },
  { title: "Manage Teachers & Assignments", desc: "Assign subjects, classes, roles", href: "/settings/teachers" },
  { title: "Remarks & Head Teacher Comments", desc: "Set auto remarks by grade/range", href: "/settings/remarks" },

  { title: "Performance Analysis", desc: "Class / subject performance insights", href: "/analysis" },
];

const barData = [
  { name: "S1", students: 120 },
  { name: "S2", students: 160 },
  { name: "S3", students: 140 },
  { name: "S4", students: 90 },
];

const areaData = [
  { name: "W1", attendance: 88 },
  { name: "W2", attendance: 92 },
  { name: "W3", attendance: 85 },
  { name: "W4", attendance: 95 },
];

export default function DashboardPage() {
  const router = useRouter();

  // live counts (from store/localStorage)
  const [studentsCount, setStudentsCount] = React.useState(0);
  const [teachersCount, setTeachersCount] = React.useState(0);

  React.useEffect(() => {
    try {
      setStudentsCount(getStudents().length);
      setTeachersCount(getTeachers().length);
    } catch {
      // ignore if running during hydration edge cases
    }
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Quick actions and sample analytics (live data later).
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push("/settings/teachers")}>
            + Add Teacher
          </Button>
          <Button onClick={() => router.push("/students/new")}>+ Add Student</Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-500">Total Students</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {studentsCount.toLocaleString()}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-500">Teachers</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {teachersCount.toLocaleString()}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-500">Attendance</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">92%</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-500">Active Term</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">Term 1</div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader title="Quick Actions" subtitle="Shortcuts to common tasks" />
        <div className="grid grid-cols-1 gap-3 p-5 pt-0 sm:grid-cols-2">
          {quick.map((q) => (
            <button
              key={q.title}
              onClick={() => router.push(q.href)}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50"
            >
              <div className="text-sm font-extrabold text-slate-900">{q.title}</div>
              <div className="mt-1 text-sm text-slate-600">{q.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Students by Class (sample)" subtitle="Replace with real data later" />
          <div className="h-64 p-5 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="students" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Attendance Trend (sample)" subtitle="Weekly attendance trend" />
          <div className="h-64 p-5 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area dataKey="attendance" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
