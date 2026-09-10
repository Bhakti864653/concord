"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import RoundControl from "../dashboard/RoundControl";

type Report = {
  id: string;
  match_id: string;
  reported_by: string;
  message_id: string | null;
  kind: string;
  reason: string;
  created_at: string;
};

type MentorCapacity = {
  user_id: string;
  mentors_in: string;
  capacity: number;
  active_count: number;
};

type Dashboard = {
  round: { id: string; status: "preferences_open" | "preferences_locked" | "matching_in_progress" | "results_available" };
  reports: Report[];
  mentor_capacity: MentorCapacity[];
};

export default function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch("/admin/dashboard")
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail || `Failed (${res.status})`);
        setData(body as Dashboard);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Something went wrong."));
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Loading...</p>;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-sm font-medium text-muted">Matching round</h2>
        <RoundControl status={data.round.status} isAdmin={true} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted">
          Pending reports ({data.reports.length})
        </h2>
        {data.reports.length === 0 && (
          <p className="text-sm text-muted">No reports on file.</p>
        )}
        <div className="flex flex-col gap-2">
          {data.reports.map((r) => (
            <div
              key={r.id}
              className="concord-lift rounded-xl border border-line bg-paper-raised p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize text-ink">{r.kind.replace("_", " ")}</span>
                <span className="text-xs text-muted">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-ink">{r.reason}</p>
              <p className="mt-1 text-xs text-muted">
                Match {r.match_id.slice(0, 8)} - reported by {r.reported_by.slice(0, 8)}
                {r.message_id && ` - on message ${r.message_id.slice(0, 8)}`}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted">Mentor capacity</h2>
        <div className="flex flex-col gap-2">
          {data.mentor_capacity.map((m) => (
            <div
              key={m.user_id}
              className="concord-lift flex items-center justify-between rounded-xl border border-line bg-paper-raised p-3 text-sm"
            >
              <span className="text-ink">{m.mentors_in}</span>
              <span className="text-muted">
                {m.active_count}/{m.capacity} filled
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
