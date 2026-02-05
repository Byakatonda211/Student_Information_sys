'use client';

import React from 'react';
import { Button, Card, Input, Label } from '@/components/ui';

type Level = 'O_LEVEL' | 'A_LEVEL';

type SubjectPaper = {
  id: string;
  subjectId: string;
  name: string;
  order: number;
};

type Subject = {
  id: string;
  name: string;
  code?: string | null;
  level: Level;
  papers?: SubjectPaper[];
};

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data as T;
}

async function apiPost<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data as T;
}

function buildAutoPapers(n: number) {
  const papers = [];
  for (let i = 1; i <= n; i++) papers.push({ name: `Paper ${i}`, order: i });
  return papers;
}

export default function SubjectsPage() {
  const [level, setLevel] = React.useState<Level>('O_LEVEL');
  const [items, setItems] = React.useState<Subject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string>('');
  const [busy, setBusy] = React.useState(false);

  const [newName, setNewName] = React.useState('');
  const [newCode, setNewCode] = React.useState('');

  // per-subject paper UI
  const [paperName, setPaperName] = React.useState<Record<string, string>>({});
  const [paperCount, setPaperCount] = React.useState<Record<string, number>>({}); // subjectId -> count

  async function refresh() {
    setErr('');
    setLoading(true);
    try {
      const data = await apiGet<Subject[]>(`/api/settings/subjects?level=${level}`);
      setItems(data);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
  }, [level]);

  async function addSubject() {
    setErr('');
    setBusy(true);
    try {
      const name = newName.trim();
      if (!name) throw new Error('Enter subject name');
      await apiPost('/api/settings/subjects', { name, code: newCode.trim() || undefined, level });
      setNewName('');
      setNewCode('');
      await refresh();
    } catch (e: any) {
      setErr(e?.message || 'Failed to add subject');
    } finally {
      setBusy(false);
    }
  }

  async function addPaper(subjectId: string) {
    setErr('');
    setBusy(true);
    try {
      const name = (paperName[subjectId] || '').trim();
      if (!name) throw new Error('Enter paper name (e.g. Paper 1)');
      await apiPost(`/api/settings/subjects/${subjectId}/papers`, { name });
      setPaperName((p) => ({ ...p, [subjectId]: '' }));
      await refresh();
    } catch (e: any) {
      setErr(e?.message || 'Failed to add paper');
    } finally {
      setBusy(false);
    }
  }

  async function autoGenerate(subjectId: string) {
    setErr('');
    setBusy(true);
    try {
      const n = Math.max(1, Math.min(6, Number(paperCount[subjectId] || 3)));
      await apiPost(`/api/settings/subjects/${subjectId}/papers`, { papers: buildAutoPapers(n) });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || 'Failed to auto-generate papers');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Subjects</h1>
          <p className="mt-1 text-sm text-slate-600">
            O-Level subjects are single rows. A-Level subjects can have papers (Paper 1/2/3) under the same subject.
          </p>
        </div>

        <div className="min-w-[220px]">
          <Label>Level</Label>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
          >
            <option value="O_LEVEL">O-Level (S1–S4)</option>
            <option value="A_LEVEL">A-Level (S5–S6)</option>
          </select>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
      ) : null}

      <Card className="p-6">
        <div className="text-sm font-semibold text-slate-900">Add Subject</div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label>Name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Mathematics" />
          </div>
          <div className="md:col-span-1">
            <Label>Code (optional)</Label>
            <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="MTC" />
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button className="w-full" onClick={addSubject} disabled={busy}>
              Add
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Tip: Switch to <span className="font-semibold">A-Level</span> to manage papers for subjects like Physics.
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Existing Subjects</div>
            <div className="text-xs text-slate-500">{level === 'A_LEVEL' ? 'Includes papers.' : 'No papers needed.'}</div>
          </div>
          <Button variant="secondary" onClick={refresh} disabled={loading || busy}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="mt-4 text-sm text-slate-500">No subjects yet.</div>
        ) : (
          <div className="mt-4 space-y-4">
            {items.map((s) => (
              <div key={s.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                    {s.code ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{s.code}</span>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {s.level === 'A_LEVEL' ? 'A-Level' : 'O-Level'}
                  </span>
                </div>

                {level === 'A_LEVEL' ? (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-slate-700">Papers</div>

                    {s.papers && s.papers.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {s.papers.map((p) => (
                          <span key={p.id} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs">
                            {p.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-slate-500">No papers yet.</div>
                    )}

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <Input
                          value={paperName[s.id] || ''}
                          onChange={(e) => setPaperName((m) => ({ ...m, [s.id]: e.target.value }))}
                          placeholder="Add paper (e.g. Paper 1)"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <Button className="w-full" variant="secondary" onClick={() => addPaper(s.id)} disabled={busy}>
                          Add Paper
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <div className="w-28">
                        <Label>Auto papers</Label>
                        <Input
                          value={String(paperCount[s.id] || 3)}
                          onChange={(e) => setPaperCount((m) => ({ ...m, [s.id]: Number(e.target.value) }))}
                          inputMode="numeric"
                        />
                      </div>
                      <Button variant="secondary" onClick={() => autoGenerate(s.id)} disabled={busy}>
                        Auto-generate
                      </Button>
                      <span className="text-xs text-slate-500">Creates Paper 1..N (up to 6).</span>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
