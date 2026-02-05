'use client';

import React from 'react';
import { Card, CardHeader, Button, Input, Label, Select, Badge } from '@/components/ui';

type ApiTeacher = {
  id: string;
  fullName: string;
  initials: string;
  username: string;
  role: 'ADMIN' | 'CLASS_TEACHER' | 'SUBJECT_TEACHER';
  isActive: boolean;
  createdAt?: string;
};

type ApiClass = { id: string; name: string; level: 'O_LEVEL' | 'A_LEVEL'; order: number };
type ApiStream = { id: string; name: string; classId: string };
type ApiSubject = { id: string; name: string };

type Assignment = {
  id: string;
  teacherId: string;
  classId: string;
  streamId: string | null;
  subjectId: string | null;
  isClassTeacher: boolean;
  createdAt?: string;
};

type Option = { value: string; label: string };

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET ${url} failed`);
  return res.json();
}

async function apiPost<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed`);
  return res.json();
}

async function apiDelete(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${url} failed`);
}

export default function TeachersSettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string>('');

  const [teachers, setTeachers] = React.useState<ApiTeacher[]>([]);
  const [classes, setClasses] = React.useState<ApiClass[]>([]);
  const [streams, setStreams] = React.useState<ApiStream[]>([]);
  const [subjects, setSubjects] = React.useState<ApiSubject[]>([]);
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);

  // Create teacher form
  const [fullName, setFullName] = React.useState('');
  const [initials, setInitials] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<ApiTeacher['role']>('SUBJECT_TEACHER');

  // Assignment form
  const [teacherId, setTeacherId] = React.useState('');
  const [classId, setClassId] = React.useState('');
  const [streamId, setStreamId] = React.useState('');
  const [subjectId, setSubjectId] = React.useState('');
  const [isClassTeacher, setIsClassTeacher] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [t, c, s, sub, a] = await Promise.all([
        apiGet<ApiTeacher[]>('/api/teachers'),
        apiGet<ApiClass[]>('/api/settings/classes'),
        apiGet<ApiStream[]>('/api/settings/streams'),
        apiGet<ApiSubject[]>('/api/settings/subjects'),
        apiGet<Assignment[]>('/api/teachers/assignments'),
      ]);

      setTeachers(t);
      setClasses(c);
      setStreams(s);
      setSubjects(sub);
      setAssignments(a);

      // default selection
      if (!teacherId && t.length) setTeacherId(t[0].id);
      if (!classId && c.length) setClassId(c.sort((a, b) => a.order - b.order)[0].id);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [teacherId, classId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const streamOptions: Option[] = React.useMemo(() => {
    if (!classId) return [];
    return streams
      .filter((st) => st.classId === classId)
      .map((st) => ({ value: st.id, label: st.name }));
  }, [streams, classId]);

  const subjectOptions: Option[] = React.useMemo(() => {
    return subjects.map((s) => ({ value: s.id, label: s.name }));
  }, [subjects]);

  async function createTeacher() {
    setErr('');
    try {
      await apiPost('/api/teachers', { fullName, initials, username, password, role });
      setFullName('');
      setInitials('');
      setUsername('');
      setPassword('');
      setRole('SUBJECT_TEACHER');
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to create teacher');
    }
  }

  async function createAssignment() {
    setErr('');
    try {
      await apiPost('/api/teachers/assignments', {
        teacherId,
        classId,
        streamId: streamId || null,
        subjectId: isClassTeacher ? null : subjectId || null,
        isClassTeacher,
      });
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to assign');
    }
  }

  async function deleteAssignment(id: string) {
    setErr('');
    try {
      await apiDelete(`/api/teachers/assignments/${id}`);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to delete assignment');
    }
  }

  async function toggleTeacherActive(id: string, isActive: boolean) {
    setErr('');
    try {
      await apiPost(`/api/teachers/${id}`, { isActive: !isActive });
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to update teacher');
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Teachers</h1>
          <p className="text-sm text-slate-600">Manage teacher accounts and assign them to classes/streams and subjects.</p>
        </div>
        <Badge>{teachers.length} teachers</Badge>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
      ) : null}

      <Card>
        <CardHeader title="Create Teacher" />
        <div className="p-5 pt-0 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jane Doe" />
          </div>
          <div className="space-y-2">
            <Label>Initials</Label>
            <Input value={initials} onChange={(e) => setInitials(e.target.value)} placeholder="e.g. JD" />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. jdoe" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="SUBJECT_TEACHER">Subject Teacher</option>
              <option value="CLASS_TEACHER">Class Teacher</option>
              <option value="ADMIN">Administrator</option>
            </Select>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <Button onClick={createTeacher} disabled={!fullName || !username || !password || loading}>
              Create
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Assign Teacher" right={<Badge>{assignments.length}</Badge>} />
        <div className="p-5 pt-0 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Teacher</Label>
            <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName} ({t.initials})
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Class</Label>
            <Select
              value={classId}
              onChange={(e) => {
                const v = e.target.value;
                setClassId(v);
                setStreamId('');
                setSubjectId('');
              }}
            >
              {classes
                .sort((a, b) => a.order - b.order)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.level === 'A_LEVEL' ? 'A-Level' : 'O-Level'})
                  </option>
                ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Stream (optional)</Label>
            <Select value={streamId} onChange={(e) => setStreamId(e.target.value)}>
              <option value="">All streams</option>
              {streamOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject {isClassTeacher ? '(not required)' : ''}</Label>
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={isClassTeacher}>
              <option value="">{isClassTeacher ? '—' : 'Select subject'}</option>
              {subjectOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="isClassTeacher"
              type="checkbox"
              className="h-4 w-4"
              checked={isClassTeacher}
              onChange={(e) => setIsClassTeacher(e.target.checked)}
            />
            <Label htmlFor="isClassTeacher">This teacher is a class teacher (subject not required)</Label>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <Button onClick={createAssignment} disabled={!teacherId || !classId || (!isClassTeacher && !subjectId) || loading}>
              Assign
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Teacher Accounts" />
        <div className="p-5 pt-0 overflow-x-auto">
          {loading ? (
            <div className="text-sm text-slate-600">Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-2">Name</th>
                  <th className="py-2">Username</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Status</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="py-2">{t.fullName}</td>
                    <td className="py-2">{t.username}</td>
                    <td className="py-2">{t.role}</td>
                    <td className="py-2">{t.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="py-2 text-right">
                      <Button variant="ghost" onClick={() => toggleTeacherActive(t.id, t.isActive)}>
                        {t.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Assignments" />
        <div className="p-5 pt-0 overflow-x-auto">
          {loading ? (
            <div className="text-sm text-slate-600">Loading…</div>
          ) : assignments.length === 0 ? (
            <div className="text-sm text-slate-600">No assignments yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-2">Teacher</th>
                  <th className="py-2">Class</th>
                  <th className="py-2">Stream</th>
                  <th className="py-2">Subject</th>
                  <th className="py-2">Type</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="py-2">{teachers.find((t) => t.id === a.teacherId)?.fullName ?? a.teacherId}</td>
                    <td className="py-2">{classes.find((c) => c.id === a.classId)?.name ?? a.classId}</td>
                    <td className="py-2">{a.streamId ? streams.find((s) => s.id === a.streamId)?.name ?? a.streamId : '—'}</td>
                    <td className="py-2">
                      {a.isClassTeacher ? '—' : a.subjectId ? subjects.find((s) => s.id === a.subjectId)?.name ?? a.subjectId : '—'}
                    </td>
                    <td className="py-2">{a.isClassTeacher ? 'Class Teacher' : 'Subject Teacher'}</td>
                    <td className="py-2 text-right">
                      <Button variant="ghost" onClick={() => deleteAssignment(a.id)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
