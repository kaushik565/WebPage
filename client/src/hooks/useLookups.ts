import { useQuery } from "@tanstack/react-query";
import { fetchLookups } from "../api.ts";

export const useLookups = () =>
  useQuery({
    queryKey: ["lookups"],
    queryFn: fetchLookups,
    staleTime: Infinity
  });
