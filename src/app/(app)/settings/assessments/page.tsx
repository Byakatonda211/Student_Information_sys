"use client";

import React from "react";
import {
  addAssessment,
  deleteAssessment,
  getAssessments,
  resetAssessmentsToDefaults,
  toggleAssessmentActive,
  updateAssessment,
  type AssessmentDef,
} from "@/lib/store";
import { Button, Card, CardHeader, Input, Label, Badge } from "@/components/ui";

export default function AssessmentsPage() {
  const [items, setItems] = React.useState<AssessmentDef[]>([]);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");

  const [editingId, setEditingId] = React.useState<string | null>(null);

  function refresh() {
    const all = getAssessments().sort((a, b) => (a.code > b.code ? 1 : -1));
    setItems(all);
  }

  React.useEffect(() => {
    refresh();
  }, []);

  function resetForm() {
    setName("");
    setCode("");
    setEditingId(null);
  }

  function submit() {
    const n = name.trim();
    const c = code.trim().toUpperCase();
    if (!n || !c) return;

    if (editingId) {
      updateAssessment(editingId, { name: n, code: c });
    } else {
      addAssessment({ name: n, code: c });
    }

    resetForm();
    refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Assessments</h1>
        <p className="mt-1 text-sm text-slate-600">
          Define the assessments teachers will enter marks for (always out of 100).
        </p>
      </div>

      <Card>
        <CardHeader
          title="Recommended Defaults"
          subtitle="CA1, CA2, MID, EOT"
          right={
            <Button
              variant="secondary"
              onClick={() => {
                resetAssessmentsToDefaults();
                refresh();
              }}
            >
              Reset to Defaults
            </Button>
          }
        />
        <div className="p-5 pt-0 text-sm text-slate-600">
          Use this once on a fresh install. It won’t break anything if you click again (it will overwrite assessment list).
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={editingId ? "Edit Assessment" : "Add Assessment"} subtitle="Name + Code" />
          <div className="p-5 pt-0 space-y-3">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Continuous Assessment 1" />
            </div>
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CA1" />
            </div>

            <div className="flex justify-end gap-2">
              {editingId ? (
                <Button variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
              <Button onClick={submit}>{editingId ? "Save" : "Add"}</Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Assessments List" subtitle="Enable/disable or delete" />
          <div className="p-5 pt-0 space-y-2">
            {items.length === 0 ? (
              <div className="text-sm text-slate-600">No assessments yet. Click “Reset to Defaults”.</div>
            ) : (
              items.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-extrabold text-slate-900">{a.name}</div>
                      <Badge>{a.code}</Badge>
                      {a.isActive ? <Badge>Active</Badge> : <Badge>Inactive</Badge>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingId(a.id);
                        setName(a.name);
                        setCode(a.code);
                      }}
                    >
                      Edit
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => {
                        toggleAssessmentActive(a.id, !a.isActive);
                        refresh();
                      }}
                    >
                      {a.isActive ? "Disable" : "Enable"}
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() => {
                        deleteAssessment(a.id);
                        refresh();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
