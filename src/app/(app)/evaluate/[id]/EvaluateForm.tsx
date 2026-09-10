"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EvaluateForm({ ticketId }: { ticketId: number }) {
  const router = useRouter();
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/tickets/${ticketId}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, comment: comment || undefined }),
    });
    if (res.ok) {
      router.push(`/tickets/${ticketId}`);
      router.refresh();
    } else {
      setBusy(false);
      setErr("ส่งแบบประเมินไม่สำเร็จ");
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-5 card p-5 shadow-sm sm:p-7">
      <div>
        <span className="text-sm font-medium text-slate-700">ให้คะแนน</span>
        <div className="mt-1 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(n)}
              className={`h-10 w-10 rounded-lg text-lg transition ${
                n <= score ? "bg-brand text-white" : "bg-slate-100 text-slate-400 hover:bg-brand-weak hover:text-brand"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">ความเห็นเพิ่มเติม</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
      </label>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button
        disabled={busy}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        ส่งแบบประเมิน
      </button>
    </form>
  );
}
