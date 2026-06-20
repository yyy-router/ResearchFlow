"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportActions() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="print:hidden gap-1.5"
    >
      <Download className="w-4 h-4" />
      <span>下载报告</span>
    </Button>
  );
}
