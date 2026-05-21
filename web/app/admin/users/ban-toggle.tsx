"use client";
import { useRouter } from "next/navigation";

export default function BanToggle({
  id,
  banned,
}: {
  id: string;
  banned: boolean;
}) {
  const router = useRouter();
  async function toggle() {
    const res = await fetch(`/api/admin/users/${id}/ban`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ banned: !banned }),
    });
    if (res.ok) router.refresh();
  }
  return (
    <button className={banned ? "btn-ghost" : "btn-danger"} onClick={toggle}>
      {banned ? "해제" : "차단"}
    </button>
  );
}
