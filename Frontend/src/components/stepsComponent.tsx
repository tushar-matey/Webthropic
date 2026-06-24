import React from "react";
import { CheckCircle2, Loader2, CircleDashed } from "lucide-react";
import {StepType, type Step } from "../Types/types";

interface StepsListProps {
  steps: Step[];
}

const StatusIcon = ({ status }: { status: Step["status"] }) => {
  switch (status) {
    case "completed":
      return (
        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
      );

    case "in-progress":
      return (
        <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />
      );

    default:
      return (
        <CircleDashed className="h-5 w-5 text-zinc-500 shrink-0" />
      );
  }
};

export default function StepsList({ steps }: StepsListProps) {
  return (
    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 transition hover:border-zinc-700"
          >
            <StatusIcon status={step.status} />

            <span
              className={`text-sm font-medium ${
                step.status === "completed"
                  ? "text-zinc-400 line-through"
                  : "text-zinc-100"
              }`}
            >
              {step.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

