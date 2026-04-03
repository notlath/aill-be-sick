"use client";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import type { DiseaseType } from "@/stores/use-selected-disease-store";

const DISEASES = [
  { value: "all", label: "All diseases" },
  { value: "Dengue", label: "Dengue" },
  { value: "Pneumonia", label: "Pneumonia" },
  { value: "Typhoid", label: "Typhoid" },
  { value: "Diarrhea", label: "Diarrhea" },
  { value: "Measles", label: "Measles" },
  { value: "Influenza", label: "Influenza" },
] as const;

interface DiseaseSelectProps {
  value: DiseaseType;
  onValueChange: (value: DiseaseType) => void;
  className?: string;
}

export function DiseaseSelect({
  value,
  onValueChange,
  className,
}: DiseaseSelectProps) {
  const handleChange = (newValue: string) => {
    onValueChange(newValue as DiseaseType);
  };

  return (
    <Select value={value} onValueChange={handleChange} className="w-full sm:w-[300px]">
      <SelectTrigger>
        <SelectValue placeholder="Select disease" />
      </SelectTrigger>
      <SelectContent>
        {DISEASES.map((disease) => (
          <SelectItem key={disease.value} value={disease.value}>
            {disease.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
