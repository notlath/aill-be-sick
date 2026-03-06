"use client";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const DISEASES = [
  { value: "all", label: "All diseases" },
  { value: "Dengue", label: "Dengue" },
  { value: "Pneumonia", label: "Pneumonia" },
  { value: "Typhoid", label: "Typhoid" },
  { value: "Impetigo", label: "Impetigo" },
  { value: "Diarrhea", label: "Diarrhea" },
  { value: "Measles", label: "Measles" },
  { value: "Influenza", label: "Influenza" },
] as const;

interface DiseaseSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function DiseaseSelect({
  value,
  onValueChange,
  className,
}: DiseaseSelectProps) {
  return (
      <Select value={value} onValueChange={onValueChange} className="w-[300px]">
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
