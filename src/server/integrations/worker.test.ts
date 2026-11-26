import { beforeEach, describe, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({
  sync: vi.fn(),
  update: vi.fn(),
  configUpdate: vi.fn(),
}));
vi.mock("./index", () => ({
  adapters: { zoom: { provider: "ZOOM", sync: h.sync } },
}));
vi.mock("./queue", () => ({ createIntegrationWorker: vi.fn() }));
vi.mock("~/server/db", () => ({
  db: {
    integrationConfig: {
      findFirst: async () => ({ id: "config" }),
      update: h.configUpdate,
    },
    meeting: { findFirst: async () => ({ id: "meeting" }) },
    integrationSyncLog: {
      create: async () => ({ id: "log" }),
      update: h.update,
    },
  },
}));
import { processIntegrationJob } from "./worker";
const job = (provider = "ZOOM") =>
  ({
    data: {
      workspaceId: "firm",
      meetingId: "meeting",
      provider,
      action: "upload",
      payload: {},
    },
    attemptsMade: 0,
  }) as Parameters<typeof processIntegrationJob>[0];
beforeEach(() => vi.clearAllMocks());
describe("integration delivery acknowledgement", () => {
  it("fails unsupported writes instead of marking a no-op successful", async () => {
    await expect(processIntegrationJob(job("SHAREPOINT"))).rejects.toThrow(
      "No outbound adapter",
    );
    expect(h.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "failed" }),
      }),
    );
    expect(h.configUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastSyncAt: expect.anything() }),
      }),
    );
  });
  it("does not mark a successful response without a receipt as delivered", async () => {
    h.sync.mockResolvedValue({ success: true });
    await expect(processIntegrationJob(job())).rejects.toThrow(
      "external record ID",
    );
    expect(h.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "failed" }),
      }),
    );
  });
  it("records the provider's acknowledgement after actual delivery", async () => {
    h.sync.mockResolvedValue({
      success: true,
      externalId: "provider-record-123",
    });
    await processIntegrationJob(job());
    expect(h.sync).toHaveBeenCalledWith({
      workspaceId: "firm",
      meetingId: "meeting",
      payload: {},
    });
    expect(h.update).toHaveBeenCalledWith({
      where: { id: "log" },
      data: {
        status: "success",
        externalId: "provider-record-123",
        completedAt: expect.any(Date),
      },
    });
  });
});
