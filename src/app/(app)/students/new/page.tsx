'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Card, CardHeader, Input, Label } from '@/components/ui';

type ApiClass = { id: string; name: string; level: 'O_LEVEL' | 'A_LEVEL'; order: number; streams?: ApiStream[] };
type ApiStream = { id: string; classId: string; name: string };
type ApiYear = { id: string; name: string; isCurrent: boolean };
type ApiTerm = { id: string; name: string; isCurrent: boolean; academicYearId: string };

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `Request failed (${res.status})`);
  return data as T;
}

async function apiPost<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `Request failed (${res.status})`);
  return data as T;
}

const schema = z.object({
  admissionNo: z.string().min(3, 'Student number is required'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  otherNames: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  dateOfBirth: z.string().optional(),

  classId: z.string().min(1, 'Class is required'),
  streamId: z.string().optional(),
  academicYearId: z.string().min(1, 'Academic year is required'),
  // term is not stored on enrollment, but helpful for context in UI
  termId: z.string().optional(),

  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  address: z.string().optional(),

  // PLE particulars (optional)
  pleSittingYear: z.string().optional(),
  plePrimarySchool: z.string().optional(),
  pleIndexNumber: z.string().optional(),
  pleAggregates: z.string().optional(),
  pleDivision: z.string().optional(),

  // Residence & emergency (optional)
  village: z.string().optional(),
  parish: z.string().optional(),
  districtOfResidence: z.string().optional(),
  homeDistrict: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),

  // Health details (optional)
  medicalConditions: z.string().optional(),
  recurrentMedication: z.string().optional(),
  knownDisability: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewStudentPage() {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      gender: 'MALE',
      admissionNo: '',
      classId: '',
      streamId: '',
      academicYearId: '',
      termId: '',
    },
  });

  const { register, handleSubmit, formState, watch, setValue } = form;

  const [classes, setClasses] = React.useState<ApiClass[]>([]);
  const [streams, setStreams] = React.useState<ApiStream[]>([]);
  const [years, setYears] = React.useState<ApiYear[]>([]);
  const [terms, setTerms] = React.useState<ApiTerm[]>([]);

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  const classId = watch('classId');
  const academicYearId = watch('academicYearId');

  React.useEffect(() => {
    (async () => {
      try {
        const [c, s, y, t] = await Promise.all([
          apiGet<ApiClass[]>('/api/settings/classes'),
          apiGet<ApiStream[]>('/api/settings/streams'),
          apiGet<ApiYear[]>('/api/settings/academic-years'),
          apiGet<ApiTerm[]>('/api/settings/terms'),
        ]);

        setClasses((c || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
        setStreams(s || []);
        setYears(y || []);
        setTerms(t || []);

        const currentYear = (y || []).find((yy) => yy.isCurrent) ?? (y || [])[0];
        if (currentYear) setValue('academicYearId', currentYear.id);

        // default class if exists
        const firstClass = (c || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
        if (firstClass) setValue('classId', firstClass.id);
      } catch (e: any) {
        setErr(e?.message || 'Failed to load academic setup');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const streamsForClass = React.useMemo(() => streams.filter((s) => s.classId === classId), [streams, classId]);
  const termsForYear = React.useMemo(() => terms.filter((t) => t.academicYearId === academicYearId), [terms, academicYearId]);

  React.useEffect(() => {
    // reset stream if not in selected class
    const currentStreamId = watch('streamId');
    if (currentStreamId && !streamsForClass.some((s) => s.id === currentStreamId)) {
      setValue('streamId', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, streamsForClass.length]);

  React.useEffect(() => {
    // pick current term (optional)
    const current = termsForYear.find((tt) => tt.isCurrent) ?? termsForYear[0];
    if (current) setValue('termId', current.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYearId, termsForYear.length]);

  async function onSubmit(values: FormValues) {
    setErr('');
    setBusy(true);
    try {
      await apiPost('/api/students', {
        admissionNo: values.admissionNo,
        firstName: values.firstName,
        lastName: values.lastName,
        otherNames: values.otherNames || null,
        gender: values.gender || null,
        dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth).toISOString() : null,
        address: values.address || null,
        guardianName: values.guardianName || null,
        guardianPhone: values.guardianPhone || null,

        // PLE particulars
        pleSittingYear: values.pleSittingYear || null,
        plePrimarySchool: values.plePrimarySchool || null,
        pleIndexNumber: values.pleIndexNumber || null,
        pleAggregates: values.pleAggregates || null,
        pleDivision: values.pleDivision || null,

        // Residence & emergency
        village: values.village || null,
        parish: values.parish || null,
        districtOfResidence: values.districtOfResidence || null,
        homeDistrict: values.homeDistrict || null,
        emergencyContactName: values.emergencyContactName || null,
        emergencyContactPhone: values.emergencyContactPhone || null,

        // Health details
        medicalConditions: values.medicalConditions || null,
        recurrentMedication: values.recurrentMedication || null,
        knownDisability: values.knownDisability || null,

        // enrollment info
        academicYearId: values.academicYearId,
        classId: values.classId,
        streamId: values.streamId || null,
      });

      router.push('/students');
    } catch (e: any) {
      setErr(e?.message || 'Failed to add student');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Add New Student</h1>
        <p className="mt-1 text-sm text-slate-600">This will create the student and enroll them into the selected class.</p>
      </div>

      {err ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader title="Student Details" subtitle="Basic biodata" />
          <div className="p-5 pt-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Student Number</Label>
              <Input {...register('admissionNo')} placeholder="SCH-2026-001" />
              {formState.errors.admissionNo ? (
                <p className="text-xs text-red-600">{formState.errors.admissionNo.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                value={watch('gender') || 'MALE'}
                onChange={(e) => setValue('gender', e.target.value as any)}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>First Name</Label>
              <Input {...register('firstName')} />
              {formState.errors.firstName ? <p className="text-xs text-red-600">{formState.errors.firstName.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input {...register('lastName')} />
              {formState.errors.lastName ? <p className="text-xs text-red-600">{formState.errors.lastName.message}</p> : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Other Names</Label>
              <Input {...register('otherNames')} placeholder="optional" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Date of Birth</Label>
              <Input type="date" {...register('dateOfBirth')} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input {...register('address')} placeholder="optional" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Enrollment" subtitle="Academic year + class/stream" />
          <div className="p-5 pt-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                value={watch('academicYearId') || ''}
                onChange={(e) => setValue('academicYearId', e.target.value)}
              >
                <option value="">Select year</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(current)' : ''}
                  </option>
                ))}
              </select>
              {formState.errors.academicYearId ? (
                <p className="text-xs text-red-600">{formState.errors.academicYearId.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Term (optional)</Label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                value={watch('termId') || ''}
                onChange={(e) => setValue('termId', e.target.value)}
              >
                <option value="">(optional)</option>
                {termsForYear.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.isCurrent ? '(current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Class</Label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                value={watch('classId') || ''}
                onChange={(e) => setValue('classId', e.target.value)}
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {formState.errors.classId ? <p className="text-xs text-red-600">{formState.errors.classId.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Stream</Label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                value={watch('streamId') || ''}
                onChange={(e) => setValue('streamId', e.target.value)}
              >
                <option value="">(none)</option>
                {streamsForClass.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Guardian" subtitle="Optional (can be filled later)" />
          <div className="p-5 pt-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Guardian Name</Label>
              <Input {...register('guardianName')} placeholder="optional" />
            </div>
            <div className="space-y-2">
              <Label>Guardian Phone</Label>
              <Input {...register('guardianPhone')} placeholder="optional" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="PLE Particulars" subtitle="Optional (can be filled later)" />
          <div className="p-5 pt-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>PLE Sitting Year</Label>
              <Input {...register('pleSittingYear')} placeholder="e.g. 2023" />
            </div>
            <div className="space-y-2">
              <Label>PLE Index Number</Label>
              <Input {...register('pleIndexNumber')} placeholder="optional" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Primary School</Label>
              <Input {...register('plePrimarySchool')} placeholder="optional" />
            </div>

            <div className="space-y-2">
              <Label>Aggregates</Label>
              <Input {...register('pleAggregates')} placeholder="optional" />
            </div>
            <div className="space-y-2">
              <Label>Division</Label>
              <Input {...register('pleDivision')} placeholder="optional (e.g. 1)" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Residence & Emergency" subtitle="Optional (can be filled later)" />
          <div className="p-5 pt-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Village</Label>
              <Input {...register('village')} placeholder="optional" />
            </div>
            <div className="space-y-2">
              <Label>Parish</Label>
              <Input {...register('parish')} placeholder="optional" />
            </div>
            <div className="space-y-2">
              <Label>District of Residence</Label>
              <Input {...register('districtOfResidence')} placeholder="optional" />
            </div>
            <div className="space-y-2">
              <Label>Home District</Label>
              <Input {...register('homeDistrict')} placeholder="optional" />
            </div>

            <div className="space-y-2">
              <Label>Emergency Contact Name</Label>
              <Input {...register('emergencyContactName')} placeholder="optional" />
            </div>
            <div className="space-y-2">
              <Label>Emergency Contact Phone</Label>
              <Input {...register('emergencyContactPhone')} placeholder="optional" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Health Details" subtitle="Optional (can be filled later)" />
          <div className="p-5 pt-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Known Medical Conditions</Label>
              <Input {...register('medicalConditions')} placeholder="optional" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Recurrent Medication</Label>
              <Input {...register('recurrentMedication')} placeholder="optional" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Known Disability</Label>
              <Input {...register('knownDisability')} placeholder="optional" />
            </div>
          </div>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={() => router.back()} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save Student'}
          </Button>
        </div>
      </form>
    </div>
  );
}
