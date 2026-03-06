"use client";

import { DiseaseSelect } from "./disease-select";
import { DateRangeFilter } from "./date-range-filter";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import dynamic from "next/dynamic";

const ChoroplethMap = dynamic(() => import("../map/choropleth-map"), { ssr: false });

const casesData: Record<string, number> = {
  "Parkwoods": 42,
  "Sitio Veterans": 18,
  "Spring Valley": 75,
  "Filinvest 2": 31,
  "Violago Homes": 60,
  "Filinvest Heights - Brookside": 22,
  "Sitio Bakal": 55,
  "Sugartowne": 14,
  "DSWD": 9,
  "Barangay Proper": 88,
  "Agri Land": 33,
  "Covenant Village": 47,
};

const ByDiseaseTab = () => {
  const [selectedDisease, setSelectedDisease] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-between sm:flex-row gap-4">
        <DiseaseSelect
          value={selectedDisease}
          onValueChange={setSelectedDisease}
        />
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>
      <div>
        <Card>
          <CardContent className="p-8">
            <ChoroplethMap casesData={casesData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ByDiseaseTab;