"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MeetingRow } from "~/lib/dashboard-types";
import { DashboardStatusBadge } from "~/components/dashboard/dashboard-status-badge";
import { MeetingFlagsCell } from "~/components/dashboard/meeting-flags-cell";
import { DashboardCard } from "~/components/dashboard/dashboard-card";
import { SupersessionBadge } from "~/components/meetings/supersession-badge";

type DashboardMeetingTableProps = {
  totalMeetings: number;
  pendingReview: number;
  initialRows: MeetingRow[];
};

const TH =
  "px-[18px] py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-secondary border-b border-surface-border whitespace-nowrap";
const TD = "px-[18px] py-[11px] border-b border-surface-border whitespace-nowrap align-middle";

export function DashboardMeetingTable({
  totalMeetings,
  pendingReview,
  initialRows,
}: DashboardMeetingTableProps): React.JSX.Element {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    const processing = rows.filter(
      (m) => m.rawStatus === "PROCESSING" || m.rawStatus === "UPLOADING",
    );
    if (processing.length === 0) return;

    const id = window.setInterval(async () => {
      for (const meeting of processing) {
        try {
          const res = await fetch(`/api/meetings/${meeting.id}/status`);
          if (!res.ok) continue;
          const data: { status: string } = await res.json();
          if (data.status !== meeting.rawStatus) {
            router.refresh();
            return;
          }
        } catch {
          /* ignore */
        }
      }
    }, 5000);

    return () => window.clearInterval(id);
  }, [rows, router]);

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <DashboardCard
      title="Recent meetings"
      emphasized
      link={{ href: "/interaction-log", label: "View all" }}
      bodyClassName="px-0 pb-0 pt-2"
    >
      <p className="px-[18px] pb-1 text-[11px] text-text-secondary">
        {totalMeetings} meetings · {pendingReview} require your review
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className={`${TH} text-left`}>Client</th>
              <th className={`${TH} text-left`}>Type</th>
              <th className={`${TH} text-left`}>Date</th>
              <th className={`${TH} text-right`}>Flags</th>
              <th className={`${TH} text-left`}>Status</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const processing =
                row.rawStatus === "PROCESSING" || row.rawStatus === "UPLOADING";
              return (
                <tr
                  key={row.id}
                  className="group cursor-pointer last:[&>td]:border-b-0 hover:bg-surface-muted"
                  tabIndex={0}
                  onClick={() => router.push(`/meetings/${row.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(`/meetings/${row.id}`);
                  }}
                >
                  <td className={`${TD} font-semibold text-text-primary`}>
                    <div className="flex flex-col gap-1">
                      <span>{row.clientName}</span>
                      <SupersessionBadge
                        supersededById={row.supersededById}
                        supersedesId={row.supersedesId}
                      />
                    </div>
                  </td>
                  <td className={`${TD} text-text-secondary`}>{row.meetingType}</td>
                  <td className={`${TD} text-text-secondary`}>{dateFmt.format(new Date(row.date))}</td>
                  <td className={`${TD} text-right`}>
                    <MeetingFlagsCell flagCount={row.flagCount} />
                  </td>
                  <td className={TD}>
                    <DashboardStatusBadge
                      status={row.status}
                      label={row.statusLabel}
                      processing={processing}
                    />
                  </td>
                  <td className={TD}>
                    <Link
                      href={`/meetings/${row.id}`}
                      className="text-[12px] font-semibold text-brand opacity-0 transition group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}
