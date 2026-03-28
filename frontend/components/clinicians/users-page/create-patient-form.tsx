"use client";

import { useState, useCallback } from "react";
import { UserPlus, Loader2, CheckCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { createPatient } from "@/actions/create-patient";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useAction } from "next-safe-action/hooks";

interface CreatePatientFormProps {
  onSuccess?: () => void;
}

export default function CreatePatientForm({
  onSuccess,
}: CreatePatientFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | "">("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [medicalId, setMedicalId] = useState("");

  const [createdPatient, setCreatedPatient] = useState<{
    name: string;
    email: string;
    tempPassword: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  const { execute, isExecuting } = useAction(createPatient, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setCreatedPatient({
          name: data.success.name || "",
          email: data.success.email,
          tempPassword: data.success.tempPassword,
        });
        toast.success("Patient account created successfully!");
        // Reset form
        setName("");
        setEmail("");
        setPhone("");
        setBirthday("");
        setGender("");
        setAddress("");
        setDistrict("");
        setCity("");
        setBarangay("");
        setRegion("");
        setProvince("");
        setMedicalId("");
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: () => toast.error("Failed to create patient account"),
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      execute({
        name,
        email,
        phone: phone || undefined,
        birthday,
        gender: gender as "MALE" | "FEMALE" | "OTHER",
        address,
        district,
        city,
        barangay,
        region,
        province,
        medicalId: medicalId || undefined,
      });
    },
    [
      execute,
      name,
      email,
      phone,
      birthday,
      gender,
      address,
      district,
      city,
      barangay,
      region,
      province,
      medicalId,
    ],
  );

  const handleCopyPassword = useCallback(() => {
    if (createdPatient?.tempPassword) {
      navigator.clipboard.writeText(createdPatient.tempPassword);
      setCopied(true);
      toast.success("Password copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  }, [createdPatient]);

  const handleCreateAnother = useCallback(() => {
    setCreatedPatient(null);
    onSuccess?.();
  }, [onSuccess]);

  // Show success state with temp credentials
  if (createdPatient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-success" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-base-content">
              Patient Account Created
            </h2>
            <p className="text-sm text-muted">
              Share these temporary credentials with the patient
            </p>
          </div>
        </div>

        <div className="bg-base-200 rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content">
              Patient Name
            </label>
            <p className="text-base-content font-semibold">
              {createdPatient.name}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content">
              Email
            </label>
            <p className="text-base-content">{createdPatient.email}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content">
              Temporary Password
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-base-300 px-4 py-2 rounded-lg font-mono text-sm break-all">
                {createdPatient.tempPassword}
              </code>
              <button
                onClick={handleCopyPassword}
                className="btn btn-ghost btn-sm"
                title="Copy password"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
          <p className="text-sm text-warning-content">
            <strong>Important:</strong> The patient must change their password
            on first login. Please share these credentials securely.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={handleCreateAnother}
            className="btn btn-primary rounded-[10px]"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create Another Patient
          </button>
        </div>
      </div>
    );
  }

  // Show creation form
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-base-content">
            Create Patient Account
          </h2>
          <p className="text-sm text-muted">
            Enter patient details to create a new account
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-base-content">
            Full Name *
          </label>
          <Input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Patient's full name"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-base-content">
            Email Address *
          </label>
          <Input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="patient@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-base-content">
            Phone Number
          </label>
          <Input
            type="tel"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+63 912 345 6789"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-base-content">
            Date of Birth *
          </label>
          <Input
            type="date"
            name="birthday"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-base-content">
            Gender *
          </label>
          <Select
            value={gender}
            onValueChange={(value) =>
              setGender(value as "MALE" | "FEMALE" | "OTHER")
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-base-content">
            Medical ID
          </label>
          <Input
            name="medicalId"
            value={medicalId}
            onChange={(e) => setMedicalId(e.target.value)}
            placeholder="Optional medical ID"
          />
        </div>
      </div>

      {/* Address Information */}
      <div className="border-t border-base-300 pt-6 mt-6">
        <h3 className="text-lg font-semibold text-base-content mb-4">
          Address Information
        </h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-base-content">
              Street Address *
            </label>
            <Input
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content">
              District/Zone *
            </label>
            <Input
              name="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="District or zone"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content">
              Barangay *
            </label>
            <Input
              name="barangay"
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
              placeholder="Barangay"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content">
              City *
            </label>
            <Input
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content">
              Province *
            </label>
            <Input
              name="province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder="Province"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content">
              Region *
            </label>
            <Input
              name="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Region"
              required
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="submit"
          disabled={isExecuting}
          className="btn btn-primary rounded-[10px] px-6"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Creating...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Create Patient Account
            </>
          )}
        </button>
      </div>
    </form>
  );
}
