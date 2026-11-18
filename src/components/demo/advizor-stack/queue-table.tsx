"use client";

import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { DEMO_BASE_PATH, type QueueItem } from "./demo-data";

function SeverityBadge({ severity }: { severity: QueueItem["severity"] }) {
  if (severity === "high") {
    return (
      <Badge className="border-warning-border bg-warning-bg text-warning-text">
        High
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-text-secondary">
      Medium
    </Badge>
  );
}

function SyncStatus({ status }: { status: QueueItem["syncStatus"] }) {
  return (
    <span
      className={cn(
        "text-[11px]",
        status === "pending" ? "text-warning-text" : "text-text-muted",
      )}
    >
      {status === "pending" ? "pending" : "synced"}
    </span>
  );
}

export function QueueTable({ items }: { items: QueueItem[] }) {
  const router = useRouter();

  const open = (id: string) => {
    router.push(`${DEMO_BASE_PATH}/queue/${id}`);
  };

  return (
    <div className="overflow-hidden rounded-lg border bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8" />
            <TableHead>Client · firm</TableHead>
            <TableHead className="hidden sm:table-cell">Severity</TableHead>
            <TableHead className="text-right">Hadrius sync</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              role="link"
              tabIndex={0}
              onClick={() => open(item.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  open(item.id);
                }
              }}
              className="cursor-pointer focus-visible:bg-surface-hover focus-visible:outline-none"
            >
              <TableCell className="align-top text-text-muted">
                {item.topRelationship ? (
                  <Star
                    className="h-4 w-4 fill-amber-400 text-warning-text"
                    aria-label="Top relationship"
                  />
                ) : (
                  <Star className="h-4 w-4 text-text-muted/50" aria-hidden />
                )}
              </TableCell>
              <TableCell className="max-w-0 whitespace-normal py-3">
                <div className="text-sm font-semibold">
                  {item.name} · {item.firm}
                </div>
                <div className="mt-0.5 text-xs text-text-secondary">
                  {item.reason}
                </div>
                <div className="mt-1.5 sm:hidden">
                  <SeverityBadge severity={item.severity} />
                </div>
              </TableCell>
              <TableCell className="hidden align-top sm:table-cell">
                <SeverityBadge severity={item.severity} />
              </TableCell>
              <TableCell className="align-top text-right">
                <SyncStatus status={item.syncStatus} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
