"use client";

import * as d3 from "d3";
import React, { useEffect, useRef } from "react";

interface RegionBreakdownChartProps {
  regionBreakdown: Record<string, number>;
}

const RegionBreakdownChart: React.FC<RegionBreakdownChartProps> = ({
  regionBreakdown,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const entries = Object.entries(regionBreakdown).sort(
    ([, a], [, b]) => b - a,
  );

  useEffect(() => {
    if (!svgRef.current || entries.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 500;
    const height = Math.max(entries.length * 48 + 40, 160);
    const margin = { top: 16, right: 60, bottom: 16, left: 130 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const yScale = d3
      .scaleBand()
      .domain(entries.map(([r]) => r))
      .range([0, innerHeight])
      .padding(0.35);

    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(entries, ([, v]) => v) || 1])
      .range([0, innerWidth]);

    // Color scale
    const colorScale = d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0, d3.max(entries, ([, v]) => v) || 1]);

    // Bars
    g.selectAll("rect")
      .data(entries)
      .join("rect")
      .attr("x", 0)
      .attr("y", ([r]) => yScale(r)!)
      .attr("height", yScale.bandwidth())
      .attr("rx", 6)
      .attr("fill", ([, v]) => colorScale(v))
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
      .attr("y", ([r]) => yScale(r)! + yScale.bandwidth() / 2)
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
      .attr("y", ([r]) => yScale(r)! + yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .attr("fill", "currentColor")
      .attr("opacity", 0.8)
      .style("font-size", "13px")
      .style("font-weight", "500")
      .text(([r]) => (r.length > 18 ? r.slice(0, 16) + "…" : r));
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="card border-base-300 bg-base-100 border">
        <div className="card-body">
          <h3 className="text-lg font-semibold">Anomalies by Region</h3>
          <p className="text-muted text-sm">No region data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-base-300 bg-base-100 border">
      <div className="card-body">
        <h3 className="text-lg font-semibold">Anomalies by Region</h3>
        <p className="text-muted text-sm">
          Geographic distribution of flagged anomalies
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

export default RegionBreakdownChart;
