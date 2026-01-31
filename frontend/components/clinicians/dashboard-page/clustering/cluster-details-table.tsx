"use client";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  User, MapPin,
  Calendar,
  Activity
} from "lucide-react";
import type { Patient, ClusterStatistics } from "@/types";

interface ClusterDetailsTableProps {
  patients: Patient[];
  nClusters: number;
  statistics: ClusterStatistics[];
}

const CLUSTER_THEMES = [
  {
    bg: "bg-blue-500/15",
    text: "text-blue-700",
    border: "border-blue-300/40",
    dot: "bg-blue-500",
  },
  {
    bg: "bg-emerald-500/15",
    text: "text-emerald-700",
    border: "border-emerald-300/40",
    dot: "bg-emerald-500",
  },
  {
    bg: "bg-purple-500/15",
    text: "text-purple-700",
    border: "border-purple-300/40",
    dot: "bg-purple-500",
  },
  {
    bg: "bg-orange-500/15",
    text: "text-orange-700",
    border: "border-orange-300/40",
    dot: "bg-orange-500",
  },
  {
    bg: "bg-pink-500/15",
    text: "text-pink-700",
    border: "border-pink-300/40",
    dot: "bg-pink-500",
  },
  {
    bg: "bg-indigo-500/15",
    text: "text-indigo-700",
    border: "border-indigo-300/40",
    dot: "bg-indigo-500",
  },
  {
    bg: "bg-cyan-500/15",
    text: "text-cyan-700",
    border: "border-cyan-300/40",
    dot: "bg-cyan-500",
  },
  {
    bg: "bg-rose-500/15",
    text: "text-rose-700",
    border: "border-rose-300/40",
    dot: "bg-rose-500",
  },
];

const ClusterDetailsTable: React.FC<ClusterDetailsTableProps> = ({
  patients,
  nClusters,
  statistics,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCluster, setSelectedCluster] = useState<string>("all");
  const [selectedDisease, setSelectedDisease] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  // Build a map: cluster_id -> dominant disease name
  const clusterNameMap: Record<number, string> = {};
  statistics.forEach((stat) => {
    const dist = stat.disease_distribution || {};
    const entries = Object.entries(dist).sort(
      (a, b) => b[1].percent - a[1].percent
    );
    const dominantDisease = entries.length > 0 ? entries[0][0] : null;
    clusterNameMap[stat.cluster_id] = dominantDisease
      ? `${stat.cluster_id + 1}. ${dominantDisease}`
      : `Cluster ${stat.cluster_id + 1}`;
  });

  // Get unique regions
  const uniqueRegions = Array.from(
    new Set(patients.map((p) => p.region).filter(Boolean))
  ).sort();
  const uniqueDiseases = Array.from(
    new Set(patients.map((p) => p.disease).filter(Boolean))
  ).sort() as string[];

  // Filter patients
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.city?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCluster =
      selectedCluster === "all" ||
      patient.cluster === parseInt(selectedCluster);
    const matchesRegion =
      selectedRegion === "all" || patient.region === selectedRegion;
    const matchesDisease =
      selectedDisease === "all" || patient.disease === selectedDisease;

    return matchesSearch && matchesCluster && matchesRegion && matchesDisease;
  });

  return (
    <Card className="group hover:border-primary/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 rounded-[12px]">
            <User className="size-6 text-primary stroke-[2]" />
          </div>
          <div>
            <CardTitle className="text-2xl tracking-tight">
              Patient Details by Cluster
            </CardTitle>
            <CardDescription className="mt-1">
              Detailed patient information with cluster assignments for
              population analysis
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6 p-5 bg-gradient-to-br from-base-200/40 to-base-200/20 backdrop-blur-sm rounded-[16px] border border-base-300/40 shadow-sm">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 size-5 text-base-content stroke-[2.5] transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search by name, email, or city..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchTerm(e.target.value)
              }
              className="pl-12 h-11 font-medium"
            />
          </div>

          <div className="dropdown dropdown-bottom w-full md:w-[220px]">
            <Select value={selectedCluster} onValueChange={setSelectedCluster}>
              <SelectTrigger className="h-11">
                <Filter className="size-4 text-muted" />
                <SelectValue placeholder="All Clusters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clusters</SelectItem>
                {Array.from({ length: nClusters }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {clusterNameMap[i] || `Cluster ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="dropdown dropdown-bottom w-full md:w-[220px]">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="h-11">
                <MapPin className="size-4 text-muted" />
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {uniqueRegions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="dropdown dropdown-bottom w-full md:w-[220px]">
            <Select value={selectedDisease} onValueChange={setSelectedDisease}>
              <SelectTrigger className="h-11">
                <Activity className="size-4 text-muted" />
                <SelectValue placeholder="All Diseases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Diseases</SelectItem>
                {uniqueDiseases.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-medium text-muted">
            Showing{" "}
            <span className="text-base-content font-semibold">
              {filteredPatients.length}
            </span>{" "}
            of {patients.length} patients
          </div>
          {filteredPatients.length !== patients.length && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCluster("all");
                setSelectedRegion("all");
                setSelectedDisease("all");
              }}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="border border-base-300/50 rounded-[14px] overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-br from-base-200/50 to-base-200/30 border-b-2 border-base-300/50 hover:bg-gradient-to-br hover:from-base-200/50 hover:to-base-200/30">
                <TableHead className="font-semibold text-sm text-base-content/80 uppercase tracking-wide">
                  Cluster
                </TableHead>
                <TableHead className="font-semibold text-sm text-base-content/80 uppercase tracking-wide">
                  Patient ID
                </TableHead>
                <TableHead className="font-semibold text-sm text-base-content/80 uppercase tracking-wide">
                  Demographics
                </TableHead>
                <TableHead className="font-semibold text-sm text-base-content/80 uppercase tracking-wide">
                  Latest Diagnosis
                </TableHead>
                <TableHead className="font-semibold text-sm text-base-content/80 uppercase tracking-wide">
                  Location
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-base-200/50 rounded-full flex items-center justify-center">
                        <Search className="size-8 text-muted" />
                      </div>
                      <p className="text-sm font-medium text-muted">
                        No patients found matching your filters
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatients.map((patient) => {
                  const theme =
                    CLUSTER_THEMES[patient.cluster % CLUSTER_THEMES.length];
                  return (
                    <TableRow
                      key={patient.id}
                      className="hover:bg-base-200/20 transition-colors border-b border-base-300/60"
                    >
                      <TableCell>
                        <Badge
                          className={`${theme.bg} ${theme.text} border ${theme.border} font-medium`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${theme.dot} mr-1.5`}
                          ></div>
                          {clusterNameMap[patient.cluster] ||
                            `Cluster ${patient.cluster + 1}`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="bg-base-200/50 p-2 rounded-[8px]">
                            <User className="size-3.5 text-muted" />
                          </div>
                          <span className="font-semibold font-mono text-xs text-base-content/80">
                            PT-{patient.id.toString().padStart(4, "0")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="size-3.5 text-muted" />
                            <span className="font-medium text-base-content">
                              {patient.age} years
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {patient.gender}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {patient.disease ? (
                          <Badge className="bg-primary/10 text-primary border-primary/30 font-medium">
                            {patient.disease}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted/40 font-light">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="size-3.5 text-muted" />
                            <span className="font-semibold text-base-content">
                              {patient.city}
                            </span>
                          </div>
                          <div className="text-muted text-xs ml-5">
                            {patient.region}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClusterDetailsTable;
