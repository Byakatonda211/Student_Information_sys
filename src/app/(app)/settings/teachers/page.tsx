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

type ApiClass = { id: string; name: string; level: 'O_LEVEL' | 'A_LEVEL'; order: number; streams?: ApiStream[] };
type ApiStream = { id: string; classId: string; name: string };
type ApiSubject = { id: string; name: string; level: 'O_LEVEL' | 'A_LEVEL'; code?: string | null };

type ApiAssignment = {
  id: string;
  userId: string;
  classId: string;
  streamId?: string | null;
  subjectId?: string | null;
  isClassTeacher: boolean;
  class: { id: string; name: string; level: 'O_LEVEL' | 'A_LEVEL' };
  stream?: { id: string; name: string } | null;
  subject?: { id: string; name: string } | null;
  user: { id: string; fullName: string; initials: string };
};

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data as T;
}
async function apiSend<T>(url: string, method: string, body?: any): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data as T;
}

export default function TeachersSettingsPage() {
  const [teachers, setTeachers] = React.useState<ApiTeacher[]>([]);
  const [assignments, setAssignments] = React.useState<ApiAssignment[]>([]);
  const [classes, setClasses] = React.useState<ApiClass[]>([]);
  const [subjects, setSubjects] = React.useState<ApiSubject[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  // Add teacher form
  const [fullName, setFullName] = React.useState('');
  const [initials, setInitials] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<ApiTeacher['role']>('SUBJECT_TEACHER');

  // Assignment form
  const [teacherId, setTeacherId] = React.useState('');
  const [classId, setClassId] = React.useState('');
  const [streamId, setStreamId] = React.useState<string>('');
  const [subjectId, setSubjectId] = React.useState<string>('');
  const [isClassTeacher, setIsClassTeacher] = React.useState(false);

  const selectedClass = classes.find((c) => c.id === classId);
  const streamOptions = (selectedClass?.streams || []).map((s) => ({ value: s.id, label: s.name }));
  const subjectOptions = subjects
    .filter((s) => (selectedClass ? s.level === selectedClass.level : true))
    .map((s) => ({ value: s.id, label: s.code ? `${s.name} (${s.code})` : s.name }));

  async function refreshAll() {
    setErr('');
    setLoading(true);
    try {
      const [t, a, c, s] = await Promise.all([
        apiGet<ApiTeacher[]>('/api/teachers'),
        apiGet<ApiAssignment[]>('/api/teachers/assignments'),
        apiGet<ApiClass[]>('/api/settings/classes'),
        apiGet<ApiSubject[]>('/api/settings/subjects'),
      ]);

      setTeachers(t);
      setAssignments(a);

      // classes endpoint includes streams already (per earlier API)
      setClasses(c);
      setSubjects(s);

      setTeacherId((prev) => prev || t[0]?.id || '');
      setClassId((prev) => prev || c[0]?.id || '');
    } catch (e: any) {
      setErr(e?.message || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refreshAll();
  }, []);

  async function onAddTeacher() {
    setErr('');
    setBusy(true);
    try {
      if (!fullName.trim() || !initials.trim() || !username.trim() || !password.trim()) {
        throw new Error('Full name, initials, username, and password are required.');
      }
      await apiSend('/api/teachers', 'POST', {
        fullName: fullName.trim(),
        initials: initials.trim().toUpperCase(),
        username: username.trim(),
        password: password.trim(),
        role,
      });

      setFullName('');
      setInitials('');
      setUsername('');
      setPassword('');
      setRole('SUBJECT_TEACHER');
      await refreshAll();
    } catch (e: any) {
      setErr(e?.message || 'Failed to add teacher');
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteTeacher(id: string) {
    if (!confirm('Delete this teacher? This also removes their assignments.')) return;
    setErr('');
    setBusy(true);
    try {
      await apiSend(`/api/teachers/${id}`, 'DELETE');
      await refreshAll();
    } catch (e: any) {
      setErr(e?.message || 'Failed to delete teacher');
    } finally {
      setBusy(false);
    }
  }

  async function onAddAssignment() {
    setErr('');
    setBusy(true);
    try {
      if (!teacherId) throw new Error('Select a teacher');
      if (!classId) throw new Error('Select a class');

      // If class teacher, subject is not required.
      if (!isClassTeacher && !subjectId) throw new Error('Select a subject (or tick Class Teacher)');

      await apiSend('/api/teachers/assignments', 'POST', {
        userId: teacherId,
        classId,
        streamId: streamId || null,
        subjectId: isClassTeacher ? null : subjectId,
        isClassTeacher,
      });

      setStreamId('');
      setSubjectId('');
      setIsClassTeacher(false);
      await refreshAll();
    } catch (e: any) {
      setErr(e?.message || 'Failed to add assignment');
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteAssignment(id: string) {
    setErr('');
    setBusy(true);
    try {
      await apiSend(`/api/teachers/assignments/${id}`, 'DELETE');
      await refreshAll();
    } catch (e: any) {
      setErr(e?.message || 'Failed to remove assignment');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Teachers"
          subtitle="Admin-created accounts only. Set initials and role, then assign classes/subjects."
          right={<Badge>{teachers.length}</Badge>}
        />
        <div className="p-5 pt-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g., John Ssenyonga" />
          </div>
          <div className="space-y-2">
            <Label>Initials</Label>
            <Input value={initials} onChange={(e) => setInitials(e.target.value)} placeholder="e.g., JS" />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g., jssenyonga" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="set by admin" />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              onChange={(v) => setRole(v as any)}
              options={[
                { value: 'SUBJECT_TEACHER', label: 'Subject Teacher' },
                { value: 'CLASS_TEACHER', label: 'Class Teacher' },
                { value: 'ADMIN', label: 'Administrator' },
              ]}
            />
          </div>

          {err ? (
            <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
          ) : null}

          <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button onClick={onAddTeacher} disabled={busy}>
              Add Teacher
            </Button>
            <Button variant="secondary" onClick={refreshAll} disabled={busy || loading}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Teacher List" subtitle="Manage teacher accounts (delete removes assignments)" />
        <div className="p-5 pt-0 space-y-2">
          {loading ? (
            <div className="text-sm text-slate-600">Loading…</div>
          ) : teachers.length === 0 ? (
            <div className="text-sm text-slate-600">No teachers yet.</div>
          ) : (
            teachers.map((t) => (
              <div key={t.id} className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{t.fullName}</div>
                  <div className="text-xs text-slate-600">
                    {t.initials} • {t.username} • {t.role}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="danger" onClick={() => onDeleteTeacher(t.id)} disabled={busy}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Teaching Assignments" subtitle="Assign teachers to classes/streams and subjects." right={<Badge>{assignments.length}</Badge>} />
        <div className="p-5 pt-0 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Teacher</Label>
            <Select
              value={teacherId}
              onChange={(v) => setTeacherId(v)}
              options={teachers.map((t) => ({ value: t.id, label: `${t.fullName} (${t.initials})` }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Class</Label>
            <Select
              value={classId}
              onChange={(v) => {
                setClassId(v);
                setStreamId('');
                setSubjectId('');
              }}
              options={classes.sort((a, b) => a.order - b.order).map((c) => ({ value: c.id, label: `${c.name} (${c.level === 'A_LEVEL' ? 'A-Level' : 'O-Level'})` }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Stream (optional)</Label>
            <Select value={streamId} onChange={(v) => setStreamId(v)} options={[{ value: '', label: 'All streams' }, ...streamOptions]} />
          </div>

          <div className="space-y-2">
            <Label>Subject {isClassTeacher ? '(not required)' : ''}</Label>
            <Select
              value={subjectId}
              onChange={(v) => setSubjectId(v)}
              options={[{ value: '', label: isClassTeacher ? '—' : 'Select subject' }, ...subjectOptions]}
              disabled={isClassTeacher}
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="isClassTeacher"
              type="checkbox"
              className="h-4 w-4"
              checked={isClassTeacher}
              onChange={(e) => setIsClassTeacher(e.target.checked)}
            />
            <Label htmlFor="isClassTeacher">This assignment is for Class Teacher (no subject)</Label>
          </div>

          <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button onClick={onAddAssignment} disabled={busy || loading}>
              Add Assignment
            </Button>
          </div>

          <div className="md:col-span-2 mt-2 space-y-2">
            {assignments.length === 0 ? (
              <div className="text-sm text-slate-600">No assignments yet.</div>
            ) : (
              assignments.map((a) => (
                <div key={a.id} className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3">
                  <div className="text-sm text-slate-800">
                    <span className="font-semibold">{a.user.fullName}</span> →{' '}
                    <span className="font-semibold">{a.class.name}</span>
                    {a.stream ? <span> / {a.stream.name}</span> : <span> (All streams)</span>}
                    {' • '}
                    {a.isClassTeacher ? <span className="font-semibold">Class Teacher</span> : <span className="font-semibold">{a.subject?.name}</span>}
                  </div>
                  <Button variant="danger" onClick={() => onDeleteAssignment(a.id)} disabled={busy}>
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
