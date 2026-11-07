import { useEffect, useState } from "react";
import { get } from "@/utils/request";
import useDebounce from "@/hooks/useDebounce";

const EMPTY = { page: 1, limit: 10, total: 0, totalPages: 1 };

/** Pagination dari backend + search debounce 300ms + sorting. */
export default function usePaginated(url, { initialLimit = 10, params = {} } = {}) {
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(initialLimit);
  const [search, setSearchState] = useState("");
  const [sort, setSort] = useState({ sortBy: undefined, order: "desc" });
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ rows: [], pagination: EMPTY, loading: true, error: null });

  const debounced = useDebounce(search, 300);
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    let off = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    get(url, { page, limit, search: debounced || undefined, ...sort, ...params })
      .then((res) => !off && setState({ rows: res.data, pagination: res.pagination, loading: false, error: null }))
      .catch((e) => !off && setState((s) => ({ ...s, loading: false, error: e.message })));
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, page, limit, debounced, sort, paramsKey, tick]);

  return {
    ...state,
    page, setPage,
    limit, setLimit: (l) => { setLimitState(l); setPage(1); },
    search, setSearch: (s) => { setSearchState(s); setPage(1); },
    sort,
    toggleSort: (key) => {
      setSort((s) => ({ sortBy: key, order: s.sortBy === key && s.order === "asc" ? "desc" : "asc" }));
      setPage(1);
    },
    reload: () => setTick((t) => t + 1),
  };
}
