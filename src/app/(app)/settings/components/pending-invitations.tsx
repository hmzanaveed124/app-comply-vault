"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";

type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  roleLabel: string;
  status: "PENDING" | "EXPIRED" | "REVOKED";
  createdAt: string;
  expiresAt: string;
  inviterName: string | null;
};

type SeatSummary = {
  used: number;
  members: number;
  pending: number;
  max: number;
};

export function PendingInvitations({
  workspaceId,
}: {
  workspaceId: string;
}): React.ReactElement {
  const router = useRouter();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [seats, setSeats] = useState<SeatSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadInvitations = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations/pending`);
      if (!response.ok) {
        throw new Error("Failed to load pending invitations");
      }
      const data = (await response.json()) as {
        invitations: PendingInvitation[];
        seats: SeatSummary;
      };
      setInvitations(data.invitations);
      setSeats(data.seats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  const handleResend = async (invitation: PendingInvitation): Promise<void> => {
    setActionId(invitation.id);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: invitation.email, role: invitation.role }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to resend invitation");
      }
      await loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setActionId(null);
    }
  };

  const handleReinvite = async (invitation: PendingInvitation): Promise<void> => {
    await handleResend(invitation);
  };

  const handleRevoke = async (invitation: PendingInvitation): Promise<void> => {
    const confirmed = window.confirm(`Revoke invitation to ${invitation.email}?`);
    if (!confirmed) {
      return;
    }

    setActionId(invitation.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/invitations/${invitation.id}/revoke`,
        { method: "POST" },
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to revoke invitation");
      }
      await loadInvitations();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setActionId(null);
    }
  };

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const statusClass = (status: PendingInvitation["status"]): string => {
    if (status === "PENDING") return "text-success-text";
    return "text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Invitations</CardTitle>
        <CardDescription>
          View, resend, or revoke invitations sent to team members.
          {seats ? (
            <span className="mt-1 block">
              {seats.used} of {seats.max} seats used (including {seats.pending} pending)
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading invitations…</p>
        ) : invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending invitations.{" "}
            <Link href={`/workspaces/${workspaceId}/invite`} className="text-primary underline">
              Invite team members
            </Link>{" "}
            to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Role</th>
                  <th className="pb-2 pr-4 font-medium">Sent</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="border-b last:border-0">
                    <td
                      className={`py-3 pr-4 ${invitation.status === "REVOKED" ? "text-muted-foreground line-through" : ""}`}
                    >
                      {invitation.email}
                    </td>
                    <td className="py-3 pr-4">{invitation.roleLabel}</td>
                    <td className="py-3 pr-4">{formatDate(invitation.createdAt)}</td>
                    <td className={`py-3 pr-4 capitalize ${statusClass(invitation.status)}`}>
                      {invitation.status.toLowerCase()}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {invitation.status === "PENDING" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionId === invitation.id}
                              onClick={() => void handleResend(invitation)}
                            >
                              Resend
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionId === invitation.id}
                              onClick={() => void handleRevoke(invitation)}
                            >
                              Revoke
                            </Button>
                          </>
                        ) : null}
                        {invitation.status === "EXPIRED" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionId === invitation.id}
                              onClick={() => void handleReinvite(invitation)}
                            >
                              Re-invite
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionId === invitation.id}
                              onClick={() => void handleRevoke(invitation)}
                            >
                              Remove
                            </Button>
                          </>
                        ) : null}
                        {invitation.status === "REVOKED" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionId === invitation.id}
                            onClick={() => void handleReinvite(invitation)}
                          >
                            Re-invite
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
