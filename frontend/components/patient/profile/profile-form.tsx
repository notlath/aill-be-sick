"use client";

import { useState, useRef, useEffect, useMemo, useCallback, useTransition } from "react";
import { User, Upload, Trash2, Loader2, MapPin, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { updateProfile, uploadAvatar, removeAvatar, updateProfileLocation } from "@/actions/update-profile";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useAction } from "next-safe-action/hooks";
import Image from "next/image";
import { DatePicker } from "@/components/ui/date-picker";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProfileSchema, ProfileSchemaType } from "@/schemas/ProfileSchema";
import { BAGONG_SILANGAN_DISTRICTS } from "@/constants/bagong-silangan-districts";
import { useUserLocation } from "@/hooks/use-location";
import dynamic from "next/dynamic";
import type { SearchBoxRetrieveResponse } from "@mapbox/search-js-core";

type ProfileFormValues = ProfileSchemaType;

const SearchBox = dynamic(
  () => import("@mapbox/search-js-react").then((mod) => mod.SearchBox),
  { ssr: false }
);
const AddressMinimap = dynamic(
  () => import("@mapbox/search-js-react").then((mod) => mod.AddressMinimap),
  { ssr: false }
);

// Fixed location constants for Bagong Silangan, Quezon City
const FIXED_CITY = "Quezon City";
const FIXED_BARANGAY = "Bagong Silangan";
const FIXED_REGION = "National Capital Region (NCR)";
const FIXED_PROVINCE = "NCR, Second District (Not a Province)";

const ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface ProfileState {
  name: string;
  email: string;
  avatar: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  barangay: string | null;
  address: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  birthday: string | null;
}

interface ProfileFormProps {
  user: ProfileState;
}

