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
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import type { SearchBoxRetrieveResponse } from "@mapbox/search-js-core";
import { BAGONG_SILANGAN_DISTRICTS } from "@/constants/bagong-silangan-districts";
import {
  ACCESS_TOKEN,
  FIXED_CITY,
  FIXED_BARANGAY,
  FIXED_REGION,
  FIXED_PROVINCE,
  parseMapboxResponse,
} from "@/utils/mapbox";
import { calculateAge } from "@/utils/lib";

const SearchBox = dynamic(
  () => import("@mapbox/search-js-react").then((mod) => mod.SearchBox),
  { ssr: false },
);
const AddressMinimap = dynamic(
  () => import("@mapbox/search-js-react").then((mod) => mod.AddressMinimap),
  { ssr: false },
);

interface CreatePatientFormProps {
  onSuccess?: () => void;
}

export default function CreatePatientForm({
  onSuccess,
}: CreatePatientFormProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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

  // Guardian information for minors
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("");
  const [guardianConsent, setGuardianConsent] = useState(false);

  // Age calculation state
  const [age, setAge] = useState<number | null>(null);

  const [createdPatient, setCreatedPatient] = useState<{
    name: string;
    email: string;
    message: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  // Configure Mapbox Search JS token once on mount
  useEffect(() => {
    console.log("[create-patient-form] Configuring Mapbox token:", !!ACCESS_TOKEN);
    if (ACCESS_TOKEN) {
      import("@mapbox/search-js-react").then(({ config }) => {
        config.accessToken = ACCESS_TOKEN;
        console.log("[create-patient-form] Mapbox token configured successfully");
      }).catch((error) => {
        console.error("[create-patient-form] Failed to configure Mapbox:", error);
      });
    } else {
      console.warn("[create-patient-form] No Mapbox token available");
    }
  }, []);

  // Calculate age when birthday changes
  useEffect(() => {
    if (birthday) {
      try {
        const calculatedAge = calculateAge(birthday);
        console.log("[create-patient-form] Age calculation:", { birthday, calculatedAge });
        setAge(calculatedAge);
      } catch (error) {
        console.error("Error calculating age:", error);
        setAge(null);
      }
    } else {
      setAge(null);
    }
  }, [birthday]);

  const { execute, isExecuting } = useAction(createPatient, {
    onSuccess: ({ data }) => {
      console.log("[create-patient-form] Action success:", data);
      if (data?.success) {
        setCreatedPatient({
          name: data.success.name || "",
          email: data.success.email,
          message: data.success.message,
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
        // Reset guardian fields
        setGuardianName("");
        setGuardianEmail("");
        setGuardianPhone("");
        setGuardianRelation("");
        setGuardianConsent(false);
        setAge(null);
      } else if (data?.error) {
        console.error("[create-patient-form] Server returned error:", data.error);
        toast.error(data.error);
      }
    },
    onError: (error) => {
      console.error("[create-patient-form] Action failed:", error);
      console.error("[create-patient-form] Error details:", JSON.stringify(error, null, 2));
      toast.error("Failed to register patient account");
    },
  });

  // Handle Mapbox SearchBox selection — fires for any suggestion type (streets, addresses, POIs)
  const handleAutofillRetrieve = useCallback(
    (response: SearchBoxRetrieveResponse) => {
      const result = parseMapboxResponse(response);
      if (!result) return;

      console.log("[create-patient] Autofill address selected —", {
        lat: result.lat,
        lng: result.lng,
        address: result.address,
      });

      setAddress(result.address);
      setLatitude(result.lat);
      setLongitude(result.lng);
      setMinimapFeature(result.feature);
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

      // Client-side validation
      if (!gender) {
        toast.error("Please select a gender");
        return;
      }

      const formData = {
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
        guardianName: guardianName || undefined,
        guardianEmail: guardianEmail || undefined,
        guardianPhone: guardianPhone || undefined,
        guardianRelation: guardianRelation || undefined,
        guardianConsent: guardianConsent || undefined,
      };

      console.log("[create-patient-form] Submitting form with data:", {
        firstName,
        lastName,
        email,
        birthday,
        age,
        gender,
        hasGuardianData: age !== null && age < 18,
        guardianName: guardianName || "none",
        guardianEmail: guardianEmail || "none",
        guardianRelation: guardianRelation || "none",
        guardianConsent,
      });
      console.log("[create-patient-form] Full form data:", formData);
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
        guardianName: guardianName || undefined,
        guardianEmail: guardianEmail || undefined,
        guardianPhone: guardianPhone || undefined,
        guardianRelation: guardianRelation || undefined,
        guardianConsent: guardianConsent || undefined,
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
      guardianName,
      guardianEmail,
      guardianPhone,
      guardianRelation,
      guardianConsent,
    ],
  );

  const handleCreateAnother = useCallback(() => {
    setCreatedPatient(null);
    onSuccess?.();
  }, [onSuccess]);

  // Show success state with invite email sent
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
              An invite email has been sent to the patient
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
              Next Steps
            </label>
            <p className="text-base-content text-sm">
              {createdPatient.message}
            </p>
          </div>
        </div>

        <div className="bg-info/10 border border-info/20 rounded-xl p-4">
          <p className="text-sm text-info">
            <strong>What happens next:</strong> The patient will receive an
            email with a link to set their password. Once they click the link
            and set their password, they can log in to the system.
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
            Register Patient Account
          </h2>
          <p className="text-sm text-muted">
            Enter patient details to register a new account
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
              <SelectValue placeholder="Select gender" className="text-muted" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Guardian Information */}
      {age !== null && age < 18 && (
        <div className="border-t border-base-300 pt-6 mt-6">
          <h3 className="text-lg font-semibold text-base-content mb-4">
            Guardian Information
          </h3>
          <p className="text-sm text-muted mb-4">
            Since the patient is under 18 years old, guardian information is required.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content">
                Guardian Full Name *
              </label>
              <Input
                name="guardianName"
                value={guardianName}
                onChange={(e) => {
                  console.log("[create-patient-form] Guardian name changed:", e.target.value);
                  setGuardianName(e.target.value);
                }}
                placeholder="Juan Dela Cruz"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content">
                Guardian Email Address *
              </label>
              <Input
                type="email"
                name="guardianEmail"
                value={guardianEmail}
                onChange={(e) => {
                  console.log("[create-patient-form] Guardian email changed:", e.target.value);
                  setGuardianEmail(e.target.value);
                }}
                placeholder="guardian@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content">
                Guardian Phone Number
              </label>
              <Input
                type="tel"
                name="guardianPhone"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="+63 912 345 6789"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content">
                Relationship to Patient *
              </label>
          <Select
            value={guardianRelation}
            onValueChange={(value) => {
              console.log("[create-patient-form] Guardian relation changed:", value);
              setGuardianRelation(value);
            }}
          >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" className="text-muted" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Parent">Parent</SelectItem>
                  <SelectItem value="Guardian">Guardian</SelectItem>
                  <SelectItem value="Grandparent">Grandparent</SelectItem>
                  <SelectItem value="Sibling">Sibling (18+)</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Guardian Consent Checkbox */}
          <div className="mt-6">
            <label className="cursor-pointer flex items-start gap-3 p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors border border-base-300">
              <input
                type="checkbox"
                className="checkbox checkbox-warning mt-0.5"
                checked={guardianConsent}
                onChange={(e) => {
                  console.log("[create-patient-form] Guardian consent changed:", e.target.checked);
                  setGuardianConsent(e.target.checked);
                }}
                required
              />
              <span className="text-sm leading-tight">
                I confirm that the guardian has provided{" "}
                <strong>permission and consent</strong> for this minor patient to use
                the system, and that all provided guardian information is accurate.
              </span>
            </label>
          </div>
        </div>
      )}

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
                <SelectValue
                  placeholder="Select district or zone"
                  className="text-muted"
                />
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
                    padding: "0.5em",
                    borderRadius: "0.5rem",
                    colorBackground: isDark ? "#1e293b" : "#ffffff",
                    colorBackgroundHover: isDark ? "#334155" : "#f5f5f7",
                    colorText: isDark ? "#f8fafc" : "#1d1d1f",
                    colorSecondary: isDark ? "#94A3B8" : "#738080",
                    colorPrimary: "oklch(59% 0.145 163.225)",
                    border: isDark ? "1px solid #475569" : "1px solid #e8e8ed",
                    boxShadow: "none",
                  },
                  cssText: `
                    .Input {
                      font-size: var(--text-sm, 0.9375rem);
                    }
                    .Input::placeholder {
                      color: ${isDark ? "#94A3B8" : "#738080"};
                      opacity: 1;
                      font-size: var(--text-sm, 0.9375rem);
                    }
                  `,
                }}
              />

              {/* Minimap — shown after SearchBox suggestion is selected */}
              {minimapFeature && (
                <div className="rounded-xl overflow-hidden mt-4 h-48 w-full border border-base-300">
                  <AddressMinimap
                    accessToken={ACCESS_TOKEN}
                    feature={minimapFeature}
                    show={true}
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
              Register Patient Account
            </>
          )}
        </button>
      </div>
    </form>
  );
}
