import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { ThemeProvider } from "~/theme/provider";
import {
  buildWorkspaceJourney,
  type JourneyInput,
} from "~/lib/onboarding/journey";
import { WorkspaceJourneyPanel } from "./workspace-journey";
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const base: JourneyInput = {
  workspaceId: "firm-a",
  workspaceName: "Firm A",
  userId: "user-a",
  role: "OWNER_CCO",
  dismissed: false,
  mediaReady: true,
  meetingCount: 0,
  reviewedCount: 0,
  finishedCount: 0,
  connected: false,
  nextRecord: null,
  processingRecord: null,
};
function show(input = base) {
  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <ThemeProvider>
        <WorkspaceJourneyPanel journey={buildWorkspaceJourney(input)} />
      </ThemeProvider>
    </ConfigProvider>,
  );
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  refresh.mockClear();
});
describe("guided first use", () => {
  it("starts with a useful action and real setup progress", () => {
    show();
    expect(
      screen
        .getByRole("link", { name: "Add your first meeting" })
        .getAttribute("href"),
    ).toBe("/upload");
    expect(screen.getByText("1 / 4")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Walk me through it" }),
    ).toBeTruthy();
  });
  it("keeps guidance visible when saving a dismissal fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false } as Response);
    show();
    await userEvent.click(
      screen.getByRole("button", { name: "Hide setup guide" }),
    );
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Your path to a reviewed record" }),
    ).toBeTruthy();
  });
  it("can reopen the walkthrough after hiding setup without faking completion", async () => {
    show({ ...base, dismissed: true });
    expect(
      screen.queryByRole("heading", { name: "Your path to a reviewed record" }),
    ).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Walk me through it" }),
    );
    await waitFor(() =>
      expect(
        screen.getByText("Start with the next useful action"),
      ).toBeTruthy(),
    );
    expect(screen.getByText("1 / 4")).toBeTruthy();
  });
  it("does not send a member to recording policy or integration settings", () => {
    show({ ...base, role: "MEMBER", mediaReady: false });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "CCO",
    );
    expect(
      screen.queryByRole("link", { name: "Set recording policy" }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Connect a service" }),
    ).toBeNull();
  });
});
