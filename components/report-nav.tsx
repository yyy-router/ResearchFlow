"use client";

import { useEffect, useState } from "react";

interface TocItem { id: string; text: string; level: number }

export function ReportNav() {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const headings = document.querySelectorAll("article h1, article h2, article h3");
    const toc: TocItem[] = [];
    headings.forEach((h) => {
      if (h.id) {
        toc.push({ id: h.id, text: h.textContent ?? "", level: Number(h.tagName[1]) });
      }
    });
    setItems(toc);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;

  return (
    <nav className="space-y-0.5 text-sm">
      <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-2">
        目录
      </h4>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`block py-1 transition-colors hover:text-foreground ${
            item.level === 2 ? "pl-3" : item.level === 3 ? "pl-6" : ""
          } ${
            activeId === item.id
              ? "text-[#C41E3A] font-medium"
              : "text-muted-foreground"
          }`}
        >
          {item.text}
        </a>
      ))}
    </nav>
  );
}
