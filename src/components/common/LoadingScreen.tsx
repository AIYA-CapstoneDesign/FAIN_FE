import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const display = isFetching || isMutating ? "inherit" : "none";

  return (
    <div
      style={{
        position: "fixed",
        display,
        zIndex: 999,
        top: "45%",
        left: "45%",
      }}
    >
      <Loader2 color="#E57373" className="h-10 w-10 animate-spin" />
    </div>
  );
}