// Static JSX - extracted outside component to prevent recreation on each render
const LockIcon = () => (
  <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

// Static gradient style
const GRADIENT_STYLE = {
  backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')`,
} as const;

export default function ProfileForm({ user: initialUser }: ProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [minimapFeature, setMinimapFeature] = useState<GeoJSON.Feature<GeoJSON.Point> | undefined>(undefined);

  const [name, setName] = useState(initialUser.name || "");
  const [avatar, setAvatar] = useState<string | null>(initialUser.avatar);
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | null>(
    initialUser.gender || null
  );
  const [birthday, setBirthday] = useState(initialUser.birthday || "");

  const {
    location,
    error: locationError,
    loading: isLocating,
    requestLocation,
  } = useUserLocation();

  // Configure Mapbox Search JS token once on mount
  useEffect(() => {
    import("@mapbox/search-js-react").then(({ config }) => {
      config.accessToken = ACCESS_TOKEN;
    });
  }, []);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      birthday: initialUser.birthday || "",
      gender: initialUser.gender || null,
      address: initialUser.address || "",
      district: initialUser.district || "",
      city: FIXED_CITY,
      barangay: FIXED_BARANGAY,
      region: FIXED_REGION,
      province: FIXED_PROVINCE,
      latitude: initialUser.latitude || undefined,
      longitude: initialUser.longitude || undefined,
    },
  });

  // On mount, request geolocation if no address is set
  useEffect(() => {
    if (!initialUser.address && !location) {
      requestLocation();
    }
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

  // Handle Mapbox SearchBox selection
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

    form.setValue("address", address, { shouldValidate: true });
    form.setValue("latitude", lat);
    form.setValue("longitude", lng);
    setMinimapFeature(feature as GeoJSON.Feature<GeoJSON.Point>);
  };

  // Handle minimap marker drag
  const handleSaveMarkerLocation = (coordinate: [number, number]) => {
    const [lng, lat] = coordinate;
    form.setValue("latitude", lat);
    form.setValue("longitude", lng);
  };

  // Memoized profile update action with unified success handler
  const { execute: executeUpdateProfile, isExecuting: isUpdatingProfile } = useAction(
    updateProfile,
    {
      onSuccess: ({ data }) => {
        if (data?.success) {
          toast.success("Profile updated successfully");
        } else if (data?.error) {
          toast.error(data.error);
        }
      },
      onError: () => {
        toast.error("Failed to update profile");
      },
    }
  );

  // Location update action
  const { execute: executeUpdateProfileLocation, isExecuting: isUpdatingLocation } = useAction(
    updateProfileLocation,
    {
      onSuccess: ({ data }) => {
        if (data?.success) {
          toast.success("Location updated successfully");
        } else if (data?.error) {
          toast.error(data.error);
        }
      },
      onError: () => {
        toast.error("Failed to update location");
      },
    }
  );

  // Handle avatar upload
  const { execute: executeUploadAvatar, isExecuting: isUploadingAvatar } = useAction(
    uploadAvatar,
    {
      onSuccess: ({ data }) => {
        if (data?.success && data.avatarUrl) {
          setAvatar(data.avatarUrl);
          toast.success("Avatar updated successfully");
        } else if (data?.error) {
          toast.error(data.error);
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
      onError: () => {
        toast.error("Failed to upload avatar");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    }
  );

  // Handle avatar removal
  const { execute: executeRemoveAvatar } = useAction(removeAvatar, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setAvatar(null);
        toast.success("Avatar removed successfully");
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: () => {
      toast.error("Failed to remove avatar");
    },
  });

  const handleNameSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    executeUpdateProfile({
      name: formData.get("name") as string,
      region: initialUser.region || undefined,
      province: initialUser.province || undefined,
      city: initialUser.city || undefined,
      barangay: initialUser.barangay || undefined,
      gender: gender || undefined,
      birthday: birthday || undefined,
    });
  }, [executeUpdateProfile, gender, birthday]);

  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);
    executeUploadAvatar({ formData });
  }, [executeUploadAvatar]);

  const handleRemoveAvatar = useCallback(() => {
    executeRemoveAvatar();
  }, [executeRemoveAvatar]);

  const handleLocationSubmit = useCallback((data: ProfileFormValues) => {
    executeUpdateProfileLocation({
      birthday: data.birthday,
      gender: data.gender || null,
      address: data.address,
      district: data.district,
      city: data.city,
      barangay: data.barangay,
      region: data.region,
      province: data.province,
      latitude: data.latitude,
      longitude: data.longitude,
    });
  }, [executeUpdateProfileLocation]);

  const isSubmitting = isUpdatingLocation;

  return (
    <div className="space-y-10">
      {/* Profile Card */}
      <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Header with gradient */}
        <div className="relative h-32 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20">
          <div className="absolute inset-0 opacity-40" style={GRADIENT_STYLE} />
        </div>

        <div className="relative px-8 pb-8">
          {/* Avatar */}
          <div className="relative -mt-16 mb-6">
            <div className="relative inline-block">
              <div className="w-32 h-32 relative rounded-full bg-white shadow-lg border-4 border-white overflow-hidden flex items-center justify-center">
                {avatar ? (
                  <Image
                    src={avatar}
                    fill
                    alt={name || "Profile"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-muted" />
                )}
              </div>

              {/* Upload overlay */}
              <label
                className={`absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center cursor-pointer shadow-md transition-all duration-200 ${isUploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-5 h-5 text-primary-content animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-primary-content" />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isUploadingAvatar}
                />
              </label>
            </div>

            {avatar && (
              <button
                onClick={handleRemoveAvatar}
                className="absolute bottom-0 right-0 mt-24 w-8 h-8 rounded-full bg-error hover:bg-error/90 flex items-center justify-center shadow-md transition-all duration-200 group"
                title="Remove avatar"
              >
                <Trash2 className="w-4 h-4 text-error-content group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>

          {/* Name and Email Section */}
          <form onSubmit={handleNameSubmit} className="grid gap-6 md:grid-cols-2">
            {/* Name Field */}
            <div className="space-y-2">
              <label className="text-sm block font-medium text-base-content">
                Name
              </label>
              <div className="flex gap-2">
                <Input
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Email Field (Read-only) */}
            <div className="space-y-2">
              <label className="text-sm block font-medium text-base-content">
                Email
              </label>
              <div className="relative">
                <Input
                  type="email"
                  value={initialUser.email}
                  disabled
                  className="pr-10 bg-base-200/50"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <LockIcon />
                </div>
              </div>
              <p className="text-xs text-muted">
                Managed by Google account
              </p>
            </div>

            {/* Gender Field */}
            <div className="space-y-2">
              <label className="text-sm block font-medium text-base-content">
                Gender
              </label>
              <Select
                className="w-full"
                value={gender ?? ""}
                onValueChange={(value) => setGender(value as "MALE" | "FEMALE" | "OTHER" | null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Birthday Field */}
            <div className="space-y-2">
              <label className="text-sm block font-medium text-base-content">
                Birthday
              </label>
              <Controller
                name="birthday"
                control={form.control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    className="bg-base-100 w-full"
                  />
                )}
              />
              {form.formState.errors.birthday && (
                <span className="text-error text-xs font-medium">
                  {form.formState.errors.birthday.message}
                </span>
              )}
            </div>

            <div className="col-start-2 flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="btn btn-primary rounded-[10px] px-6 min-w-[100px]"
              >
                {isUpdatingProfile ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Location Section */}
      <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-base-content">Location</h2>
            <p className="text-sm text-muted">Help us provide location-specific health insights</p>
          </div>
        </div>

        {/* Location error alert */}
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

        {/* No address warning */}
        {location && !location.address && !isLocating && (
          <div className="alert alert-warning flex items-center gap-2 mb-4">
            <span>
              We couldn&apos;t retrieve the address for your location.
              Please enter it manually.
            </span>
          </div>
        )}

        <form onSubmit={form.handleSubmit(handleLocationSubmit)} className="grid gap-6 md:grid-cols-2">
          {/* Fixed: Barangay & City */}
          <div className="space-y-2">
            <label className="text-sm block font-medium text-base-content">
              City / Municipality
            </label>
            <Input
              value={FIXED_CITY}
              disabled
              className="bg-base-100 opacity-60 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm block font-medium text-base-content">
              Barangay
            </label>
            <Input
              value={FIXED_BARANGAY}
              disabled
              className="bg-base-100 opacity-60 cursor-not-allowed"
            />
          </div>

          {/* District / Zone */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm block font-medium text-base-content">
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
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm block font-medium text-base-content">
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

              {/* Minimap */}
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

          {/* Submit button */}
          <div className="md:col-span-2 pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || isLocating}
              className="btn btn-primary rounded-[10px] px-8"
            >
              {isSubmitting || isLocating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
