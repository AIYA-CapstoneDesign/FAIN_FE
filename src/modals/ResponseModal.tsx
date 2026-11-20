import Modal from "../components/common/Modal";
import { useNavigate, useParams } from "react-router-dom";
import { patchActionType } from "../api/emergency";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../api/queryConfig";

export default function ResponseModal() {
  const nav = useNavigate();
  const { reportId } = useParams<{ reportId: string }>();
  const queryClient = useQueryClient();

  const handleActionClick = async (actionType: "_119" | "FAMILY") => {
    try {
      const res = await patchActionType(Number(reportId), actionType);
      // 조치 방법이 바뀌면 히스토리(조치 표시)와 월간 통계(119·보호자 조치 횟수)가 달라짐
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.historyAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.monthAll }),
      ]);
      nav("/streaming");
      return res;
    } catch (error) {
      console.error("postActionType Error: ", error);
    }
  };

  return (
    <Modal
      contents="어떤 조치를 취하셨습니까?"
      btnList={[
        { label: "119 이송", onClick: () => handleActionClick("_119") },
        {
          label: "자체 조치",
          isCancel: true,
          onClick: () => handleActionClick("FAMILY"),
        },
      ]}
    />
  );
}
