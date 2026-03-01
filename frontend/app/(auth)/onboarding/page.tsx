"use client";

import { useState, useMemo } from "react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/actions/onboarding";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import {
  REGIONS,
  getProvincesByRegion,
  getMunicipalitiesByProvince,
  getBarangaysByMunicipality,
} from "@/constants/locations";

export default function OnboardingPage() {
  const router = useRouter();

  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | "">("");

  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");

  const availableProvinces = useMemo(() => {
    return selectedRegion ? getProvincesByRegion(selectedRegion) : [];
  }, [selectedRegion]);

  const availableCities = useMemo(() => {
    return selectedProvince ? getMunicipalitiesByProvince(selectedProvince) : [];
  }, [selectedProvince]);

  const availableBarangays = useMemo(() => {
    return selectedCity ? getBarangaysByMunicipality(selectedCity) : [];
  }, [selectedCity]);

  // Handle cascaded resets
  const handleRegionChange = (val: string) => {
    setSelectedRegion(val);
    setSelectedProvince("");
    setSelectedCity("");
    setSelectedBarangay("");
  };

  const handleProvinceChange = (val: string) => {
    setSelectedProvince(val);
    setSelectedCity("");
    setSelectedBarangay("");
  };

  const handleCityChange = (val: string) => {
    setSelectedCity(val);
    setSelectedBarangay("");
  };

  const { execute: submitOnboarding, isExecuting } = useAction(completeOnboarding, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Onboarding completed!");
        router.push("/diagnosis");
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: () => {
      toast.error("An unexpected error occurred. Please try again later.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!birthday || !gender || !selectedRegion || !selectedProvince || !selectedCity || !selectedBarangay) {
      toast.error("Please fill in all the required fields.");
      return;
    }

    submitOnboarding({
      birthday,
      gender: gender as "MALE" | "FEMALE" | "OTHER",
      region: selectedRegion,
      province: selectedProvince,
      city: selectedCity,
      barangay: selectedBarangay,
    });
  };

  return (
    <main className="flex bg-base-200 min-h-screen">
      {/* Left Column - Onboarding Form */}
      <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32 py-12 overflow-y-auto">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="space-y-3 lg:text-left text-center">
            <h1 className="text-4xl font-bold tracking-tight">Complete Profile</h1>
            <p className="text-muted text-base">
              Please provide demographic and location details to help us offer better, localized epidemiological insights.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Birthday */}
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-base-content block">
                  Birthday <span className="text-error">*</span>
                </label>
                <Input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full bg-base-100"
                  required
                />
              </div>

              {/* Gender */}
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-base-content block">
                  Gender <span className="text-error">*</span>
                </label>
                <Select
                  value={gender}
                  onValueChange={(val) => setGender(val as any)}
                >
                  <SelectTrigger className="w-full bg-base-100">
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

            <div className="divider">Location Context</div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Region */}
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-base-content block">
                  Region <span className="text-error">*</span>
                </label>
                <Select value={selectedRegion} onValueChange={handleRegionChange} showSearch>
                  <SelectTrigger className="w-full bg-base-100">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r.psgc} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Province */}
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-base-content block">
                  Province <span className="text-error">*</span>
                </label>
                <Select
                  value={selectedProvince}
                  onValueChange={handleProvinceChange}
                  showSearch
                >
                  <SelectTrigger className="w-full bg-base-100" disabled={!selectedRegion}>
                    <SelectValue placeholder={selectedRegion ? "Select province" : "Select region"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProvinces.map((p) => (
                      <SelectItem key={p.psgc} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* City */}
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-base-content block">
                  City/Municipality <span className="text-error">*</span>
                </label>
                <Select
                  value={selectedCity}
                  onValueChange={handleCityChange}
                  showSearch
                >
                  <SelectTrigger className="w-full bg-base-100" disabled={!selectedProvince}>
                    <SelectValue placeholder={selectedProvince ? "Select city" : "Select province"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCities.map((c) => (
                      <SelectItem key={c.psgc} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Barangay */}
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-base-content block">
                  Barangay <span className="text-error">*</span>
                </label>
                <Select
                  value={selectedBarangay}
                  onValueChange={setSelectedBarangay}
                  showSearch
                >
                  <SelectTrigger className="w-full bg-base-100" disabled={!selectedCity}>
                    <SelectValue placeholder={selectedCity ? "Select brgy." : "Select city"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBarangays.map((b) => (
                      <SelectItem key={b.psgc} value={b.name}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isExecuting}
                className="btn btn-primary w-full h-12 rounded-xl text-base font-medium text-primary-content tracking-wide"
              >
                {isExecuting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Complete Onboarding"
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Right Column - Image */}
      <section className="hidden lg:block lg:flex-1 relative p-2 overflow-hidden bg-base-200">
        <img
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2940&auto=format&fit=crop"
          alt="Medical professional reviewing patient data"
          className="w-full h-full object-cover rounded-3xl opacity-90"
        />
      </section>
    </main>
  );
}
