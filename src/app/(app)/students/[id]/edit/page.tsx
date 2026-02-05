"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardHeader, Input, Label, Select } from "@/components/ui";

const schema = z.object({
  studentNo: z.string().min(1, "Student number is required"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  otherName: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]),
  dob: z.string().optional(),
  className: z.string().optional(),
  stream: z.string().optional(),
  term: z.string().optional(),
  status: z.enum(["Active", "Transferred", "Graduated"]).optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  address: z.string().optional(),
  religion: z.string().optional(),
  nationality: z.string().optional(),
  medicalNotes: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),

  // PLE particulars
  pleSittingYear: z.string().optional(),
  plePrimarySchool: z.string().optional(),
  pleIndexNumber: z.string().optional(),
  pleAggregates: z.string().optional(),
  pleDivision: z.string().optional(),

  // Residence
  village: z.string().optional(),
  parish: z.string().optional(),
  districtOfResidence: z.string().optional(),
  homeDistrict: z.string().optional(),

  // Health details
  medicalConditions: z.string().optional(),
  recurrentMedication: z.string().optional(),
  knownDisability: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      gender: "Male",
      status: "Active",
      term: "Term 1",
      studentNo: "",
      firstName: "",
      lastName: "",
      otherName: "",
      guardianName: "",
      guardianPhone: "",
      address: "",
      religion: "",
      nationality: "",
      medicalNotes: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      pleSittingYear: "",
      plePrimarySchool: "",
      pleIndexNumber: "",
      pleAggregates: "",
      pleDivision: "",
      village: "",
      parish: "",
      districtOfResidence: "",
      homeDistrict: "",
      medicalConditions: "",
      recurrentMedication: "",
      knownDisability: "",
    },
  });

  const { register, handleSubmit, reset, formState } = form;

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/students/${id}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 404) {
            setNotFound(true);
            return;
          }
          throw new Error(data?.error || `Failed to load student (${res.status})`);
        }

        if (cancelled) return;

        const gender =
          data?.gender === "MALE"
            ? "Male"
            : data?.gender === "FEMALE"
            ? "Female"
            : data?.gender === "OTHER"
            ? "Other"
            : "Male";

        reset({
          studentNo: data?.admissionNo ?? "",
          firstName: data?.firstName ?? "",
          lastName: data?.lastName ?? "",
          otherName: data?.otherNames ?? "",
          gender,
          dob: data?.dateOfBirth ? String(data.dateOfBirth).slice(0, 10) : "",
          guardianName: data?.guardianName ?? "",
          guardianPhone: data?.guardianPhone ?? "",
          address: data?.address ?? "",
          religion: data?.religion ?? "",
          nationality: data?.nationality ?? "",
          medicalNotes: data?.medicalNotes ?? "",
          emergencyContactName: data?.emergencyContactName ?? "",
          emergencyContactPhone: data?.emergencyContactPhone ?? "",

          pleSittingYear: data?.pleSittingYear != null ? String(data.pleSittingYear) : "",
          plePrimarySchool: data?.plePrimarySchool ?? "",
          pleIndexNumber: data?.pleIndexNumber ?? "",
          pleAggregates: data?.pleAggregates != null ? String(data.pleAggregates) : "",
          pleDivision: data?.pleDivision ?? "",

          village: data?.village ?? "",
          parish: data?.parish ?? "",
          districtOfResidence: data?.districtOfResidence ?? "",
          homeDistrict: data?.homeDistrict ?? "",

          medicalConditions: data?.medicalConditions ?? "",
          recurrentMedication: data?.recurrentMedication ?? "",
          knownDisability: data?.knownDisability ?? "",

          term: "Term 1",
          status: "Active",
        });
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload: any = {
        admissionNo: values.studentNo?.trim() || null,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        otherNames: values.otherName?.trim() || null,
        gender: values.gender === "Male" ? "MALE" : values.gender === "Female" ? "FEMALE" : "OTHER",
        dateOfBirth: values.dob ? new Date(values.dob).toISOString() : null,
        guardianName: values.guardianName?.trim() || null,
        guardianPhone: values.guardianPhone?.trim() || null,
        address: values.address?.trim() || null,
        religion: values.religion?.trim() || null,
        nationality: values.nationality?.trim() || null,
        medicalNotes: values.medicalNotes?.trim() || null,
        emergencyContactName: values.emergencyContactName?.trim() || null,
        emergencyContactPhone: values.emergencyContactPhone?.trim() || null,

        // PLE particulars
        pleSittingYear: values.pleSittingYear?.trim() || null,
        plePrimarySchool: values.plePrimarySchool?.trim() || null,
        pleIndexNumber: values.pleIndexNumber?.trim() || null,
        pleAggregates: values.pleAggregates?.trim() || null,
        pleDivision: values.pleDivision?.trim() || null,

        // Residence
        village: values.village?.trim() || null,
        parish: values.parish?.trim() || null,
        districtOfResidence: values.districtOfResidence?.trim() || null,
        homeDistrict: values.homeDistrict?.trim() || null,

        // Health
        medicalConditions: values.medicalConditions?.trim() || null,
        recurrentMedication: values.recurrentMedication?.trim() || null,
        knownDisability: values.knownDisability?.trim() || null,
      };

      const res = await fetch(`/api/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Update failed (${res.status})`);

      router.push(`/students/${id}`);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Failed to save changes");
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-sm text-slate-700">Loading...</div>
      </Card>
    );
  }

  if (notFound) {
    return (
      <Card className="p-6">
        <div className="text-sm font-semibold text-slate-900">Student not found</div>
        <p className="mt-1 text-sm text-slate-600">This record may not exist in the database.</p>
        <Button className="mt-4" onClick={() => router.push("/students")} variant="secondary">
          Back to Students
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Edit Student" subtitle="Update student biodata (class/stream use Move Student)" />
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 p-5 pt-0 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Admission No</Label>
            <Input {...register("studentNo")} />
            {formState.errors.studentNo?.message && (
              <p className="text-xs text-red-600">{formState.errors.studentNo.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Gender</Label>
            <Select {...register("gender")}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>First Name</Label>
            <Input {...register("firstName")} />
            {formState.errors.firstName?.message && (
              <p className="text-xs text-red-600">{formState.errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input {...register("lastName")} />
            {formState.errors.lastName?.message && (
              <p className="text-xs text-red-600">{formState.errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Other Names</Label>
            <Input {...register("otherName")} />
          </div>

          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Input type="date" {...register("dob")} />
          </div>

          <div className="space-y-2">
            <Label>Guardian Name</Label>
            <Input {...register("guardianName")} />
          </div>

          <div className="space-y-2">
            <Label>Guardian Phone</Label>
            <Input {...register("guardianPhone")} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Input {...register("address")} />
          </div>

          <div className="sm:col-span-2 pt-2">
            <div className="text-sm font-extrabold text-slate-900">PLE Particulars</div>
            <div className="mt-1 text-xs text-slate-500">Optional (can be filled later)</div>
          </div>

          <div className="space-y-2">
            <Label>PLE Sitting Year</Label>
            <Input {...register("pleSittingYear")} placeholder="e.g. 2023" />
          </div>
          <div className="space-y-2">
            <Label>PLE Index Number</Label>
            <Input {...register("pleIndexNumber")} placeholder="optional" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Primary School</Label>
            <Input {...register("plePrimarySchool")} placeholder="optional" />
          </div>
          <div className="space-y-2">
            <Label>Aggregates</Label>
            <Input {...register("pleAggregates")} placeholder="optional" />
          </div>
          <div className="space-y-2">
            <Label>Division</Label>
            <Input {...register("pleDivision")} placeholder="optional (e.g. 1)" />
          </div>

          <div className="sm:col-span-2 pt-2">
            <div className="text-sm font-extrabold text-slate-900">Residence</div>
            <div className="mt-1 text-xs text-slate-500">Optional</div>
          </div>

          <div className="space-y-2">
            <Label>Village</Label>
            <Input {...register("village")} placeholder="optional" />
          </div>
          <div className="space-y-2">
            <Label>Parish</Label>
            <Input {...register("parish")} placeholder="optional" />
          </div>
          <div className="space-y-2">
            <Label>District of Residence</Label>
            <Input {...register("districtOfResidence")} placeholder="optional" />
          </div>
          <div className="space-y-2">
            <Label>Home District</Label>
            <Input {...register("homeDistrict")} placeholder="optional" />
          </div>

          <div className="sm:col-span-2 pt-2">
            <div className="text-sm font-extrabold text-slate-900">Health Details</div>
            <div className="mt-1 text-xs text-slate-500">Optional</div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Known Medical Conditions</Label>
            <Input {...register("medicalConditions")} placeholder="optional" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Recurrent Medication</Label>
            <Input {...register("recurrentMedication")} placeholder="optional" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Known Disability</Label>
            <Input {...register("knownDisability")} placeholder="optional" />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => router.push(`/students/${id}`)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
