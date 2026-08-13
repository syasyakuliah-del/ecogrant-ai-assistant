import { useState, type ReactNode } from "react";
import { Search, LayoutGrid, Table as TableIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AdminToolbar({
  query,
  onQueryChange,
  placeholder,
  children,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  placeholder: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9 text-sm"
          aria-label={placeholder}
        />
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}

export function AdminTable({
  headers,
  children,
  stickyFirstColumn = false,
}: {
  headers: string[];
  children: ReactNode;
  stickyFirstColumn?: boolean;
}) {
  return (
    <div className="surface-panel overflow-x-auto relative rounded-xl border">
      <Table className="w-full text-sm">
        <TableHeader className="bg-muted/50">
          <TableRow>
            {headers.map((h, i) => (
              <TableHead
                key={h}
                className={
                  i === 0 && stickyFirstColumn
                    ? "sticky left-0 bg-muted z-10 font-semibold"
                    : "font-semibold"
                }
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-12 text-center text-sm text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );
}

export function ResponsiveViewToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: "table" | "cards";
  onViewModeChange: (mode: "table" | "cards") => void;
}) {
  return (
    <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/20">
      <Button
        variant={viewMode === "table" ? "default" : "ghost"}
        size="icon"
        onClick={() => onViewModeChange("table")}
        className="size-7 text-xs"
        aria-label="Tampilan Tabel"
      >
        <TableIcon className="size-3.5" />
      </Button>
      <Button
        variant={viewMode === "cards" ? "default" : "ghost"}
        size="icon"
        onClick={() => onViewModeChange("cards")}
        className="size-7 text-xs"
        aria-label="Tampilan Kartu"
      >
        <LayoutGrid className="size-3.5" />
      </Button>
    </div>
  );
}
