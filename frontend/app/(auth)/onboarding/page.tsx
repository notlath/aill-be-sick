"use client";

import { useMemo } from "react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/actions/onboarding";
import { Loader2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { OnboardingSchema } from "@/schemas/OnboardingSchema";

import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  REGIONS,
  PROVINCES,
  getAllMunicipalities,
  getBarangaysByMunicipality,
  getCityDisplayName,
  getLocationFromBarangay,
  getProvinceDisplayName,
  getProvincesByRegion,
} from "@/constants/locations";

type OnboardingFormValues = z.infer<typeof OnboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: {
      birthday: "",
      city: "",
      barangay: "",
      region: "",
      province: "",
      district: "",
    },
  });

  const selectedCity = form.watch("city");
  const selectedRegion = form.watch("region");

  // Get all municipalities (cities) for selection
  const allCities = useMemo(() => {
    return getAllMunicipalities();
  }, []);

  // Get barangays filtered by selected city
  const availableBarangays = useMemo(() => {
    return selectedCity ? getBarangaysByMunicipality(selectedCity) : [];
  }, [selectedCity]);

  // Get provinces filtered by selected region
  const availableProvinces = useMemo(() => {
    return selectedRegion ? getProvincesByRegion(selectedRegion) : PROVINCES;
  }, [selectedRegion]);

  // Handle city change - reset barangay and auto-fill location
  const handleCityChange = (val: string) => {
    form.setValue("city", val);
    form.setValue("barangay", "");
    form.setValue("region", "");
    form.setValue("province", "");
    form.setValue("district", "");
  };

  // Handle barangay change - auto-fill region and province
  const handleBarangayChange = (
    val: string,
    onChange: (val: string) => void,
  ) => {
    onChange(val);

    const locationData = getLocationFromBarangay(val, selectedCity);
    if (locationData) {
      form.setValue("region", locationData.region, { shouldDirty: true });
      form.setValue("province", locationData.province, { shouldDirty: true });
      if (locationData.district) {
        form.setValue("district", locationData.district, { shouldDirty: true });
      }
    }
  };

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
            // For developers, check their saved view preference
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

  return (
    <main className="flex bg-base-200 min-h-screen">
      {/* Left Column - Onboarding Form */}
      <section className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32 py-12 overflow-y-auto">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="space-y-3 lg:text-left text-center">
            <h1 className="text-4xl font-bold tracking-tight">
              Let's personalize your health journey
            </h1>
            <p className="text-muted text-base">
              Create your patient profile so we can keep track of your health
              history.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Birthday */}
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

              {/* Gender */}
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-base-content block">
                  Gender <span className="text-error">*</span>
                </label>
                <Controller
                  name="gender"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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

            <div className="grid gap-6 md:grid-cols-2">
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
                  <SelectTrigger className="w-full bg-base-100">
                    <SelectValue placeholder="Select your city or municipality" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCities.map((c) => (
                      <SelectItem
                        key={c.psgc}
                        value={c.name}
                        searchText={c.name}
                      >
                        {getCityDisplayName(c.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.city && (
                  <span className="text-error text-xs font-medium">
                    {form.formState.errors.city.message}
                  </span>
                )}
              </div>

              {/* Barangay */}
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-base-content block">
                  Barangay <span className="text-error">*</span>
                </label>
                <Controller
                  name="barangay"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) =>
                        handleBarangayChange(val, field.onChange)
                      }
                      showSearch
                    >
                      <SelectTrigger
                        className="w-full bg-base-100"
                        disabled={!selectedCity}
                      >
                        <SelectValue
                          placeholder={
                            selectedCity
                              ? "Select your barangay"
                              : "Select city first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBarangays.map((b) => (
                          <SelectItem key={b.psgc} value={b.name}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.barangay && (
                  <span className="text-error text-xs font-medium">
                    {form.formState.errors.barangay.message}
                  </span>
                )}
              </div>

              {/* Region - Dropdown with auto-fill and manual editing */}
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-base-content block">
                  Region <span className="text-error">*</span>
                </label>
                <Controller
                  name="region"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full bg-base-100">
                        <SelectValue placeholder="Select your region" />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map((r) => (
                          <SelectItem key={r.psgc} value={r.name}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.region && (
                  <span className="text-error text-xs font-medium">
                    {form.formState.errors.region.message}
                  </span>
                )}
              </div>

              {/* Province - Dropdown with auto-fill and manual editing */}
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-base-content block">
                  Province/District <span className="text-error">*</span>
                </label>
                <Controller
                  name="province"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full bg-base-100">
                        <SelectValue placeholder="Select your province or district" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProvinces.map((p) => (
                          <SelectItem key={p.psgc} value={p.name}>
                            {getProvinceDisplayName(p.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.province && (
                  <span className="text-error text-xs font-medium">
                    {form.formState.errors.province.message}
                  </span>
                )}
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
                  "Get Started"
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
