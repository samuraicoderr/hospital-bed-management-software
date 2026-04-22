"use client";

import React from "react";
import appConfig, { type PlanType } from "@/lib/appconfig";

interface TemplateThumbnailProps {
  templateKey: string;
  planType: PlanType;
}

/**
 * Renders a mini visual preview representing the component layout
 * of each Bedflow plan template.
 */
export default function TemplateThumbnail({
  templateKey,
  planType,
}: TemplateThumbnailProps) {
  const colors = appConfig.planTypeColors[planType];

  switch (templateKey) {
    case "saas_operator":
      return (
        <div className="w-full h-full p-3 flex flex-col gap-1.5">
          {/* 4 KPI cards row */}
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-1 h-5 rounded-[3px]"
                style={{ backgroundColor: appConfig.componentTypeColors.kpi.bg }}
              />
            ))}
          </div>
          {/* Sheet + Chart row */}
          <div className="flex gap-1.5 flex-1">
            <div
              className="flex-1 rounded-[3px]"
              style={{ backgroundColor: appConfig.componentTypeColors.sheet.bg }}
            />
            <div
              className="flex-1 rounded-[3px]"
              style={{ backgroundColor: appConfig.componentTypeColors.chart.bg }}
            />
          </div>
          {/* Sheet + Statement row */}
          <div className="flex gap-1.5 flex-1">
            <div
              className="flex-1 rounded-[3px]"
              style={{ backgroundColor: appConfig.componentTypeColors.sheet.bg }}
            />
            <div
              className="flex-1 rounded-[3px]"
              style={{
                backgroundColor: appConfig.componentTypeColors.statement.bg,
              }}
            />
          </div>
        </div>
      );

    case "seed_round":
      return (
        <div className="w-full h-full p-3 flex flex-col gap-1.5">
          {/* 3 KPIs */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex-1 h-5 rounded-[3px]"
                style={{ backgroundColor: appConfig.componentTypeColors.kpi.bg }}
              />
            ))}
          </div>
          {/* 3 statements */}
          <div className="flex gap-1.5 flex-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex-1 rounded-[3px]"
                style={{
                  backgroundColor: appConfig.componentTypeColors.statement.bg,
                }}
              />
            ))}
          </div>
          {/* Chart */}
          <div
            className="h-8 rounded-[3px]"
            style={{ backgroundColor: appConfig.componentTypeColors.chart.bg }}
          />
        </div>
      );

    case "annual_plan":
      return (
        <div className="w-full h-full p-3 flex flex-col gap-1.5">
          {/* 4 KPIs */}
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-1 h-4 rounded-[3px]"
                style={{ backgroundColor: appConfig.componentTypeColors.kpi.bg }}
              />
            ))}
          </div>
          {/* 2 sheets side by side */}
          <div className="flex gap-1.5 flex-1">
            <div
              className="flex-1 rounded-[3px]"
              style={{ backgroundColor: appConfig.componentTypeColors.sheet.bg }}
            />
            <div
              className="flex-1 rounded-[3px]"
              style={{ backgroundColor: appConfig.componentTypeColors.sheet.bg }}
            />
          </div>
          {/* 2 charts + statement */}
          <div className="flex gap-1.5 flex-1">
            <div
              className="flex-1 rounded-[3px]"
              style={{ backgroundColor: appConfig.componentTypeColors.chart.bg }}
            />
            <div
              className="flex-1 rounded-[3px]"
              style={{ backgroundColor: appConfig.componentTypeColors.chart.bg }}
            />
            <div
              className="flex-1 rounded-[3px]"
              style={{
                backgroundColor: appConfig.componentTypeColors.statement.bg,
              }}
            />
          </div>
        </div>
      );

    case "board_meeting":
      return (
        <div className="w-full h-full p-3 flex flex-col gap-1.5">
          {/* 6 KPIs in 2 rows */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex-1 h-4 rounded-[3px]"
                style={{ backgroundColor: appConfig.componentTypeColors.kpi.bg }}
              />
            ))}
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex-1 h-4 rounded-[3px]"
                style={{ backgroundColor: appConfig.componentTypeColors.kpi.bg }}
              />
            ))}
          </div>
          {/* 2 statements + 2 charts */}
          <div className="flex gap-1.5 flex-1">
            <div
              className="flex-1 rounded-[3px]"
              style={{
                backgroundColor: appConfig.componentTypeColors.statement.bg,
              }}
            />
            <div
              className="flex-1 rounded-[3px]"
              style={{
                backgroundColor: appConfig.componentTypeColors.statement.bg,
              }}
            />
          </div>
          <div className="flex gap-1.5 flex-[0.8]">
            <div
              className="flex-1 rounded-[3px]"
              style={{ backgroundColor: appConfig.componentTypeColors.chart.bg }}
            />
            <div
              className="flex-1 rounded-[3px]"
              style={{ backgroundColor: appConfig.componentTypeColors.chart.bg }}
            />
          </div>
        </div>
      );

    case "growth_model":
      return (
        <div className="w-full h-full p-3 flex flex-col gap-1.5">
          {/* 3 KPIs */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex-1 h-5 rounded-[3px]"
                style={{ backgroundColor: appConfig.componentTypeColors.kpi.bg }}
              />
            ))}
          </div>
          {/* 2 sheets (base + bull scenarios) */}
          <div className="flex gap-1.5 flex-1">
            <div
              className="flex-1 rounded-[3px]"
              style={{ backgroundColor: appConfig.componentTypeColors.sheet.bg }}
            />
            <div
              className="flex-1 rounded-[3px]"
              style={{ backgroundColor: appConfig.componentTypeColors.sheet.bg }}
            />
          </div>
          {/* 2 forecast charts */}
          <div className="flex gap-1.5 flex-[0.7]">
            <div
              className="flex-1 rounded-[3px]"
              style={{ backgroundColor: appConfig.componentTypeColors.chart.bg }}
            />
            <div
              className="flex-1 rounded-[3px]"
              style={{ backgroundColor: appConfig.componentTypeColors.chart.bg }}
            />
          </div>
        </div>
      );

    case "pre_revenue":
      return (
        <div className="w-full h-full p-3 flex flex-col gap-1.5">
          {/* 3 KPIs */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex-1 h-5 rounded-[3px]"
                style={{ backgroundColor: appConfig.componentTypeColors.kpi.bg }}
              />
            ))}
          </div>
          {/* Sheet + Statement */}
          <div className="flex gap-1.5 flex-1">
            <div
              className="flex-1 rounded-[3px]"
              style={{ backgroundColor: appConfig.componentTypeColors.sheet.bg }}
            />
            <div
              className="flex-1 rounded-[3px]"
              style={{
                backgroundColor: appConfig.componentTypeColors.statement.bg,
              }}
            />
          </div>
          {/* Chart */}
          <div
            className="h-8 rounded-[3px]"
            style={{ backgroundColor: appConfig.componentTypeColors.chart.bg }}
          />
        </div>
      );

    default:
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
          <div className="w-8 h-8 rounded bg-gray-200" />
        </div>
      );
  }
}
