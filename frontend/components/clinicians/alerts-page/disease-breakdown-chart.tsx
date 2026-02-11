"use client";

import * as d3 from "d3";
import React, { useEffect, useRef } from "react";

interface DiseaseBreakdownChartProps {
  diseaseBreakdown: Record<string, number>;
}

const DISEASE_COLORS: Record<string, string> = {
  Dengue: "#f59e0b",
  Pneumonia: "#3b82f6",
  Typhoid: "#8b5cf6",
  Impetigo: "#10b981",
  Measles: "#ef4444",
  Influenza: "#06b6d4",
};

const DiseaseBreakdownChart: React.FC<DiseaseBreakdownChartProps> = ({
  diseaseBreakdown,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const entries = Object.entries(diseaseBreakdown).sort(
    ([, a], [, b]) => b - a,
  );

  useEffect(() => {
    if (!svgRef.current || entries.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 500;
    const height = Math.max(entries.length * 48 + 40, 160);
    const margin = { top: 16, right: 60, bottom: 16, left: 110 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const yScale = d3
      .scaleBand()
      .domain(entries.map(([d]) => d))
      .range([0, innerHeight])
      .padding(0.35);

    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(entries, ([, v]) => v) || 1])
      .range([0, innerWidth]);

    // Bars
    g.selectAll("rect")
      .data(entries)
      .join("rect")
      .attr("x", 0)
      .attr("y", ([d]) => yScale(d)!)
      .attr("height", yScale.bandwidth())
      .attr("rx", 6)
      .attr("fill", ([d]) => DISEASE_COLORS[d] || "#64748b")
      .attr("opacity", 0.85)
      .attr("width", 0)
      .transition()
      .duration(600)
      .delay((_, i) => i * 80)
      .ease(d3.easeCubicOut)
      .attr("width", ([, v]) => xScale(v));

    // Value labels
    g.selectAll(".val")
      .data(entries)
      .join("text")
      .attr("class", "val")
      .attr("x", ([, v]) => xScale(v) + 8)
      .attr("y", ([d]) => yScale(d)! + yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("fill", "currentColor")
      .attr("opacity", 0.7)
      .style("font-size", "13px")
      .style("font-weight", "600")
      .style("font-variant-numeric", "tabular-nums")
      .text(([, v]) => v);

    // Y-axis labels
    g.selectAll(".label")
      .data(entries)
      .join("text")
      .attr("class", "label")
      .attr("x", -12)
      .attr("y", ([d]) => yScale(d)! + yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .attr("fill", "currentColor")
      .attr("opacity", 0.8)
      .style("font-size", "13px")
      .style("font-weight", "500")
      .text(([d]) => d);
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="card border-base-300 bg-base-100 border">
        <div className="card-body">
          <h3 className="text-lg font-semibold">Anomalies by Disease</h3>
          <p className="text-muted text-sm">No anomaly data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-base-300 bg-base-100 border">
      <div className="card-body">
        <h3 className="text-lg font-semibold">Anomalies by Disease</h3>
        <p className="text-muted text-sm">
          Distribution of flagged anomalies across disease types
        </p>
        <div className="mt-2 w-full overflow-hidden">
          <svg
            ref={svgRef}
            className="w-full"
            style={{
              height: `${Math.max(entries.length * 48 + 40, 160)}px`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DiseaseBreakdownChart;
