"use client";

import Link from "next/link";
import { useState } from "react";
import { History, Settings, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigDialog } from "./config-dialog";
import { useConfig } from "./config-provider";

export function Header() {
  const [configOpen, setConfigOpen] = useState(false);
  const { isConfigured } = useConfig();

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-14 px-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <BookOpen className="w-5 h-5" />
            <span className="font-serif font-semibold text-lg tracking-tight">ResearchFlow</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link href="/history" className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[0.8rem] rounded-md hover:bg-muted hover:text-foreground transition-colors">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">历史</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfigOpen(true)}
              className="relative"
            >
              <Settings className="w-4 h-4" />
              <span className="ml-1.5 hidden sm:inline">配置</span>
              {!isConfigured && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#C41E3A]" />
              )}
            </Button>
          </nav>
        </div>
      </header>
      <ConfigDialog open={configOpen} onOpenChange={setConfigOpen} />
    </>
  );
}
