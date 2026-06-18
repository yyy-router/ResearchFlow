"use client";

import { useEffect, useState } from "react";

interface PlanLoadingProps {
  topic: string;
}

const STEPS = ["拆解调研主题", "分析子研究方向", "制定调研计划"];
const STEP_MS = 2500;

export function PlanLoading({ topic }: PlanLoadingProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, STEP_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-10 animate-in fade-in duration-500">
      <p className="text-sm text-muted-foreground">
        正在为 <span className="text-foreground font-medium">"{topic}"</span> 生成调研计划
      </p>

      <div className="flex items-center gap-1.5">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full transition-all duration-700 ${
                i < step
                  ? "bg-[#C41E3A]"
                  : i === step
                    ? "bg-[#C41E3A] animate-pulse"
                    : "bg-muted"
              }`}
            />
            <span
              className={`text-xs transition-colors duration-500 ${
                i <= step ? "text-muted-foreground" : "text-muted-foreground/30"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`w-6 h-px transition-colors duration-700 ${
                  i < step ? "bg-[#C41E3A]/40" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
