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
import dynamic from "next/dynamic";
import type { SearchBoxRetrieveResponse } from "@mapbox/search-js-core";

const SearchBox = dynamic(
  () => import("@mapbox/search-js-react").then((mod) => mod.SearchBox),
  { ssr: false },
);

const ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const FIXED_CITY = "Quezon City";
const FIXED_BARANGAY = "Bagong Silangan";
const FIXED_REGION = "National Capital Region (NCR)";
const FIXED_PROVINCE = "NCR, Second District";

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
  const [latitude, setLatitude] = useState<number | null>(patient.latitude);
  const [longitude, setLongitude] = useState<number | null>(patient.longitude);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    import("@mapbox/search-js-react").then(({ config }) => {
      config.accessToken = ACCESS_TOKEN;
    });
  }, []);

  const handleAutofillRetrieve = (response: SearchBoxRetrieveResponse) => {
    const feature = response?.features?.[0];
    if (!feature) return;

    const addressStr: string =
      feature.properties.full_address ||
      feature.properties.place_formatted ||
      feature.properties.name ||
      "";
    const lng: number = feature.geometry.coordinates[0];
    const lat: number = feature.geometry.coordinates[1];

    setAddress(addressStr);
    setLatitude(lat);
    setLongitude(lng);
  };

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
        latitude,
        longitude,
      });
    },
    [execute, patient, name, gender, birthday, address, district, latitude, longitude]
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
                    <SearchBox
                      accessToken={ACCESS_TOKEN}
                      onRetrieve={handleAutofillRetrieve}
                      onChange={(value) => setAddress(value)}
                      value={address}
                      options={{ language: "en", country: "PH" }}
                      placeholder="Start typing your street address…"
                      theme={{
                        variables: {
                          fontFamily: "inherit",
                          unit: "14px",
                          padding: "0.5em",
                          borderRadius: "0.5rem",
                          colorBackground: "#ffffff",
                          colorBackgroundHover: "#f5f5f7",
                          colorText: "#1d1d1f",
                          colorPrimary: "oklch(59% 0.145 163.225)",
                          border: "1px solid #e8e8ed",
                          boxShadow: "none",
                        },
                      }}
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
