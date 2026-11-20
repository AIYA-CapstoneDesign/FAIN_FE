import { useQuery } from "@tanstack/react-query";
import { getUserInfo } from "../api/user";
import { useAppSelector } from "./useRedux";

// 보호자·환자 정보는 서버 데이터이므로 Redux가 아니라 TanStack Query 캐시로 관리한다.
// - 로그인 상태일 때만 조회
// - 정보 수정 후에는 이 키를 무효화해 최신 값으로 다시 받음
// - 로그아웃 시 queryClient.clear()로 함께 삭제 (localStorage에 남지 않음)
export const userInfoQueryKey = ["userInfo"] as const;

export const userInfoQuery = {
  queryKey: userInfoQueryKey,
  queryFn: getUserInfo,
  staleTime: 5 * 60 * 1000,
};

export default function useUserInfo() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  return useQuery({
    ...userInfoQuery,
    enabled: isAuthenticated,
  });
}
