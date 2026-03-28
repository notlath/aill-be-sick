"use client";

import { useState, useCallback, useEffect } from "react";
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
import dynamic from "next/dynamic";
import type { SearchBoxRetrieveResponse } from "@mapbox/search-js-core";
import { BAGONG_SILANGAN_DISTRICTS } from "@/constants/bagong-silangan-districts";

const SearchBox = dynamic(
  () => import("@mapbox/search-js-react").then((mod) => mod.SearchBox),
  { ssr: false },
);
const AddressMinimap = dynamic(
  () => import("@mapbox/search-js-react").then((mod) => mod.AddressMinimap),
  { ssr: false },
);

// Fixed location constants for Bagong Silangan, Quezon City
const FIXED_CITY = "Quezon City";
const FIXED_BARANGAY = "Bagong Silangan";
const FIXED_REGION = "National Capital Region (NCR)";
const FIXED_PROVINCE = "NCR, Second District (Not a Province)";

const ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface CreatePatientFormProps {
  onSuccess?: () => void;
}

export default function CreatePatientForm({
  onSuccess,
}: CreatePatientFormProps) {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | "">("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [minimapFeature, setMinimapFeature] = useState<
    GeoJSON.Feature<GeoJSON.Point> | undefined
  >(undefined);

  const [createdPatient, setCreatedPatient] = useState<{
    name: string;
    email: string;
    tempPassword: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  // Configure Mapbox Search JS token once on mount
  useEffect(() => {
    import("@mapbox/search-js-react").then(({ config }) => {
      config.accessToken = ACCESS_TOKEN;
    });
  }, []);

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
        setFirstName("");
        setMiddleName("");
        setLastName("");
        setSuffix("");
        setEmail("");
        setBirthday("");
        setGender("");
        setAddress("");
        setDistrict("");
        setLatitude(null);
        setLongitude(null);
        setMinimapFeature(undefined);
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: () => toast.error("Failed to create patient account"),
  });

  // Handle Mapbox SearchBox selection — fires for any suggestion type (streets, addresses, POIs)
  const handleAutofillRetrieve = useCallback(
    (response: SearchBoxRetrieveResponse) => {
      const feature = response?.features?.[0];
      if (!feature) return;

      const newAddress: string =
        feature.properties.full_address ||
        feature.properties.place_formatted ||
        feature.properties.name ||
        "";
      const lng: number = feature.geometry.coordinates[0];
      const lat: number = feature.geometry.coordinates[1];

      console.log("[create-patient] Autofill address selected —", {
        lat,
        lng,
        address: newAddress,
      });

      setAddress(newAddress);
      setLatitude(lat);
      setLongitude(lng);
      setMinimapFeature(feature as GeoJSON.Feature<GeoJSON.Point>);
    },
    [],
  );

  // Handle minimap marker drag — update coordinates
  const handleSaveMarkerLocation = useCallback(
    (coordinate: [number, number]) => {
      const [lng, lat] = coordinate;
      console.log("[create-patient] Minimap marker moved —", { lat, lng });
      setLatitude(lat);
      setLongitude(lng);
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      execute({
        firstName,
        middleName: middleName || undefined,
        lastName,
        suffix: suffix || undefined,
        email,
        birthday,
        gender: gender as "MALE" | "FEMALE" | "OTHER",
        address,
        district,
        city: FIXED_CITY,
        barangay: FIXED_BARANGAY,
        region: FIXED_REGION,
        province: FIXED_PROVINCE,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      });
    },
    [
      execute,
      firstName,
      middleName,
      lastName,
      suffix,
      email,
      birthday,
      gender,
      address,
      district,
      latitude,
      longitude,
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

      {/* Personal Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-base-content">
            First Name *
          </label>
          <Input
            name="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Juan"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-base-content">
            Middle Name
          </label>
          <Input
            name="middleName"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
            placeholder="Santos"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-base-content">
            Last Name *
          </label>
          <Input
            name="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Dela Cruz"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-base-content">
            Suffix
          </label>
          <Input
            name="suffix"
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
            placeholder="Jr., Sr., III"
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
      </div>

      {/* Patient's Home Address */}
      <div className="border-t border-base-300 pt-6 mt-6">
        <h3 className="text-lg font-semibold text-base-content mb-4">
          Patient's Home Address
        </h3>
        <p className="text-sm text-muted mb-4">
          Enter the patient's residential address for accurate disease tracking
          and outbreak detection. The address is geocoded to get location
          coordinates.
        </p>

        <div className="space-y-6">
          {/* District / Zone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content block">
              District / Zone *
            </label>
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger className="w-full bg-base-100">
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

          {/* Residential Street Address with Mapbox SearchBox */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content block">
              Residential Street Address *
            </label>

            <div className="space-y-1">
              <SearchBox
                accessToken={ACCESS_TOKEN}
                onRetrieve={handleAutofillRetrieve}
                onChange={(value) => setAddress(value)}
                value={address}
                options={{ language: "en", country: "PH" }}
                placeholder="Start typing the patient's street address…"
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

              {/* Minimap — shown after SearchBox suggestion is selected */}
              {minimapFeature && (
                <div className="rounded-xl overflow-hidden mt-4 h-48 w-full border border-base-300">
                  <AddressMinimap
                    accessToken={ACCESS_TOKEN}
                    feature={minimapFeature}
                    show={true}
                    satelliteToggle
                    canAdjustMarker
                    footer
                    onSaveMarkerLocation={handleSaveMarkerLocation}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Hidden inputs for fixed values */}
          <input type="hidden" name="city" value={FIXED_CITY} />
          <input type="hidden" name="barangay" value={FIXED_BARANGAY} />
          <input type="hidden" name="region" value={FIXED_REGION} />
          <input type="hidden" name="province" value={FIXED_PROVINCE} />
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
