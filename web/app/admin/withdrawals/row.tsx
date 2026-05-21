"use client";
import { useRouter } from "next/navigation";

export default function WithdrawalRow({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  async function act(action: "approve" | "paid" | "reject") {
    const res = await fetch(`/api/admin/withdrawals/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) router.refresh();
  }
  return (
    <div className="flex gap-2">
      {status === "REQUESTED" && (
        <button className="btn-primary" onClick={() => act("approve")}>
          승인
        </button>
      )}
      {status === "APPROVED" && (
        <button className="btn-primary" onClick={() => act("paid")}>
          지급 완료
        </button>
      )}
      <button className="btn-danger" onClick={() => act("reject")}>
        거절
      </button>
    </div>
  );
}
