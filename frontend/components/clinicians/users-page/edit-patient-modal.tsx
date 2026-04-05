"use client";

import { useState, useEffect, useCallback } from "react";
import { useAction } from "next-safe-action/hooks";
import { Edit2, X, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { updatePatientDetails } from "@/actions/update-patient-details";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { BAGONG_SILANGAN_DISTRICTS } from "@/constants/bagong-silangan-districts";
import { createPortal } from "react-dom";

const FIXED_CITY = "Quezon City";
const FIXED_BARANGAY = "Bagong Silangan";
const FIXED_REGION = "National Capital Region (NCR)";
const FIXED_PROVINCE = "NCR, Second District (Not a Province)";

interface EditPatientModalProps {
  patient: {
    id: number;
    name: string | null;
    email: string;
    gender: string | null;
    birthday: Date | null;
    address: string | null;
    district: string | null;
    city: string | null;
    barangay: string | null;
    region: string | null;
    province: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

export function EditPatientModal({ patient }: EditPatientModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState(patient.name || "");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | "">(
    (patient.gender as "MALE" | "FEMALE" | "OTHER" | "") || ""
  );
  const [birthday, setBirthday] = useState(
    patient.birthday
      ? new Date(patient.birthday).toISOString().split("T")[0]
      : ""
  );
  const [address, setAddress] = useState(patient.address || "");
  const [district, setDistrict] = useState(patient.district || "");

  useEffect(() => {
    setMounted(true);
  }, []);

  const { execute, isExecuting } = useAction(updatePatientDetails, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Patient details updated successfully");
        setIsOpen(false);
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: () => {
      toast.error("Failed to update patient details");
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !birthday) return;

      execute({
        patientId: patient.id,
        name: name.trim(),
        gender: gender || null,
        birthday,
        address: address || null,
        district: district || null,
        city: FIXED_CITY,
        barangay: FIXED_BARANGAY,
        region: FIXED_REGION,
        province: FIXED_PROVINCE,
        latitude: patient.latitude,
        longitude: patient.longitude,
      });
    },
    [execute, patient, name, gender, birthday, address, district]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn btn-outline btn-sm gap-2"
      >
        <Edit2 className="w-4 h-4" />
        Edit Details
      </button>

      {isOpen &&
        mounted &&
        createPortal(
          <dialog className="modal modal-open">
            <div className="modal-box max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Edit Patient Details</h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn btn-ghost btn-sm btn-circle"
                  disabled={isExecuting}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Patient name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gender</label>
                    <Select value={gender} onValueChange={(v) => setGender(v as "MALE" | "FEMALE" | "OTHER" | "")}>
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
                    <label className="text-sm font-medium">Birthday</label>
                    <Input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Address
                    </label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">District / Zone</label>
                    <Select value={district} onValueChange={setDistrict}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select district or zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {BAGONG_SILANGAN_DISTRICTS.map((d) => (
                          <SelectItem key={d.name} value={d.name}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input value={FIXED_CITY} disabled className="opacity-60" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Barangay</label>
                    <Input
                      value={FIXED_BARANGAY}
                      disabled
                      className="opacity-60"
                    />
                  </div>
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setIsOpen(false)}
                    disabled={isExecuting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isExecuting || !name.trim() || !birthday}
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </form>
            </div>
            <form method="dialog" className="modal-backdrop">
              <button type="submit">close</button>
            </form>
          </dialog>,
          document.body
        )}
    </>
  );
}
