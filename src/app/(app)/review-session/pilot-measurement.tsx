"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
export function PilotMeasurement({
  workspaceId,
}: {
  workspaceId: string;
}): React.JSX.Element {
  const router = useRouter();
  const [caseLabel, setCaseLabel] = useState("");
  const [values, setValues] = useState({
    baselineMinutes: "",
    reviewMinutes: "",
    setupMinutes: "",
    reworkMinutes: "",
    itemsReviewed: "",
    falsePositives: "",
    missedConcerns: "",
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const labels = {
    baselineMinutes: "Comparable manual baseline (minutes)",
    reviewMinutes: "Review using ComplyVault (minutes)",
    setupMinutes: "Setup time allocated to this comparison (minutes)",
    reworkMinutes: "Follow-up / rework (minutes)",
    itemsReviewed: "Comparable items reviewed",
    falsePositives: "False positives reviewed",
    missedConcerns: "Concerns missed, found through sampling",
  };
  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/review-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          caseLabel,
          ...Object.fromEntries(
            Object.entries(values).map(([k, v]) => [
              k,
              v === "" ? null : Number(v),
            ]),
          ),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      setMessage(
        "Measurement saved. Compare like-for-like cases before drawing conclusions.",
      );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }
  const complete = Object.values(values).every((v) => v !== "");
  const net = complete
    ? Number(values.baselineMinutes) -
      Number(values.reviewMinutes) -
      Number(values.setupMinutes) -
      Number(values.reworkMinutes)
    : null;
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="font-semibold">Pilot measurement</h2>
      <p className="my-2 text-sm text-text-secondary">
        Record observed, comparable work. These are reviewer-entered
        measurements, not system-measured time or a forecast. Record zero
        explicitly where no time or issues were observed.
      </p>
      <Label htmlFor="pilot-case">
        Case / comparison method (avoid client personal information)
      </Label>
      <Input
        id="pilot-case"
        value={caseLabel}
        onChange={(e) => setCaseLabel(e.target.value)}
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(Object.keys(values) as Array<keyof typeof values>).map((key) => (
          <div key={key}>
            <Label htmlFor={`pilot-${key}`}>{labels[key]}</Label>
            <Input
              id={`pilot-${key}`}
              type="number"
              min="0"
              step={key.includes("Minutes") ? "0.1" : "1"}
              value={values[key]}
              onChange={(e) =>
                setValues((v) => ({ ...v, [key]: e.target.value }))
              }
            />
          </div>
        ))}
      </div>
      {net !== null ? (
        <p className="my-3 text-sm">
          Net difference for this comparison: {net.toFixed(1)} minutes. Negative
          means more time was spent using ComplyVault. Review error rates
          alongside time.
        </p>
      ) : null}
      <Button
        className="mt-3"
        disabled={saving || !complete || caseLabel.trim().length < 10}
        onClick={() => void save()}
      >
        Save observed comparison
      </Button>
      {message ? (
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      ) : null}
    </section>
  );
}
