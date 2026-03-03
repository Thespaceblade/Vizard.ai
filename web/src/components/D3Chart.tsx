"use client";

import * as d3 from "d3";
import { useEffect, useRef } from "react";

const COLORS = ["#1e3a5f", "#0d9488", "#f97316", "#475569", "#1d4ed8"];

export interface D3ChartSpec {
  viz_type: string;
  x: string | null;
  y: string | null;
}

export interface D3ChartDatum {
  x?: string;
  y?: number;
  value?: number;
  color?: string;
}

interface D3ChartProps {
  spec: D3ChartSpec;
  data: D3ChartDatum[];
  width?: number;
  height?: number;
}

export function D3Chart({
  spec,
  data,
  width = 600,
  height = 360,
}: D3ChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 24, right: 24, bottom: 40, left: 48 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .style("max-width", "100%")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const type = spec.viz_type;

    if (type === "histogram") {
      const values = data.map((d) => d.value ?? 0).filter((v) => Number.isFinite(v));
      if (values.length === 0) return;
      const bins = d3.bin()(values);
      const xScale = d3
        .scaleLinear()
        .domain([bins[0].x0 ?? 0, bins[bins.length - 1].x1 ?? 1])
        .range([0, innerWidth]);
      const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(bins, (b) => b.length) ?? 1])
        .range([innerHeight, 0]);

      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickSizeOuter(0))
        .selectAll("text")
        .attr("fill", "#334155")
        .style("font-size", "11px");
      g.append("g")
        .call(d3.axisLeft(yScale).ticks(6).tickSizeOuter(0))
        .selectAll("text")
        .attr("fill", "#334155")
        .style("font-size", "11px");

      g.selectAll("rect")
        .data(bins)
        .join("rect")
        .attr("x", (d) => (d.x0 != null ? xScale(d.x0) + 1 : 0))
        .attr("y", (d) => yScale(d.length))
        .attr("width", (d) => Math.max(0, (d.x1 != null ? xScale(d.x1) : 0) - (d.x0 != null ? xScale(d.x0) : 0) - 1))
        .attr("height", (d) => innerHeight - yScale(d.length))
        .attr("fill", COLORS[0])
        .attr("opacity", 0.85);
      return;
    }

    const hasX = data.some((d) => d.x !== undefined && d.x !== "");
    const hasY = data.some((d) => d.y !== undefined && d.y !== null && Number.isFinite(d.y));
    if (!hasY) return;

    const xValues = data.map((d) => d.x ?? "");
    const yValues = data.map((d) => (d.y != null && Number.isFinite(d.y) ? d.y : 0));
    const isNumericX = xValues.every((v) => v !== "" && !Number.isNaN(Number(v)));

    let xScale: d3.ScaleBand<string> | d3.ScalePoint<string> | d3.ScaleLinear<number, number>;
    if (isNumericX && type === "scatter") {
      const nums = data.map((d) => Number(d.x) || 0);
      xScale = d3
        .scaleLinear()
        .domain([d3.min(nums) ?? 0, d3.max(nums) ?? 1])
        .range([0, innerWidth]);
    } else {
      const uniq = [...new Set(xValues)].filter(Boolean);
      xScale = (type === "scatter"
        ? d3.scalePoint().domain(uniq).range([0, innerWidth]).padding(0.5)
        : d3.scaleBand().domain(uniq).range([0, innerWidth]).padding(0.2)) as d3.ScaleBand<string> | d3.ScalePoint<string>;
    }

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(yValues) ?? 1])
      .nice()
      .range([innerHeight, 0]);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale as d3.AxisScale<string | number>).tickSizeOuter(0),
      )
      .selectAll("text")
      .attr("fill", "#334155")
      .style("font-size", "11px")
      .attr("transform", "rotate(-18)")
      .style("text-anchor", "end");
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(6).tickSizeOuter(0))
      .selectAll("text")
      .attr("fill", "#334155")
      .style("font-size", "11px");

    if (type === "bar") {
      g.selectAll("rect")
        .data(data)
        .join("rect")
        .attr("x", (d) => {
          const xVal = (d.x ?? "") as string;
          return (xScale as d3.ScaleBand<string>)(xVal) ?? 0;
        })
        .attr("y", (d) => yScale(d.y ?? 0))
        .attr("width", (xScale as d3.ScaleBand<string>).bandwidth?.() ?? 12)
        .attr("height", (d) => innerHeight - yScale(d.y ?? 0))
        .attr("fill", (_, i) => COLORS[i % COLORS.length])
        .attr("opacity", 0.9);
    } else if (type === "line") {
      const xAccess = (d: D3ChartDatum): number => {
        const xVal = d.x ?? "";
        const num = Number(xVal);
        if (Number.isFinite(num))
          return (xScale as d3.ScaleLinear<number, number>)(num);
        const band = xScale as d3.ScaleBand<string>;
        const pos = band(xVal as string);
        const bw = band.bandwidth?.();
        return pos != null ? pos + (bw != null ? bw / 2 : 0) : 0;
      };
      const line = d3
        .line<D3ChartDatum>()
        .x(xAccess)
        .y((d) => yScale(d.y ?? 0))
        .curve(d3.curveMonotoneX);
      const sorted = [...data].sort((a, b) => {
        const ax = a.x ?? "";
        const bx = b.x ?? "";
        const an = Number(ax);
        const bn = Number(bx);
        if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
        return String(ax).localeCompare(String(bx));
      });
      g.append("path")
        .datum(sorted)
        .attr("fill", "none")
        .attr("stroke", COLORS[0])
        .attr("stroke-width", 2)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", line);
      g.selectAll("circle")
        .data(sorted)
        .join("circle")
        .attr("cx", xAccess)
        .attr("cy", (d) => yScale(d.y ?? 0))
        .attr("r", 4)
        .attr("fill", COLORS[0]);
    } else {
      g.selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", (d) => {
          const xVal = d.x ?? "";
          const num = Number(xVal);
          if (Number.isFinite(num))
            return (xScale as d3.ScaleLinear<number, number>)(num);
          return (xScale as d3.ScalePoint<string>)(xVal as string) ?? 0;
        })
        .attr("cy", (d) => yScale(d.y ?? 0))
        .attr("r", 6)
        .attr("fill", (_, i) => COLORS[i % COLORS.length])
        .attr("opacity", 0.85)
        .attr("stroke", "#334155")
        .attr("stroke-width", 0.5);
    }
  }, [spec.viz_type, spec.x, spec.y, data, width, height]);

  if (!data.length) {
    return (
      <div className="flex h-[360px] items-center justify-center text-sm text-slate-gray/70">
        No data to display
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      className="overflow-visible"
      style={{ width: "100%", height: "auto", minHeight: height }}
    />
  );
}
