import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("~/lib/toast", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
import { TriageControls } from "~/components/flags/triage-controls";
import {
  FlagTriageCard,
  type FlagTriageCardFlag,
} from "~/components/flags/flag-triage-card";

afterEach(cleanup);

describe("Ernest review workflow", () => {
  it("requires evidence reference, rationale and explicit no-finding attestation", async () => {
    const onSubmit = vi.fn(async () => {});
    render(<TriageControls flagId="flag" onSubmit={onSubmit} />);
    const save = screen.getByRole("button", { name: "Record no finding" });
    expect(save.hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/Explain why this concern/), {
      target: {
        value:
          "This interaction contains general education and the cited control does not apply.",
      },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Supporting evidence reference" }),
      { target: { value: "Transcript 00:14–01:20 version 1" } },
    );
    expect(save.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(save);
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith("resolve", expect.any(String), {
        closureBasis: "FALSE_POSITIVE",
        evidenceReference: "Transcript 00:14–01:20 version 1",
        noFurtherActionRequired: true,
      }),
    );
  });
  it("keeps remediation reachable for open observations and removes apparent violation probabilities", () => {
    const flag: FlagTriageCardFlag = {
      id: "flag",
      type: "MISSING_DISCLOSURE",
      severity: "WARN",
      status: "OPEN",
      evidence: {
        recommendation: {
          text: "Consider this annuity",
          confidence: 0.95,
          startTime: 14,
        },
      },
      createdAt: new Date().toISOString(),
      cmDisposition: "NONE",
      resolutionRecord: null,
    };
    const start = vi.fn();
    render(
      <FlagTriageCard
        flag={flag}
        meetingStatus="ADVISOR_CERTIFIED"
        userRole="OWNER_CCO"
        currentUserId="cco"
        onOpenRemediation={start}
      />,
    );
    expect(screen.queryByText(/95%/)).toBeNull();
    expect(screen.getByText(/Automated observation/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start remediation" }));
    expect(start).toHaveBeenCalledWith(flag);
  });
});
