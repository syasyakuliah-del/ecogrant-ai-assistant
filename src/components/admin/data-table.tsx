import { useState, type ReactNode } from "react";
import { Search, LayoutGrid, Table as TableIcon, ChevronLeft, ChevronRight } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export function AdminPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = "item",
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  itemLabel?: string;
}) {
  const startItem = totalItems === 0 ? 0 : page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalItems);

  return (
    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
      <div className="text-xs sm:text-sm">
        Menampilkan <span className="font-medium text-foreground">{startItem}</span> –{" "}
        <span className="font-medium text-foreground">{endItem}</span> dari{" "}
        <span className="font-medium text-foreground">{totalItems}</span> {itemLabel}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 w-full sm:w-auto">
        {/* Menu Dropdown Jumlah Item Per Halaman (10, 25, 50) */}
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm whitespace-nowrap">Item per halaman:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              onPageSizeChange(Number(v));
              onPageChange(0);
            }}
          >
            <SelectTrigger className="h-8 w-[72px] text-xs">
              <SelectValue placeholder={String(pageSize)} />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tombol Pengarah: Sebelumnya & Selanjutnya di pojok kanan bawah */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
            className="h-8 px-3 text-xs flex items-center gap-1 font-medium"
          >
            <ChevronLeft className="size-3.5" />
            <span>Sebelumnya</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={totalPages === 0 || page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
            className="h-8 px-3 text-xs flex items-center gap-1 font-medium"
          >
            <span>Selanjutnya</span>
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

