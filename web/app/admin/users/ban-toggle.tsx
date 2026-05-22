"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BanToggle({
  id,
  banned,
}: {
  id: string;
  banned: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/admin/users/${id}/ban`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ banned: !banned }),
    });
    if (res.ok) router.refresh();
    else setBusy(false);
  }

  return (
    <button
      className={`btn btn-sm ${
        banned ? "btn-ghost border-white/10" : "btn-outline btn-error"
      }`}
      onClick={toggle}
      disabled={busy}
    >
      {busy && <span className="loading loading-spinner loading-xs" />}
      {banned ? "차단 해제" : "차단"}
    </button>
  );
}
