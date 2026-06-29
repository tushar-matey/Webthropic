// import React from "react";
// import { CheckCircle2, Loader2, CircleDashed } from "lucide-react";
// import {StepType, type Step } from "../Types/types";

// interface StepsListProps {
//   steps: Step[];
// }

// const StatusIcon = ({ status }: { status: Step["status"] }) => {
//   switch (status) {
//     case "completed":
//       return (
//         <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
//       );

//     case "in-progress":
//       return (
//         <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />
//       );

//     default:
//       return (
//         <CircleDashed className="h-5 w-5 text-zinc-500 shrink-0" />
//       );
//   }
// };

// export default function StepsList({ steps }: StepsListProps) {
//   return (
//     <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
//       <div className="space-y-2">
//         {steps.map((step) => (
//           <div
//             key={step.id}
//             className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 transition hover:border-zinc-700"
//           >
//             <StatusIcon status={step.status} />

//             <span
//               className={`text-sm font-medium ${
//                 step.status === "completed"
//                   ? "text-zinc-400 line-through"
//                   : "text-zinc-100"
//               }`}
//             >
//               {step.title}
//             </span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

import React from "react";
import {
  CheckCircle2,
  Loader2,
  CircleDashed,
  Sparkles,
} from "lucide-react";
import type { Step } from "../Types/types";

interface StepsListProps {
  steps: Step[];
}

const StatusIcon = ({ status }: { status: Step["status"] }) => {
  switch (status) {
    case "completed":
      return (
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
      );

    case "in-progress":
      return (
        <Loader2 className="h-5 w-5 text-amber-500 animate-spin shrink-0" />
      );

    default:
      return (
        <CircleDashed className="h-5 w-5 text-stone-400 shrink-0" />
      );
  }
};

export default function StepsList({ steps }: StepsListProps) {
  // return (
  //   <div className="w-full overflow-hidden rounded-2xl border border-stone-800 bg-[#1f1d1b] shadow-xl">
  //     <div className="border-b border-stone-800 bg-[#262320] px-5 py-4">
  //       <div className="flex items-center gap-2">
  //         <Sparkles className="h-4 w-4 text-amber-400" />
  //         <h2 className="text-sm font-semibold text-stone-100">
  //           Agent Progress
  //         </h2>
  //       </div>
  //     </div>

  //     <div className="p-4">
  //       <div className="space-y-3">
  //         {steps.map((step, index) => (
  //           <div
  //             key={step.id}
  //             className={`group relative flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200
  //             ${
  //               step.status === "completed"
  //                 ? "border-emerald-900/50 bg-emerald-950/20"
  //                 : step.status === "in-progress"
  //                 ? "border-amber-900/50 bg-amber-950/20"
  //                 : "border-stone-800 bg-[#2a2724] hover:border-stone-700"
  //             }`}
  //           >
  //             {index !== steps.length - 1 && (
  //               <div className="absolute left-[21px] top-full h-3 w-px bg-stone-700" />
  //             )}

  //             <StatusIcon status={step.status} />

  //             <div className="flex-1">
  //               <p
  //                 className={`text-sm font-medium transition-colors
  //                 ${
  //                   step.status === "completed"
  //                     ? "text-stone-400"
  //                     : "text-stone-100"
  //                 }`}
  //               >
  //                 {step.title}
  //               </p>

  //               {step.description && (
  //                 <p className="mt-1 text-xs text-stone-500">
  //                   {step.description}
  //                 </p>
  //               )}
  //             </div>

  //             {step.status === "completed" && (
  //               <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
  //                 Done
  //               </span>
  //             )}

  //             {step.status === "in-progress" && (
  //               <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400">
  //                 Running
  //               </span>
  //             )}
  //           </div>
  //         ))}
  //       </div>
  //     </div>
  //   </div>
  // );
  return (
  <div className="h-full flex flex-col bg-slate-900 border-r border-slate-800">

    {/* Header */}
    <div className="h-12 px-4 flex items-center border-b border-slate-800 flex-shrink-0">
      <Sparkles className="h-4 w-4 text-blue-400 mr-2" />
      <h2 className="text-sm font-semibold text-slate-100">
        Agent Progress
      </h2>
    </div>

    {/* Steps */}
    <div className="flex-1 overflow-y-auto px-3 py-4">
      <div className="space-y-1">

        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`
              relative
              flex
              items-start
              gap-3
              rounded-lg
              px-3
              py-3
              transition-colors
              ${
                step.status === "completed"
                  ? "bg-slate-800/40"
                  : step.status === "in-progress"
                  ? "bg-blue-500/10"
                  : "hover:bg-slate-800/40"
              }
            `}
          >

            {/* Timeline */}
            <div className="relative flex flex-col items-center">

              <StatusIcon status={step.status} />

              {index !== steps.length - 1 && (
                <div className="mt-2 h-8 w-px bg-slate-700" />
              )}

            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">

              <div className="flex items-center justify-between gap-2">

                <p
                  className={`
                    text-sm
                    font-medium
                    truncate
                    ${
                      step.status === "completed"
                        ? "text-slate-300"
                        : step.status === "in-progress"
                        ? "text-white"
                        : "text-slate-400"
                    }
                  `}
                >
                  {step.title}
                </p>

                {step.status === "completed" && (
                  <span className="text-[11px] text-emerald-400">
                    Done
                  </span>
                )}

                {step.status === "in-progress" && (
                  <span className="text-[11px] text-blue-400 animate-pulse">
                    Running
                  </span>
                )}

              </div>

              {step.description && (
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  {step.description}
                </p>
              )}

            </div>

          </div>
        ))}

      </div>
    </div>

  </div>
);
}