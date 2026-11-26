"use client";
import { useState } from "react";
import { toast } from "~/lib/toast";
export function FirmRecordLink({
  workspaceId,
  href,
  children,
}: {
  workspaceId: string;
  href: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  async function open() {
    setLoading(true);
    try {
      const res = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (!res.ok) throw new Error("Could not open the firm's workspace");
      // A full navigation refreshes both the session workspace and server-rendered layout.
      window.location.assign(href);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open record");
      setLoading(false);
    }
  }
  return (
    <button
      type="button"
      disabled={loading}
      className="text-left text-brand underline disabled:opacity-50"
      onClick={() => void open()}
    >
      {loading ? "Opening firm…" : children}
    </button>
  );
}
