import HistoryMonthlyList from "./HistoryMonthlyList";
import { getHistoryList } from "../../api/history";
import { useQuery } from "@tanstack/react-query";
import { queryKeys, STALE_TIME } from "../../api/queryConfig";

export default function HistoryList() {
  const { data: historyList } = useQuery({
    queryKey: queryKeys.historyList(),
    queryFn: () => getHistoryList(),
    staleTime: STALE_TIME.history,
  });

  if (!Array.isArray(historyList) || historyList.length === 0) {
    return (
      <div className="text-placeholder body-m flex justify-center items-center pt-5">
        히스토리가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <HistoryMonthlyList list={historyList} />
    </div>
  );
}
