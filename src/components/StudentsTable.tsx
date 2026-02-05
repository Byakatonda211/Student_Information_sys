"use client";

import Link from "next/link";
import React from "react";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import type { Student } from "@/lib/store";

type SortKey = "name" | "studentNo" | "className" | "status" | "createdAt";
type SortDir = "asc" | "desc";

function safe(v: unknown) {
  return (v ?? "").toString().toLowerCase();
}

function compare(a: string, b: string) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export default function StudentsTable({
  students,
  onRefresh,
}: {
  students: Student[];
  onRefresh?: () => void;
}) {
  const [q, setQ] = React.useState("");
  const [className, setClassName] = React.useState("");
  const [stream, setStream] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [page, setPage] = React.useState<number>(1);

  const classes = React.useMemo(
    () => Array.from(new Set(students.map((s) => s.className).filter(Boolean))) as string[],
    [students]
  );
  const streams = React.useMemo(
    () => Array.from(new Set(students.map((s) => s.stream).filter(Boolean))) as string[],
    [students]
  );

  const filtered = React.useMemo(() => {
    return students.filter((s) => {
      const text = `${s.studentNo} ${s.firstName} ${s.lastName} ${s.otherName ?? ""} ${
        s.guardianPhone ?? ""
      } ${s.guardianName ?? ""}`.toLowerCase();

      if (q && !text.includes(q.toLowerCase())) return false;
      if (className && (s.className ?? "") !== className) return false;
      if (stream && (s.stream ?? "") !== stream) return false;
      if (status && s.status !== status) return false;
      return true;
    });
  }, [students, q, className, stream, status]);

  const sorted = React.useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;

    const getKey = (s: Student) => {
      switch (sortKey) {
        case "name":
          return safe(`${s.firstName} ${s.lastName}`);
        case "studentNo":
          return safe(s.studentNo);
        case "className":
          return safe(`${s.className ?? ""} ${s.stream ?? ""}`);
        case "status":
          return safe(s.status);
        case "createdAt":
        default:
          return safe(s.createdAt);
      }
    };

    return [...filtered].sort((a, b) => dir * compare(getKey(a), getKey(b)));
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paged = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  React.useEffect(() => {
    // when filters change, reset to page 1
    setPage(1);
  }, [q, className, stream, status, pageSize, sortKey, sortDir]);

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir("asc");
    }
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Input
              placeholder="Search name, ID, guardian phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <Select value={className} onChange={(e) => setClassName(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Select value={stream} onChange={(e) => setStream(e.target.value)}>
            <option value="">All Streams</option>
            {streams.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </Select>

          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Transferred">Transferred</option>
            <option value="Graduated">Graduated</option>
          </Select>

          <Select value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))}>
            <option value="5">5 / page</option>
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{paged.length}</span> of{" "}
            <span className="font-semibold text-slate-900">{total}</span> students
          </div>
          <div className="flex items-center gap-2">
            {onRefresh ? (
              <Button variant="secondary" onClick={onRefresh}>
                Refresh
              </Button>
            ) : null}
            <Badge>Local mock data</Badge>
          </div>
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {paged.length === 0 ? (
          <Card className="p-6 text-sm text-slate-600">No results.</Card>
        ) : (
          paged.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {s.firstName} {s.lastName}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{s.studentNo}</div>
                  <div className="mt-2 text-sm text-slate-700">
                    {s.className ?? "—"} {s.stream ? `• Stream ${s.stream}` : ""} • {s.status}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Guardian: {s.guardianName ?? "—"} • {s.guardianPhone ?? "—"}
                  </div>
                </div>
                <Badge>{s.term ?? "—"}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/students/${s.id}`}>
                  <Button>View</Button>
                </Link>
                <Link href={`/students/${s.id}/edit`}>
                  <Button variant="secondary">Edit</Button>
                </Link>
                <Link href={`/students/${s.id}/move`}>
                  <Button variant="secondary">Move</Button>
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-extrabold text-slate-700">
                <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort("name")}>
                  Student{sortIndicator("name")}
                </th>
                <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort("studentNo")}>
                  Student No{sortIndicator("studentNo")}
                </th>
                <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort("className")}>
                  Class/Stream{sortIndicator("className")}
                </th>
                <th className="px-4 py-3">Guardian</th>
                <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort("status")}>
                  Status{sortIndicator("status")}
                </th>
                <th className="px-4 py-3 cursor-pointer" onClick={() => toggleSort("createdAt")}>
                  Added{sortIndicator("createdAt")}
                </th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-sm">
              {paged.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-600" colSpan={7}>
                    No results.
                  </td>
                </tr>
              ) : (
                paged.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-slate-900">
                        {s.firstName} {s.lastName}
                      </div>
                      <div className="text-xs text-slate-500">{s.term ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{s.studentNo}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {s.className ?? "—"} {s.stream ? `(${s.stream})` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-semibold">{s.guardianName ?? "—"}</div>
                      <div className="text-xs text-slate-500">{s.guardianPhone ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/students/${s.id}`}>
                          <Button>View</Button>
                        </Link>
                        <Link href={`/students/${s.id}/edit`}>
                          <Button variant="secondary">Edit</Button>
                        </Link>

                        <Link href={`/students/${s.id}/move`}>
                         <Button variant="secondary">Move</Button>
                        </Link>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-2 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            Page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
            <span className="font-semibold text-slate-900">{totalPages}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setPage(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
