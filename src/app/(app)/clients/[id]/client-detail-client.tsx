"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Hash,
  History,
  Mail,
  Users,
} from "lucide-react";
import { toast } from "~/lib/toast";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { ClientDetailDto, ClientListItemDto } from "~/lib/types/clients";

type ClientDetailClientProps = {
  detail: ClientDetailDto;
  canEdit: boolean;
};

function directionLabel(direction: string | null): string {
  if (direction === "OUTBOUND") return "Sent";
  if (direction === "INTERNAL") return "Internal";
  return "Received";
}

function shortHash(hash: string | null): string {
  if (!hash) return "—";
  return `${hash.slice(0, 8)}…`;
}

type DialogMode =
  | null
  | { type: "add_member" }
  | { type: "link_member" }
  | { type: "add_alias"; targetClientId: string; targetName: string }
  | { type: "remove_member"; membershipId: string; name: string }
  | { type: "remove_alias"; aliasId: string; address: string };

export function ClientDetailClient({
  detail,
  canEdit,
}: ClientDetailClientProps): React.JSX.Element {
  const router = useRouter();
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const [dialog, setDialog] = useState<DialogMode>(null);
  const [clients, setClients] = useState<ClientListItemDto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState<"SPOUSE" | "JOINT">("SPOUSE");
  const [peerClientId, setPeerClientId] = useState("");
  const [aliasAddress, setAliasAddress] = useState("");
  const [historicalCount, setHistoricalCount] = useState<number | null>(null);

  useEffect(() => {
    if (!canEdit) return;
    void fetch("/api/clients")
      .then((r) => r.json())
      .then((json: { success: boolean; data?: ClientListItemDto[] }) => {
        if (json.success && json.data) setClients(json.data);
      });
  }, [canEdit]);

  async function postHousehold(body: Record<string, unknown>): Promise<{
    success: boolean;
    error?: string;
    data?: { historicalThreadCount?: number; threadsUpdated?: number; evidenceAttached?: number };
  }> {
    const res = await fetch(`/api/clients/${detail.id}/household`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as {
      success: boolean;
      error?: string;
      data?: {
        historicalThreadCount?: number;
        threadsUpdated?: number;
        evidenceAttached?: number;
      };
    };
  }

  async function previewAlias(): Promise<void> {
    if (!aliasAddress.includes("@")) return;
    const json = await postHousehold({
      action: "preview_alias",
      address: aliasAddress.trim(),
    });
    if (json.success && json.data?.historicalThreadCount != null) {
      setHistoricalCount(json.data.historicalThreadCount);
    }
  }

  async function submitDialog(): Promise<void> {
    if (!dialog) return;
    setSubmitting(true);

    if (dialog.type === "add_member") {
      const json = await postHousehold({
        action: "create_member",
        name: memberName,
        role: memberRole,
      });
      setSubmitting(false);
      if (!json.success) {
        toast.error(json.error ?? "Failed");
        return;
      }
      toast.success("Household member added");
      setDialog(null);
      setMemberName("");
      router.refresh();
      return;
    }

    if (dialog.type === "link_member") {
      const json = await postHousehold({
        action: "link_member",
        peerClientId,
        role: memberRole,
      });
      setSubmitting(false);
      if (!json.success) {
        toast.error(json.error ?? "Failed");
        return;
      }
      toast.success("Client linked to household");
      setDialog(null);
      setPeerClientId("");
      router.refresh();
      return;
    }

    if (dialog.type === "add_alias") {
      const json = await postHousehold({
        action: "add_alias",
        address: aliasAddress.trim(),
        targetClientId: dialog.targetClientId,
      });
      setSubmitting(false);
      if (!json.success) {
        toast.error(json.error ?? "Failed");
        return;
      }
      const threads = json.data?.threadsUpdated ?? 0;
      const evidence = json.data?.evidenceAttached ?? 0;
      toast.success(
        `Address added. ${threads} thread${threads === 1 ? "" : "s"} updated; ${evidence} message${evidence === 1 ? "" : "s"} attached.`
      );
      setDialog(null);
      setAliasAddress("");
      setHistoricalCount(null);
      router.refresh();
      return;
    }

    if (dialog.type === "remove_member") {
      const json = await postHousehold({
        action: "remove_member",
        membershipId: dialog.membershipId,
      });
      setSubmitting(false);
      if (!json.success) {
        toast.error(json.error ?? "Failed");
        return;
      }
      toast.success("Member removed from household. Historical correspondence stays attached.");
      setDialog(null);
      router.refresh();
      return;
    }

    if (dialog.type === "remove_alias") {
      const json = await postHousehold({
        action: "remove_alias",
        aliasId: dialog.aliasId,
      });
      setSubmitting(false);
      if (!json.success) {
        toast.error(json.error ?? "Failed");
        return;
      }
      toast.success(
        "Address unlinked. Historical correspondence stays attached; future mail will not auto-match."
      );
      setDialog(null);
      router.refresh();
    }
  }

  const linkableClients = clients.filter(
    (c) =>
      c.id !== detail.id &&
      !detail.householdMembers.some((m) => m.clientId === c.id)
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:underline">
            Clients
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-text-primary">{detail.name}</span>
        </p>
        <h1 className="text-2xl font-semibold text-text-primary">{detail.name}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">{detail.status}</Badge>
          <span>
            Last contact:{" "}
            {detail.lastContactAt
              ? dateFmt.format(new Date(detail.lastContactAt))
              : "—"}
          </span>
          <span>
            Correspondence ({detail.periodLabel}): {detail.correspondenceCountPeriod}
          </span>
        </div>
      </header>

      <section className="space-y-3" aria-labelledby="household-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="household-heading"
            className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground"
          >
            <Users className="h-[15px] w-[15px]" aria-hidden />
            Household
          </h2>
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMemberName("");
                  setMemberRole("SPOUSE");
                  setDialog({ type: "add_member" });
                }}
              >
                Add member
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPeerClientId("");
                  setMemberRole("SPOUSE");
                  setDialog({ type: "link_member" });
                }}
              >
                Link existing client
              </Button>
              <Button
                size="sm"
                className="bg-brand text-text-primary"
                onClick={() => {
                  setAliasAddress("");
                  setHistoricalCount(null);
                  setDialog({
                    type: "add_alias",
                    targetClientId: detail.id,
                    targetName: detail.name,
                  });
                }}
              >
                Add email address
              </Button>
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Email addresses</TableHead>
                {canEdit ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{detail.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">primary</Badge>
                </TableCell>
                <TableCell>
                  {detail.emailAddresses.length === 0 ? (
                    <span className="text-sm text-muted-foreground">None</span>
                  ) : (
                    <ul className="space-y-1">
                      {detail.emailAddresses.map((a) => (
                        <li
                          key={a.id}
                          className="flex flex-wrap items-center gap-2 font-mono text-xs"
                        >
                          {a.address}
                          {canEdit ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() =>
                                setDialog({
                                  type: "remove_alias",
                                  aliasId: a.id,
                                  address: a.address,
                                })
                              }
                            >
                              Remove
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
                {canEdit ? <TableCell /> : null}
              </TableRow>
              {detail.householdMembers.map((m) => (
                <TableRow key={m.membershipId}>
                  <TableCell>
                    <Link
                      href={`/clients/${m.clientId}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {m.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{m.role.toLowerCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    {m.emailAddresses.length === 0 ? (
                      <span className="text-sm text-muted-foreground">None</span>
                    ) : (
                      <ul className="space-y-1">
                        {m.emailAddresses.map((a) => (
                          <li
                            key={a.id}
                            className="flex flex-wrap items-center gap-2 font-mono text-xs"
                          >
                            {a.address}
                            {canEdit ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() =>
                                  setDialog({
                                    type: "remove_alias",
                                    aliasId: a.id,
                                    address: a.address,
                                  })
                                }
                              >
                                Remove
                              </Button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  {canEdit ? (
                    <TableCell className="space-x-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAliasAddress("");
                          setHistoricalCount(null);
                          setDialog({
                            type: "add_alias",
                            targetClientId: m.clientId,
                            targetName: m.name,
                          });
                        }}
                      >
                        Add email
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDialog({
                            type: "remove_member",
                            membershipId: m.membershipId,
                            name: m.name,
                          })
                        }
                      >
                        Remove
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {detail.householdMembers.length === 0 && detail.emailAddresses.length === 0 ? (
            <p className="border-t px-5 py-4 text-sm text-muted-foreground">
              No household members yet. Link a spouse or joint holder, or add an email
              address.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="correspondence-heading">
        <h2
          id="correspondence-heading"
          className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground"
        >
          <History className="h-[15px] w-[15px]" aria-hidden />
          Correspondence
        </h2>

        {detail.correspondence.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
            No email correspondence yet. Synced threads for this client appear here
            automatically.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direction</TableHead>
                  <TableHead>Counterparties</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.correspondence.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        {row.direction === "OUTBOUND" ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-text-secondary" aria-hidden />
                        ) : (
                          <ArrowDownLeft className="h-3.5 w-3.5 text-text-secondary" aria-hidden />
                        )}
                        {directionLabel(row.direction)}
                        {row.viaHouseholdMember && row.memberClientName ? (
                          <Badge variant="outline" className="ml-1 font-normal">
                            via {row.memberClientName}
                          </Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate font-mono text-xs">
                      {row.counterparties.join(", ") || "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden />
                        {row.title ?? "(no subject)"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {dateFmt.format(new Date(row.occurredAt))}
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground"
                        title={row.contentSha256 ?? undefined}
                      >
                        <Hash className="h-3 w-3" aria-hidden />
                        {shortHash(row.contentSha256)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.threadId ? (
                        <Link
                          href={`/communications/threads/${row.threadId}`}
                          className="text-sm font-semibold text-brand hover:underline"
                        >
                          Open thread
                        </Link>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog
        open={dialog != null}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setHistoricalCount(null);
          }
        }}
      >
        <DialogContent>
          {dialog?.type === "add_member" ? (
            <>
              <DialogHeader>
                <DialogTitle>Add household member</DialogTitle>
                <DialogDescription>
                  Creates a new client record and links them to this household.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-2">
                  <Label htmlFor="member-name">Name</Label>
                  <Input
                    id="member-name"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Susan Calloway"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select
                    value={memberRole}
                    onValueChange={(v) => setMemberRole(v as "SPOUSE" | "JOINT")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPOUSE">Spouse</SelectItem>
                      <SelectItem value="JOINT">Joint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialog(null)}>
                  Cancel
                </Button>
                <Button
                  className="bg-brand text-text-primary"
                  disabled={!memberName.trim() || submitting}
                  onClick={() => void submitDialog()}
                >
                  Add member
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {dialog?.type === "link_member" ? (
            <>
              <DialogHeader>
                <DialogTitle>Link existing client</DialogTitle>
                <DialogDescription>
                  Attach another client record in this workspace as a household member.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={peerClientId} onValueChange={setPeerClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {linkableClients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select
                    value={memberRole}
                    onValueChange={(v) => setMemberRole(v as "SPOUSE" | "JOINT")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPOUSE">Spouse</SelectItem>
                      <SelectItem value="JOINT">Joint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialog(null)}>
                  Cancel
                </Button>
                <Button
                  className="bg-brand text-text-primary"
                  disabled={!peerClientId || submitting}
                  onClick={() => void submitDialog()}
                >
                  Link client
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {dialog?.type === "add_alias" ? (
            <>
              <DialogHeader>
                <DialogTitle>Add email address</DialogTitle>
                <DialogDescription>
                  Link an address to {dialog.targetName}. Historical threads that include
                  this address will be attached.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-2">
                  <Label htmlFor="alias-address">Email</Label>
                  <Input
                    id="alias-address"
                    type="email"
                    value={aliasAddress}
                    onChange={(e) => {
                      setAliasAddress(e.target.value);
                      setHistoricalCount(null);
                    }}
                    onBlur={() => void previewAlias()}
                    placeholder="spouse@example.com"
                  />
                </div>
                {historicalCount != null ? (
                  <p className="text-sm text-muted-foreground">
                    {historicalCount} historical thread
                    {historicalCount === 1 ? "" : "s"} will be attached on confirm
                  </p>
                ) : null}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialog(null)}>
                  Cancel
                </Button>
                <Button
                  className="bg-brand text-text-primary"
                  disabled={!aliasAddress.includes("@") || submitting}
                  onClick={() => void submitDialog()}
                >
                  Confirm and attach
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {dialog?.type === "remove_member" ? (
            <>
              <DialogHeader>
                <DialogTitle>Remove household member</DialogTitle>
                <DialogDescription>
                  Remove {dialog.name} from this household. Historical correspondence stays
                  attached; only future matching through this household will stop.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialog(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={submitting}
                  onClick={() => void submitDialog()}
                >
                  Remove member
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {dialog?.type === "remove_alias" ? (
            <>
              <DialogHeader>
                <DialogTitle>Remove email address</DialogTitle>
                <DialogDescription>
                  Unlink {dialog.address}. Historical correspondence stays attached; future
                  mail from this address will not auto-match this client.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialog(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={submitting}
                  onClick={() => void submitDialog()}
                >
                  Remove address
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
