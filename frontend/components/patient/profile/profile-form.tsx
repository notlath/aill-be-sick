"use client";

import { useState, useRef, useEffect, useMemo, useCallback, useTransition } from "react";
import { User, Upload, Trash2, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { updateProfile, uploadAvatar, removeAvatar } from "@/actions/update-profile";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useAction } from "next-safe-action/hooks";
import Image from "next/image";
import {
  REGIONS,
  getProvincesByRegion,
  getMunicipalitiesByProvince,
  getBarangaysByMunicipality,
  getRegionName,
  getProvinceName,
  getMunicipalityName,
  getBarangayName,
} from "@/constants/locations";

interface ProfileState {
  name: string;
  email: string;
  avatar: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  barangay: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  birthday: string | null;
}

interface ProfileFormProps {
  user: ProfileState;
}

// Static JSX - extracted outside component to prevent recreation on each render
const LockIcon = () => (
  <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const gradientStyle = {
  backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')`,
} as const;

export default function ProfileForm({ user: initialUser }: ProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialUser.name || "");
  const [avatar, setAvatar] = useState<string | null>(initialUser.avatar);
  const [gender, setGender] = useState(initialUser.gender || "");
  const [birthday, setBirthday] = useState(initialUser.birthday || "");

  // Convert PSGC codes to names for display (database may store either)
  const [selectedRegion, setSelectedRegion] = useState(() => {
    if (!initialUser.region) return "";
    return getRegionName(initialUser.region) || initialUser.region;
  });

  const [selectedProvince, setSelectedProvince] = useState(() => {
    if (!initialUser.province) return "";
    return getProvinceName(initialUser.province) || initialUser.province;
  });

  const [selectedCity, setSelectedCity] = useState(() => {
    if (!initialUser.city) return "";
    return getMunicipalityName(initialUser.city) || initialUser.city;
  });

  const [selectedBarangay, setSelectedBarangay] = useState(() => {
    if (!initialUser.barangay) return "";
    return getBarangayName(initialUser.barangay) || initialUser.barangay;
  });

  // Cascading location selection using useMemo for performance
  const availableProvinces = useMemo(() => {
    return selectedRegion ? getProvincesByRegion(selectedRegion) : [];
  }, [selectedRegion]);

  const availableCities = useMemo(() => {
    return selectedProvince ? getMunicipalitiesByProvince(selectedProvince) : [];
  }, [selectedProvince]);

  const availableBarangays = useMemo(() => {
    return selectedCity ? getBarangaysByMunicipality(selectedCity) : [];
  }, [selectedCity]);

  // Reset dependent fields when parent changes (non-urgent updates wrapped in transition)
  useEffect(() => {
    startTransition(() => {
      if (!availableProvinces.some(p => p.name === selectedProvince)) {
        setSelectedProvince("");
      }
    });
  }, [selectedRegion, availableProvinces, selectedProvince]);

  useEffect(() => {
    startTransition(() => {
      if (!availableCities.some(c => c.name === selectedCity)) {
        setSelectedCity("");
      }
    });
  }, [selectedProvince, availableCities, selectedCity]);

  useEffect(() => {
    startTransition(() => {
      if (!availableBarangays.some(b => b.name === selectedBarangay)) {
        setSelectedBarangay("");
      }
    });
  }, [selectedCity, availableBarangays, selectedBarangay]);

  // Consolidated profile update action with unified success handler
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

  // Memoized event handlers to prevent unnecessary re-renders
  const handleNameSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    executeUpdateProfile({
      name: formData.get("name") as string,
      region: selectedRegion || undefined,
      province: selectedProvince || undefined,
      city: selectedCity || undefined,
      barangay: selectedBarangay || undefined,
      gender: gender || undefined,
      birthday: birthday || undefined,
    });
  }, [executeUpdateProfile, selectedRegion, selectedProvince, selectedCity, selectedBarangay, gender, birthday]);

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

  const handleLocationSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    executeUpdateProfile({
      name,
      region: selectedRegion || undefined,
      province: selectedProvince || undefined,
      city: selectedCity || undefined,
      barangay: selectedBarangay || undefined,
      gender: gender || undefined,
      birthday: birthday || undefined,
    });
  }, [executeUpdateProfile, name, selectedRegion, selectedProvince, selectedCity, selectedBarangay, gender, birthday]);

  return (
    <main className="space-y-10 mx-auto p-8 pt-12 max-w-4xl">
      <div className="space-y-2">
        <h1 className="mb-1 font-semibold text-base-content text-4xl tracking-tight">
          Profile Settings
        </h1>
        <p className="text-muted text-lg">
          Manage your personal information and preferences
        </p>
      </div>

      {/* Profile Card */}
      <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Header with gradient */}
        <div className="relative h-32 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20">
          <div className="absolute inset-0 opacity-40" style={gradientStyle} />
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
            <div  className="space-y-2">
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
              <Select className="w-full" value={gender} onValueChange={setGender}>
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
              <Input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                placeholder="Select birthday"
                className="w-full"
              />
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

        <form onSubmit={handleLocationSubmit} className="grid gap-6 md:grid-cols-2">
          {/* Region */}
          <div className="space-y-2">
            <label className="text-sm block font-medium text-base-content">
              Region
            </label>
            <Select className="w-full" value={selectedRegion} onValueChange={setSelectedRegion} showSearch>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((region) => (
                  <SelectItem key={region.psgc} value={region.name}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Province */}
          <div className="space-y-2">
            <label className="text-sm block font-medium text-base-content">
              Province
            </label>
            <Select className="w-full" value={selectedProvince} onValueChange={setSelectedProvince} showSearch>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={selectedRegion ? "Select province" : "Select region first"} />
              </SelectTrigger>
              <SelectContent>
                {availableProvinces.map((province) => (
                  <SelectItem key={province.psgc} value={province.name}>
                    {province.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City/Municipality */}
          <div className="space-y-2">
            <label className="text-sm block font-medium text-base-content">
              City/Municipality
            </label>
            <Select className="w-full" value={selectedCity} onValueChange={setSelectedCity} showSearch>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={selectedProvince ? "Select city/municipality" : "Select province first"} />
              </SelectTrigger>
              <SelectContent>
                {availableCities.map((city) => (
                  <SelectItem key={city.psgc} value={city.name}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Barangay */}
          <div className="space-y-2">
            <label className="text-sm block font-medium text-base-content">
              Barangay
            </label>
            <Select className="w-full" value={selectedBarangay} onValueChange={setSelectedBarangay} showSearch>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={selectedCity ? "Select barangay" : "Select city/municipality first"} />
              </SelectTrigger>
              <SelectContent>
                {availableBarangays.map((barangay) => (
                  <SelectItem key={barangay.psgc} value={barangay.name}>
                    {barangay.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit button */}
          <div className="md:col-span-2 pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="btn btn-primary rounded-[10px] px-8"
            >
              {isUpdatingProfile ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
