"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Download } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  DataTable,
  type TableColumn,
} from "~/components/ui/data-table/index";
import {
  StatefulButton,
  pendingButtonState,
  type ButtonState,
} from "~/components/ui/stateful-button";

interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: any;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  meeting: {
    id: string;
    clientName: string;
    meetingDate: string;
  } | null;
}

interface AuditLogsClientProps {
  initialEvents: AuditEvent[];
  initialTotal: number;
  initialFilters: {
    userId: string;
    action: string;
    resourceType: string;
    dateFrom: string;
    dateTo: string;
  };
  error: string | null;
}

const getActionPillClass = (action: string) => {
  switch (action) {
    case "VIEW":
      return "bg-surface-muted text-text-primary border-surface-border";
    case "EDIT":
    case "UPLOAD":
    case "REMEDIATION_START":
      return "bg-info-bg text-info-text border-info-border";
    case "REMEDIATION_UPDATE":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "TASK_UPDATE":
    case "INVITE_RESENT":
      return "bg-warning-bg text-warning-text border-warning-border";
    case "EVIDENCE_ADD":
    case "WORKSPACE_CREATED":
      return "bg-teal-100 text-teal-800 border-teal-200";
    case "INVITE_SENT":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "INVITE_ACCEPTED":
    case "FINALIZE":
    case "VERIFICATION":
      return "bg-success-bg text-success-text border-success-border";
    case "EXPORT":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "DELETE":
    case "OVERRIDE":
    case "MEMBER_REMOVED":
      return "bg-danger-bg text-danger-text border-danger-border";
    default:
      return "bg-surface-muted text-text-primary border-surface-border";
  }
};

const getActionLabel = (action: string) => {
  switch (action) {
    case "UPLOAD":
      return "Upload";
    case "VIEW":
      return "View";
    case "EDIT":
      return "Edit";
    case "FINALIZE":
      return "Finalize";
    case "EXPORT":
      return "Export";
    case "DELETE":
      return "Delete";
    case "REMEDIATION_START":
      return "Remediation start";
    case "REMEDIATION_UPDATE":
      return "Remediation update";
    case "TASK_UPDATE":
      return "Task update";
    case "EVIDENCE_ADD":
      return "Evidence added";
    case "VERIFICATION":
      return "Verification";
    case "OVERRIDE":
      return "Override";
    case "WORKSPACE_CREATED":
      return "Workspace created";
    case "INVITE_SENT":
      return "Invite sent";
    case "INVITE_RESENT":
      return "Invite resent";
    case "INVITE_ACCEPTED":
      return "Invite accepted";
    case "MEMBER_REMOVED":
      return "Member removed";
    default:
      return action.replace(/_/g, " ").toLowerCase();
  }
};

const getMetadataSummary = (metadata: any) => {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  const items: string[] = [];
  if (metadata.action) items.push(String(metadata.action).replace(/_/g, " "));
  if (metadata.email) items.push(`email: ${metadata.email}`);
  if (metadata.role) items.push(`role: ${metadata.role}`);
  if (metadata.resolutionType) items.push(`resolution: ${metadata.resolutionType}`);
  if (metadata.status) items.push(`status: ${metadata.status}`);
  if (metadata.decision) items.push(`decision: ${metadata.decision}`);
  if (metadata.taskId) items.push(`task: ${metadata.taskId}`);
  if (metadata.evidenceId) items.push(`evidence: ${metadata.evidenceId}`);
  if (metadata.ipAddress) items.push(`ip: ${metadata.ipAddress}`);
  if (metadata.userAgent) items.push(`ua: ${String(metadata.userAgent).slice(0, 28)}...`);
  return items.length > 0 ? items.slice(0, 3).join(" • ") : null;
};

