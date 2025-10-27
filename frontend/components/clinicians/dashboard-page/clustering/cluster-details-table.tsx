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
  User,
  Mail,
  MapPin,
  Calendar,
  Activity,
} from "lucide-react";
import type { Patient, ClusterStatistics } from "@/types/clustering";

interface ClusterDetailsTableProps {
  patients: Patient[];
  nClusters: number;
  statistics: ClusterStatistics[];
}

const CLUSTER_BADGE_COLORS = [
  "bg-blue-100 text-blue-700 hover:bg-blue-200",
  "bg-green-100 text-green-700 hover:bg-green-200",
  "bg-purple-100 text-purple-700 hover:bg-purple-200",
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-5" />
          Patient Details by Cluster
        </CardTitle>
        <CardDescription>
          Detailed patient information with cluster assignments for population
          analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or city..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchTerm(e.target.value)
              }
              className="pl-10"
            />
          </div>

          <Select value={selectedCluster} onValueChange={setSelectedCluster}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="size-4 mr-2" />
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

          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-full md:w-[200px]">
              <MapPin className="size-4 mr-2" />
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

          <Select value={selectedDisease} onValueChange={setSelectedDisease}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Activity className="size-4 mr-2" />
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

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredPatients.length} of {patients.length} patients
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Cluster</TableHead>
                <TableHead className="font-semibold">Patient ID</TableHead>
                <TableHead className="font-semibold">Demographics</TableHead>
                <TableHead className="font-semibold">
                  Latest Diagnosis
                </TableHead>
                <TableHead className="font-semibold">Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No patients found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatients.map((patient) => (
                  <TableRow key={patient.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Badge
                        className={
                          CLUSTER_BADGE_COLORS[
                            patient.cluster % CLUSTER_BADGE_COLORS.length
                          ]
                        }
                      >
                        {clusterNameMap[patient.cluster] ||
                          `Cluster ${patient.cluster + 1}`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-muted-foreground" />
                        <span className="font-medium font-mono text-xs">
                          PT-{patient.id.toString().padStart(4, "0")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="size-3 text-muted-foreground" />
                          <span>{patient.age} years</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {patient.gender}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {patient.disease ? (
                        <Badge variant="secondary" className="text-xs">
                          {patient.disease}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground" />
                          <span className="font-medium">{patient.city}</span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {patient.region}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClusterDetailsTable;
