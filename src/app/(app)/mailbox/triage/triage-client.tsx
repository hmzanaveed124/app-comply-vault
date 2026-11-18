"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { toast } from "~/lib/toast";
import type { EmailTriageItemDto } from "~/lib/types/evidence";
import type { ClientListItemDto, NeedsAttributionMeetingDto } from "~/lib/types/clients";
import {
  attributeMeetingToClient,
  clientSelectOptions,
  fetchWorkspaceClients,
  normalizeClientName,
} from "~/lib/triage-attribution-api";

function reasonLabel(reason: NeedsAttributionMeetingDto["reason"]): string {
  if (reason === "low_confidence") return "Low confidence name match";
  if (reason === "ambiguous") return "Ambiguous participants";
  return "Unmatched";
}

type TriageClientProps = {
  workspaceId: string;
};

export function TriageClient({ workspaceId }: TriageClientProps): React.JSX.Element {
  const [items, setItems] = useState<EmailTriageItemDto[]>([]);
  const [meetings, setMeetings] = useState<NeedsAttributionMeetingDto[]>([]);
  const [clients, setClients] = useState<ClientListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [confirmItem, setConfirmItem] = useState<EmailTriageItemDto | null>(null);
  const [confirmMeeting, setConfirmMeeting] = useState<NeedsAttributionMeetingDto | null>(
    null,
  );
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const loadClients = useCallback(async (): Promise<void> => {
    if (!workspaceId) return;
    setClientsLoading(true);
    const result = await fetchWorkspaceClients(workspaceId);
    setClientsLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to load clients");
      setClients([]);
      return;
    }
    setClients(result.data);
  }, [workspaceId]);

  async function load(): Promise<void> {
    setLoading(true);
    const [triageRes, meetingsRes] = await Promise.all([
      fetch("/api/mailbox/triage"),
      fetch("/api/meetings/attribution"),
    ]);
    const json = (await triageRes.json()) as { success: boolean; data?: EmailTriageItemDto[] };
    if (json.success && json.data) setItems(json.data);

    const meetingsJson = (await meetingsRes.json()) as {
      success: boolean;
      data?: NeedsAttributionMeetingDto[];
    };
    if (meetingsJson.success && meetingsJson.data) setMeetings(meetingsJson.data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!confirmItem && !confirmMeeting) return;
    void loadClients();
  }, [confirmItem, confirmMeeting, loadClients]);

  useEffect(() => {
    if (!confirmMeeting || clients.length === 0) return;
    if (
      confirmMeeting.clientId &&
      clients.some((c) => c.id === confirmMeeting.clientId)
    ) {
      setSelectedClientId(confirmMeeting.clientId);
      return;
    }
    const key = normalizeClientName(confirmMeeting.clientName);
    const match = clients.find((c) => normalizeClientName(c.name) === key);
    if (match) {
      setSelectedClientId(match.id);
    }
  }, [confirmMeeting, clients]);

  async function resolve(
    id: string,
    status: "CONFIRMED" | "EXTERNAL" | "IRRELEVANT",
    clientId?: string,
  ): Promise<void> {
    setSubmitting(true);
    const res = await fetch(`/api/mailbox/triage/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        ...(clientId ? { clientId } : {}),
      }),
    });
    const json = (await res.json()) as {
      success: boolean;
      error?: string;
      data?: { threadsUpdated: number; evidenceAttached: number };
    };
    setSubmitting(false);
    if (!json.success) {
      toast.error(json.error ?? "Failed");
      return;
    }
    if (status === "CONFIRMED" && json.data) {
      toast.success(
        `Resolved. ${json.data.threadsUpdated} thread${json.data.threadsUpdated === 1 ? "" : "s"} updated; ${json.data.evidenceAttached} message${json.data.evidenceAttached === 1 ? "" : "s"} attached.`,
      );
    } else {
      toast.success("Resolved");
    }
    setConfirmItem(null);
    setSelectedClientId("");
    await load();
  }

  async function resolveMeeting(meetingId: string, clientId: string): Promise<void> {
    setSubmitting(true);
    const json = await attributeMeetingToClient(meetingId, clientId);
    setSubmitting(false);
    if (!json.success) {
      toast.error(json.error ?? "Failed");
      return;
    }
    toast.success("Meeting attributed to client");
    setConfirmMeeting(null);
    setSelectedClientId("");
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 p-6">
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Participant triage</h1>
          <p className="text-sm text-muted-foreground">
            Unmatched email addresses from ingested threads.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending addresses.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div className="space-y-0.5">
                  <span className="font-mono text-sm">{item.address}</span>
                  {item.historicalThreadCount > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {item.historicalThreadCount} historical thread
                      {item.historicalThreadCount === 1 ? "" : "s"} will be attached on confirm
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void resolve(item.id, "EXTERNAL")}
                  >
                    External
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void resolve(item.id, "IRRELEVANT")}
                  >
                    Irrelevant
                  </Button>
                  <Button
                    size="sm"
                    className="bg-brand text-text-primary"
                    onClick={() => {
                      setSelectedClientId("");
                      setConfirmItem(item);
                    }}
                  >
                    Confirm
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Needs attribution</h2>
          <p className="text-sm text-muted-foreground">
            Meetings without a confirmed client link, or with a low-confidence name match.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : meetings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meetings need attribution.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {meetings.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{m.clientName}</span>
                    <Badge variant="outline">{reasonLabel(m.reason)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {m.meetingType} · {new Date(m.meetingDate).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-brand text-text-primary"
                  onClick={() => {
                    setSelectedClientId("");
                    setConfirmMeeting(m);
                  }}
                >
                  Assign client
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={confirmItem != null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmItem(null);
            setSelectedClientId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link address to client</DialogTitle>
            <DialogDescription>
              {confirmItem
                ? `${confirmItem.historicalThreadCount} historical thread${confirmItem.historicalThreadCount === 1 ? "" : "s"} will be attached to the selected client.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="triage-client">Client</Label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              disabled={clientsLoading}
            >
              <SelectTrigger id="triage-client">
                <SelectValue
                  placeholder={clientsLoading ? "Loading clients…" : "Select client"}
                />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clientsLoading ? (
              <p className="text-xs text-muted-foreground">Loading clients…</p>
            ) : clients.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No clients in this workspace yet. Create a client record before confirming.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmItem(null);
                setSelectedClientId("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-brand text-text-primary"
              disabled={!selectedClientId || submitting || !confirmItem || clientsLoading}
              onClick={() => {
                if (!confirmItem || !selectedClientId) return;
                void resolve(confirmItem.id, "CONFIRMED", selectedClientId);
              }}
            >
              Confirm and attach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmMeeting != null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmMeeting(null);
            setSelectedClientId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attribute meeting to client</DialogTitle>
            <DialogDescription>
              {confirmMeeting
                ? `Link “${confirmMeeting.clientName}” to a client record. This replaces any low-confidence name match.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="meeting-client">Client</Label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              disabled={clientsLoading}
            >
              <SelectTrigger id="meeting-client">
                <SelectValue
                  placeholder={clientsLoading ? "Loading clients…" : "Select client"}
                />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clientsLoading ? (
              <p className="text-xs text-muted-foreground">Loading clients…</p>
            ) : clients.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No clients in this workspace yet. Create a client record before attributing.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmMeeting(null);
                setSelectedClientId("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-brand text-text-primary"
              disabled={!selectedClientId || submitting || !confirmMeeting || clientsLoading}
              onClick={() => {
                if (!confirmMeeting || !selectedClientId) return;
                void resolveMeeting(confirmMeeting.id, selectedClientId);
              }}
            >
              Confirm attribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