export default function AuditLogsClient({
  initialEvents,
  initialTotal,
  initialFilters,
  error,
}: AuditLogsClientProps) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [exportState, setExportState] = useState<ButtonState>("idle");

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });

    router.push(`/audit-logs?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({
      userId: "",
      action: "",
      resourceType: "",
      dateFrom: "",
      dateTo: "",
    });
    router.push("/audit-logs");
  };

  const handleExport = async (): Promise<void> => {
    setExportState("loading");
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      const response = await fetch(`/api/audit-logs/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to export audit logs");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setExportState("success");
      window.setTimeout(() => setExportState("idle"), 1500);
    } catch (err) {
      console.error("Error exporting audit logs:", err);
      alert("Failed to export audit logs. Please try again.");
      setExportState("error");
      window.setTimeout(() => setExportState("idle"), 2000);
    }
  };

  const columns = useMemo((): TableColumn<AuditEvent>[] => {
    return [
      {
        key: "timestamp",
        header: "Timestamp",
        sortable: true,
        width: "9rem",
        sortValue: (row) => row.timestamp,
        cell: (row) => (
          <span className="font-mono text-xs tabular-nums whitespace-nowrap">
            {new Date(row.timestamp).toLocaleString()}
          </span>
        ),
      },
      {
        key: "user",
        header: "User",
        width: "8rem",
        sortValue: (row) => row.user.name ?? row.user.email ?? row.user.id,
        cell: (row) => (
          <span className="text-sm whitespace-nowrap">
            {row.user.name || row.user.email || row.user.id}
          </span>
        ),
      },
      {
        key: "action",
        header: "Action",
        width: "7rem",
        sortValue: (row) => row.action,
        cell: (row) => (
          <Badge
            variant="outline"
            className={cn("whitespace-nowrap border", getActionPillClass(row.action))}
          >
            {getActionLabel(row.action)}
          </Badge>
        ),
      },
      {
        key: "resource",
        header: "Resource",
        width: "9rem",
        cell: (row) => (
          <div className="text-sm">
            <div className="font-medium">{row.resourceType}</div>
            <div className="max-w-[9rem] truncate font-mono text-xs text-muted-foreground">
              {row.resourceId}
            </div>
          </div>
        ),
      },
      {
        key: "meeting",
        header: "Meeting",
        width: "9rem",
        cell: (row) =>
          row.meeting ? (
            <div className="text-sm">
              <div className="font-medium">{row.meeting.clientName}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(row.meeting.meetingDate).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: "metadata",
        header: "Metadata",
        width: "12rem",
        cell: (row) =>
          row.metadata ? (
            <div className="space-y-1">
              {getMetadataSummary(row.metadata) ? (
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {getMetadataSummary(row.metadata)}
                </div>
              ) : null}
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  View metadata
                </summary>
                <pre className="mt-1 max-h-32 overflow-auto rounded border bg-muted p-2 text-xs">
                  {JSON.stringify(row.metadata, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ];
  }, []);

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="action">Action</Label>
              <Select
                value={filters.action || "all"}
                onValueChange={(value) => handleFilterChange("action", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="UPLOAD">Upload</SelectItem>
                  <SelectItem value="VIEW">View</SelectItem>
                  <SelectItem value="EDIT">Edit</SelectItem>
                  <SelectItem value="FINALIZE">Finalize</SelectItem>
                  <SelectItem value="EXPORT">Export</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="REMEDIATION_START">Remediation start</SelectItem>
                  <SelectItem value="REMEDIATION_UPDATE">Remediation update</SelectItem>
                  <SelectItem value="TASK_UPDATE">Task update</SelectItem>
                  <SelectItem value="EVIDENCE_ADD">Evidence added</SelectItem>
                  <SelectItem value="VERIFICATION">Verification</SelectItem>
                  <SelectItem value="OVERRIDE">Override</SelectItem>
                  <SelectItem value="WORKSPACE_CREATED">Workspace created</SelectItem>
                  <SelectItem value="INVITE_SENT">Invite sent</SelectItem>
                  <SelectItem value="INVITE_RESENT">Invite resent</SelectItem>
                  <SelectItem value="INVITE_ACCEPTED">Invite accepted</SelectItem>
                  <SelectItem value="MEMBER_REMOVED">Member removed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="resourceType">Resource Type</Label>
              <Input
                id="resourceType"
                value={filters.resourceType}
                onChange={(e) => handleFilterChange("resourceType", e.target.value)}
                placeholder="e.g., meeting"
              />
            </div>
            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
              Clear Filters
            </Button>
            <StatefulButton
              onClick={() => void handleExport()}
              state={exportState}
              loadingText="Exporting…"
              successText="Exported"
              errorText="Try again"
              disabled={exportState === "loading"}
              className="w-full sm:w-auto"
              icon={<Download className="h-4 w-4" aria-hidden />}
            >
              Export CSV
            </StatefulButton>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Audit Events ({initialTotal})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={initialEvents}
            columns={columns}
            getRowId={(row) => row.id}
            defaultSort={{ key: "timestamp", direction: "desc" }}
            rowHeight={64}
            height={560}
            overscan={8}
            emptyState="No audit events found matching your filters."
            className="rounded-md border"
          />
        </CardContent>
      </Card>
    </div>
  );
}

