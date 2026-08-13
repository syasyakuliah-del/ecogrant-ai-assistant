import { useState, useEffect, useCallback, useMemo } from "react";

export type QueryStateOptions = {
  defaultPerPage?: number;
  defaultSortBy?: string;
  defaultSortOrder?: "asc" | "desc";
  defaultStatus?: string;
};

export type QueryState = {
  q: string;
  debouncedQ: string;
  page: number;
  perPage: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  status: string;
  dateFrom: string;
  dateTo: string;
  setQ: (v: string) => void;
  setPage: (v: number) => void;
  setPerPage: (v: number) => void;
  setSortBy: (v: string) => void;
  setSortOrder: (v: "asc" | "desc") => void;
  setStatus: (v: string) => void;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  resetFilters: () => void;
};

export function useQueryState(options: QueryStateOptions = {}): QueryState {
  const defaultPerPage = Math.min(Math.max(options.defaultPerPage ?? 20, 10), 100);
  const defaultSortBy = options.defaultSortBy ?? "created_at";
  const defaultSortOrder = options.defaultSortOrder ?? "desc";
  const defaultStatus = options.defaultStatus ?? "semua";

  const getUrlParams = useCallback(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const initialParams = getUrlParams();

  const [q, setQState] = useState<string>(initialParams.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState<string>(initialParams.get("q") ?? "");
  const [page, setPageState] = useState<number>(Number(initialParams.get("page") ?? 0));
  const [perPage, setPerPageState] = useState<number>(
    Math.min(Math.max(Number(initialParams.get("perPage") ?? defaultPerPage), 10), 100),
  );
  const [sortBy, setSortByState] = useState<string>(initialParams.get("sortBy") ?? defaultSortBy);
  const [sortOrder, setSortOrderState] = useState<"asc" | "desc">(
    (initialParams.get("sortOrder") as "asc" | "desc") ?? defaultSortOrder,
  );
  const [status, setStatusState] = useState<string>(initialParams.get("status") ?? defaultStatus);
  const [dateFrom, setDateFromState] = useState<string>(initialParams.get("dateFrom") ?? "");
  const [dateTo, setDateToState] = useState<string>(initialParams.get("dateTo") ?? "");

  // Debounce search query (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(q);
      setPageState(0);
    }, 350);
    return () => clearTimeout(handler);
  }, [q]);

  // Sync state to URL Search Params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (page > 0) params.set("page", String(page));
    if (perPage !== defaultPerPage) params.set("perPage", String(perPage));
    if (sortBy !== defaultSortBy) params.set("sortBy", sortBy);
    if (sortOrder !== defaultSortOrder) params.set("sortOrder", sortOrder);
    if (status !== defaultStatus) params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    const queryString = params.toString();
    const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [
    debouncedQ,
    page,
    perPage,
    sortBy,
    sortOrder,
    status,
    dateFrom,
    dateTo,
    defaultPerPage,
    defaultSortBy,
    defaultSortOrder,
    defaultStatus,
  ]);

  const setQ = useCallback((v: string) => setQState(v), []);
  const setPage = useCallback((v: number) => setPageState(v), []);
  const setPerPage = useCallback((v: number) => {
    const valid = Math.min(Math.max(v, 10), 100);
    setPerPageState(valid);
    setPageState(0);
  }, []);
  const setSortBy = useCallback((v: string) => {
    setSortByState(v);
    setPageState(0);
  }, []);
  const setSortOrder = useCallback((v: "asc" | "desc") => {
    setSortOrderState(v);
    setPageState(0);
  }, []);
  const setStatus = useCallback((v: string) => {
    setStatusState(v);
    setPageState(0);
  }, []);
  const setDateFrom = useCallback((v: string) => {
    setDateFromState(v);
    setPageState(0);
  }, []);
  const setDateTo = useCallback((v: string) => {
    setDateToState(v);
    setPageState(0);
  }, []);

  const resetFilters = useCallback(() => {
    setQState("");
    setDebouncedQ("");
    setPageState(0);
    setPerPageState(defaultPerPage);
    setSortByState(defaultSortBy);
    setSortOrderState(defaultSortOrder);
    setStatusState(defaultStatus);
    setDateFromState("");
    setDateToState("");
  }, [defaultPerPage, defaultSortBy, defaultSortOrder, defaultStatus]);

  return useMemo(
    () => ({
      q,
      debouncedQ,
      page,
      perPage,
      sortBy,
      sortOrder,
      status,
      dateFrom,
      dateTo,
      setQ,
      setPage,
      setPerPage,
      setSortBy,
      setSortOrder,
      setStatus,
      setDateFrom,
      setDateTo,
      resetFilters,
    }),
    [
      q,
      debouncedQ,
      page,
      perPage,
      sortBy,
      sortOrder,
      status,
      dateFrom,
      dateTo,
      setQ,
      setPage,
      setPerPage,
      setSortBy,
      setSortOrder,
      setStatus,
      setDateFrom,
      setDateTo,
      resetFilters,
    ],
  );
}
