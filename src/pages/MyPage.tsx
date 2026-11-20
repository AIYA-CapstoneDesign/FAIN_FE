import Box from "../components/common/Box";
import InfoBox from "../components/mypage/InfoBox";
import {
  GUARDIAN_INFO_CONFIG,
  PATIENT_INFO_CONFIG,
  UNIT_MAP,
} from "../type/userType";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../app/authSlice";
import { useAppDispatch } from "../hooks/useRedux";
import { useQueryClient } from "@tanstack/react-query";
import useUserInfo from "../hooks/useUserInfo";
import SideHeader from "../components/common/SideHeader";
import { resetStore } from "../app/store";

export default function MyPage() {
  const nav = useNavigate();
  const dispatch = useAppDispatch();

  const queryClient = useQueryClient();
  const { data: userInfo } = useUserInfo();

  const handleLogout = () => {
    dispatch(clearToken());
    queryClient.clear(); // 보호자·환자 정보 등 서버 데이터 캐시 삭제
    resetStore();
    nav("/login");
  };

  if (!userInfo) return null;
  const { guardian, patient } = userInfo;

  return (
    <>
      <SideHeader title="마이페이지" />
      <div className="flex flex-col px-10 gap-6 pb-2">
        <Box>
          <InfoBox
            title="보호자 정보"
            config={GUARDIAN_INFO_CONFIG}
            data={guardian}
            editable
            onEdit={() => nav("/edit/guardian")}
          />
        </Box>
        <Box>
          <InfoBox
            title="환자 정보"
            config={PATIENT_INFO_CONFIG}
            data={patient}
            unitMap={UNIT_MAP}
            editable
            onEdit={() => nav("/edit/patient")}
          />
        </Box>
        <button
          className="text-placeholder body-xs-bold underline"
          onClick={handleLogout}
        >
          로그아웃
        </button>
      </div>
    </>
  );
}
