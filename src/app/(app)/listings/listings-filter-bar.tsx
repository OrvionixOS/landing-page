"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Download } from "lucide-react";

import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";

const STATUS_FILTERS = [
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "READY", label: "Ready" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "ALL", label: "All statuses" },
];

export function ListingsFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const status = searchParams.get("status") ?? "ACTIVE";
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParams(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value && value !== "ACTIVE") params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const exportHref = (format: "csv" | "json") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("format", format);
    return `/api/listings/export?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search listings…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => updateParams({ status: e.target.value })}
          className="flex h-10 shrink-0 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a href={exportHref("csv")} className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </a>
        <a href={exportHref("json")} className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <Download className="h-3.5 w-3.5" /> Export JSON
        </a>
      </div>
    </div>
  );
}
