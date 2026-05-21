"use client";
import { useRouter } from "next/navigation";

export default function ReviewButtons({ adId }: { adId: string }) {
  const router = useRouter();
  async function act(action: "approve" | "reject") {
    const res = await fetch(`/api/admin/ads/${adId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) router.refresh();
  }
  return (
    <div className="flex gap-2 pt-2">
      <button className="btn-primary" onClick={() => act("approve")}>
        승인
      </button>
      <button className="btn-danger" onClick={() => act("reject")}>
        반려
      </button>
    </div>
  );
}
