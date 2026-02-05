'use client';

import React from 'react';
import { Button, Card, Input, Label } from '@/components/ui';

type Level = 'O_LEVEL' | 'A_LEVEL';

type Stream = {
  id: string;
  classId: string;
  name: string;
  isActive: boolean;
};

type ClassItem = {
  id: string;
  name: string;
  level: Level;
  order: number;
  isActive: boolean;
  streams?: Stream[];
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

export default function ClassesAndStreamsPage() {
  const [items, setItems] = React.useState<ClassItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string>('');

  // New class form
  const [newClassName, setNewClassName] = React.useState(''); // e.g. S1
  const [newLevel, setNewLevel] = React.useState<Level>('O_LEVEL');
  const [newOrder, setNewOrder] = React.useState<number>(0);

  // Stream add UI
  const [streamDraft, setStreamDraft] = React.useState<Record<string, string>>({}); // classId -> streamName
  const [busy, setBusy] = React.useState(false);

  async function refresh() {
    setErr('');
    setLoading(true);
    try {
      const data = await apiGet<ClassItem[]>('/api/settings/classes');
      setItems(data);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
  }, []);

  async function addClass() {
    setErr('');
    setBusy(true);
    try {
      const name = newClassName.trim();
      if (!name) throw new Error('Enter class name (e.g. S1)');
      await apiPost('/api/settings/classes', { name, level: newLevel, order: Number(newOrder) || 0 });
      setNewClassName('');
      setNewOrder(0);
      await refresh();
    } catch (e: any) {
      setErr(e?.message || 'Failed to add class');
    } finally {
      setBusy(false);
    }
  }

  async function addStream(classId: string) {
    setErr('');
    setBusy(true);
    try {
      const name = (streamDraft[classId] || '').trim();
      if (!name) throw new Error('Enter stream name (e.g. Blue)');
      await apiPost('/api/settings/streams', { classId, name });
      setStreamDraft((s) => ({ ...s, [classId]: '' }));
      await refresh();
    } catch (e: any) {
      setErr(e?.message || 'Failed to add stream');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Classes & Streams</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create classes (S1–S6) and streams (e.g. Blue, West). S1–S4 are O-Level; S5–S6 are A-Level.
        </p>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
      ) : null}

      <Card className="p-6">
        <div className="text-sm font-semibold text-slate-900">Add Class</div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-1">
            <Label>Class</Label>
            <Input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="S1" />
          </div>
          <div className="md:col-span-1">
            <Label>Level</Label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value as Level)}
            >
              <option value="O_LEVEL">O-Level</option>
              <option value="A_LEVEL">A-Level</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <Label>Order</Label>
            <Input
              value={String(newOrder)}
              onChange={(e) => setNewOrder(Number(e.target.value))}
              placeholder="1"
              inputMode="numeric"
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button className="w-full" onClick={addClass} disabled={busy}>
              Add Class
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Existing Classes</div>
            <div className="text-xs text-slate-500">Streams are per-class.</div>
          </div>
          <Button variant="secondary" onClick={refresh} disabled={loading || busy}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="mt-4 text-sm text-slate-500">No classes yet.</div>
        ) : (
          <div className="mt-4 space-y-4">
            {items.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {c.level === 'A_LEVEL' ? 'A-Level' : 'O-Level'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">Order: {c.order}</div>
                </div>

                <div className="mt-3">
                  <div className="text-xs font-semibold text-slate-700">Streams</div>
                  {c.streams && c.streams.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.streams.map((s) => (
                        <span key={s.id} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-slate-500">No streams yet.</div>
                  )}

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <Input
                        value={streamDraft[c.id] || ''}
                        onChange={(e) => setStreamDraft((d) => ({ ...d, [c.id]: e.target.value }))}
                        placeholder="Add stream (e.g. Blue)"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <Button className="w-full" variant="secondary" onClick={() => addStream(c.id)} disabled={busy}>
                        Add Stream
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
