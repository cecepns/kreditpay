import { useEffect, useState } from "react";
import { get } from "@/utils/request";

export default function useFetch(url, params) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(params || {});

  useEffect(() => {
    let off = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    get(url, params)
      .then((res) => !off && setState({ data: res, loading: false, error: null }))
      .catch((e) => !off && setState((s) => ({ ...s, loading: false, error: e.message })));
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}
