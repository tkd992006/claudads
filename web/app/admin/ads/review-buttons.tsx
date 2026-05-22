"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewButtons({ adId }: { adId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  async function act(action: "approve" | "reject") {
    setBusy(action);
    const res = await fetch(`/api/admin/ads/${adId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) router.refresh();
    else setBusy(null);
  }

  return (
    <div className="flex gap-2 pt-1">
      <button
        className="btn btn-primary btn-sm"
        disabled={busy !== null}
        onClick={() => act("approve")}
      >
        {busy === "approve" && (
          <span className="loading loading-spinner loading-xs" />
        )}
        승인
      </button>
      <button
        className="btn btn-outline btn-error btn-sm"
        disabled={busy !== null}
        onClick={() => act("reject")}
      >
        {busy === "reject" && (
          <span className="loading loading-spinner loading-xs" />
        )}
        반려
      </button>
    </div>
  );
}
