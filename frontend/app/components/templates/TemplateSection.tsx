"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import appConfig from "@/lib/appconfig";
import TemplateCard from "./TemplateCard";

export default function TemplateSection() {
  const templates = appConfig.templates;

  return (
    <section className="mb-8 sm:mb-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800">
          Start from a template
        </h2>
        <button className="flex items-center gap-1 text-sm font-medium text-[#0F6E56] hover:text-[#0a5a44] transition-colors group">
          <span className="hidden sm:inline">Browse all templates</span>
          <span className="sm:hidden">Browse all</span>
          <ArrowRight
            size={14}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </button>
      </div>

      {/* Template carousel */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0">
        {/* Blank plan card */}
        <TemplateCard
          templateKey="blank"
          title="Blank plan"
          description=""
          planType="operator"
          componentCount={0}
          isBlank
        />

        {/* Featured templates */}
        {templates.map((template) => (
          <TemplateCard
            key={template.key}
            templateKey={template.key}
            title={template.name}
            description={template.description}
            planType={template.planType}
            componentCount={template.componentCount}
          />
        ))}
      </div>
    </section>
  );
}
