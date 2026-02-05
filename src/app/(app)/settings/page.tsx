import Link from "next/link";
import { Card, Button } from "@/components/ui";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure academics, classes, subjects, assessments, and reporting schemes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="text-sm font-semibold text-slate-900">Academic Setup</div>
          <p className="mt-1 text-sm text-slate-600">Academic years and terms (current year/term).</p>
          <Link href="/settings/academics">
            <Button className="mt-4">Open</Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-semibold text-slate-900">Classes & Streams</div>
          <p className="mt-1 text-sm text-slate-600">Manage classes (S1, S2…) and streams (A, B…).</p>
          <Link href="/settings/classes">
            <Button className="mt-4">Open</Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-semibold text-slate-900">Subjects</div>
          <p className="mt-1 text-sm text-slate-600">
            Configure subjects per class. A-Level supports papers under a subject.
          </p>
          <Link href="/settings/subjects">
            <Button className="mt-4">Open</Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-semibold text-slate-900">Assessments</div>
          <p className="mt-1 text-sm text-slate-600">Define CA1/CA2/MID/EOT and manage active assessments.</p>
          <Link href="/settings/assessments">
            <Button className="mt-4">Open</Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-semibold text-slate-900">Report Schemes</div>
          <p className="mt-1 text-sm text-slate-600">
            Configure O-Level and A-Level report weighting (e.g. 10/10/80, 50/50).
          </p>
          <Link href="/settings/schemes">
            <Button className="mt-4">Open</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
