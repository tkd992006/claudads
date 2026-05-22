"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawalRow({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "paid" | "reject") {
    setBusy(true);
    const res = await fetch(`/api/admin/withdrawals/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) router.refresh();
    else setBusy(false);
  }

  return (
    <div className="flex gap-2">
      {status === "REQUESTED" && (
        <button
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() => act("approve")}
        >
          승인
        </button>
      )}
      {status === "APPROVED" && (
        <button
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() => act("paid")}
        >
          지급 완료
        </button>
      )}
      <button
        className="btn btn-outline btn-error btn-sm"
        disabled={busy}
        onClick={() => act("reject")}
      >
        거절
      </button>
    </div>
  );
}
