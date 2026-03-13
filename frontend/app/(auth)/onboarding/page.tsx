"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/actions/onboarding";
import { Loader2, LocateFixed } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { OnboardingSchema } from "@/schemas/OnboardingSchema";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { SearchBoxRetrieveResponse } from "@mapbox/search-js-core";

const SearchBox = dynamic(
  () => import("@mapbox/search-js-react").then((mod) => mod.SearchBox),
  { ssr: false }
);
const AddressMinimap = dynamic(
  () => import("@mapbox/search-js-react").then((mod) => mod.AddressMinimap),
  { ssr: false }
);

import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BAGONG_SILANGAN_DISTRICTS } from "@/constants/bagong-silangan-districts";
import { useUserLocation } from "@/hooks/use-location";

// Fixed location constants for Bagong Silangan, Quezon City
const FIXED_CITY = "Quezon City";
const FIXED_BARANGAY = "Bagong Silangan";
const FIXED_REGION = "National Capital Region (NCR)";
const FIXED_PROVINCE = "NCR, Second District (Not a Province)";

const ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type OnboardingFormValues = z.infer<typeof OnboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const {
    location,
    error: locationError,
    loading: isLocating,
    requestLocation,
  } = useUserLocation();

  const [minimapFeature, setMinimapFeature] = useState<
    GeoJSON.Feature<GeoJSON.Point> | undefined
  >(undefined);

  // Configure Mapbox Search JS token once on mount
  useEffect(() => {
    import("@mapbox/search-js-react").then(({ config }) => {
      config.accessToken = ACCESS_TOKEN;
    });
  }, []);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: {
      birthday: "",
      gender: undefined,
      address: "",
      district: "",
      // Pre-filled — not shown as editable fields
      city: FIXED_CITY,
      barangay: FIXED_BARANGAY,
      region: FIXED_REGION,
      province: FIXED_PROVINCE,
      latitude: undefined,
      longitude: undefined,
    },
  });

  const { execute: submitOnboarding, isExecuting } = useAction(
    completeOnboarding,
    {
      onSuccess: ({ data }) => {
        if (data?.success) {
          toast.success("Onboarding completed!");

          let redirectPath = "/diagnosis";

          if (data.success.role === "CLINICIAN") {
            redirectPath = "/dashboard";
          } else if (data.success.role === "DEVELOPER") {
            const savedView = localStorage.getItem("developerView") as
              | "PATIENT"
              | "CLINICIAN"
              | null;
            redirectPath =
              savedView === "CLINICIAN" ? "/dashboard" : "/diagnosis";
          }

          router.push(redirectPath);
        } else if (data?.error) {
          toast.error(data.error);
        }
      },
      onError: () => {
        toast.error("An unexpected error occurred. Please try again later.");
      },
    },
  );

  const onSubmit = (data: OnboardingFormValues) => {
    submitOnboarding({
      ...data,
      gender: data.gender as "MALE" | "FEMALE" | "OTHER",
    });
  };

  // On mount, request geolocation automatically
  useEffect(() => {
    if (!location) requestLocation();
  }, []);

  // When geolocation resolves successfully, populate address + coordinates and show minimap
  useEffect(() => {
    if (location) {
      if (location.address && !form.getValues("address")) {
        form.setValue("address", location.address, { shouldValidate: true });
      }
      if (location.lat !== undefined) {
        form.setValue("latitude", location.lat);
      }
      if (location.lng !== undefined) {
        form.setValue("longitude", location.lng);
      }
      // Build a GeoJSON feature from the resolved coordinates so the minimap
      // is shown immediately, letting the user drag the marker to correct it.
      if (location.lat !== undefined && location.lng !== undefined) {
        setMinimapFeature({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [location.lng, location.lat],
          },
          properties: {},
        });
      }
    }
  }, [location]);

  // Handle Mapbox SearchBox selection — fires for any suggestion type (streets, addresses, POIs)
  const handleAutofillRetrieve = (response: SearchBoxRetrieveResponse) => {
    const feature = response?.features?.[0];
    if (!feature) return;

    const address: string =
      feature.properties.full_address ||
      feature.properties.place_formatted ||
      feature.properties.name ||
      "";
    const lng: number = feature.geometry.coordinates[0];
    const lat: number = feature.geometry.coordinates[1];

    console.log("[onboarding] Autofill address selected —", { lat, lng, address });

    form.setValue("address", address, { shouldValidate: true });
    form.setValue("latitude", lat);
    form.setValue("longitude", lng);
    setMinimapFeature(feature as GeoJSON.Feature<GeoJSON.Point>);
  };

  // Handle minimap marker drag — update coordinates
  const handleSaveMarkerLocation = (coordinate: [number, number]) => {
    const [lng, lat] = coordinate;
    console.log("[onboarding] Minimap marker moved —", { lat, lng });
    form.setValue("latitude", lat);
    form.setValue("longitude", lng);
  };

  return (
    <main className="flex h-screen overflow-hidden bg-base-200">
      {/* Left Column — scrollable */}
      <section className="flex-1 h-full overflow-y-auto flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32 py-12">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="space-y-3 lg:text-left text-center">
            <h1 className="text-4xl font-bold tracking-tight">
              Let&apos;s personalize your health journey
            </h1>
            <p className="text-muted text-base">
              Create your patient profile so we can keep track of your health
              history.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Birthday & Gender */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-base-content block">
                  Birthday <span className="text-error">*</span>
                </label>
                <Controller
                  name="birthday"
                  control={form.control}
                  render={({ field }) => (
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      className="bg-base-100"
                    />
                  )}
                />
                {form.formState.errors.birthday && (
                  <span className="text-error text-xs font-medium">
                    {form.formState.errors.birthday.message}
                  </span>
                )}
              </div>

              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-base-content block">
                  Gender <span className="text-error">*</span>
                </label>
                <Controller
                  name="gender"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full bg-base-100">
                        <SelectValue placeholder="Select your gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.gender && (
                  <span className="text-error text-xs font-medium">
                    {form.formState.errors.gender.message}
                  </span>
                )}
              </div>
            </div>

            <div className="divider">Your Location</div>

            {/* Location error alert — shown when geolocation fails */}
            {locationError && (
              <div className="alert alert-error flex items-center gap-2 mb-4 justify-between">
                <span>{locationError}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs ml-2"
                  onClick={requestLocation}
                  disabled={isLocating}
                >
                  Retry
                </button>
              </div>
            )}

            {/* No address warning — geolocation succeeded but no address returned */}
            {location && !location.address && !isLocating && (
              <div className="alert alert-warning flex items-center gap-2 mb-4">
                <span>
                  We couldn&apos;t retrieve the address for your location.
                  Please enter it manually.
                </span>
              </div>
            )}

            <div className="space-y-6">
              {/* Fixed: Barangay & City */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-base-content block">
                    City / Municipality
                  </label>
                  <Input
                    value={FIXED_CITY}
                    disabled
                    className="bg-base-100 opacity-60 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-base-content block">
                    Barangay
                  </label>
                  <Input
                    value={FIXED_BARANGAY}
                    disabled
                    className="bg-base-100 opacity-60 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* District / Zone */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-base-content block">
                  District / Zone <span className="text-error">*</span>
                </label>
                <Controller
                  name="district"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full bg-base-100">
                        <SelectValue placeholder="Select your district or zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {BAGONG_SILANGAN_DISTRICTS.map((d) => (
                          <SelectItem key={d.name} value={d.name}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.district && (
                  <span className="text-error text-xs font-medium">
                    {form.formState.errors.district.message}
                  </span>
                )}
              </div>

              {/* Street Address */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-base-content block">
                  Address <span className="text-error">*</span>
                </label>

                <div className="space-y-1">
                  <SearchBox
                    accessToken={ACCESS_TOKEN}
                    onRetrieve={handleAutofillRetrieve}
                    onChange={(value) =>
                      form.setValue("address", value, {
                        shouldValidate: !!value,
                      })
                    }
                    value={form.watch("address")}
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

                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={requestLocation}
                      disabled={isLocating}
                      className="btn btn-ghost btn-sm gap-1.5 text-xs text-base-content/70"
                    >
                      {isLocating ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <LocateFixed className="size-3.5" />
                      )}
                      Use my location
                    </button>
                  </div>

                  {/* Minimap — shown after geolocation resolves or a SearchBox suggestion is selected */}
                  {minimapFeature && !isLocating && (
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

                {form.formState.errors.address && (
                  <span className="text-error text-xs font-medium">
                    {form.formState.errors.address.message}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isExecuting || isLocating}
                className="btn btn-primary w-full h-12 rounded-xl text-base font-medium text-primary-content tracking-wide disabled:text-muted"
              >
                {isExecuting || isLocating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isLocating ? "Getting your location…" : ""}
                  </>
                ) : (
                  "Get Started"
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Right Column — fixed, non-scrolling image panel */}
      <section className="hidden lg:block lg:flex-1 relative p-2 overflow-hidden bg-base-200">
        <img
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2940&auto=format&fit=crop"
          alt="Medical professional reviewing patient data"
          className="w-full h-full object-cover rounded-3xl"
        />
      </section>
    </main>
  );
}
