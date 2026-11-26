/**
 * CV-TR-07 — canonical transcript hash and readback-gated media discard,
 * plus the RETAIN→DISCARD retained-media purge built on the same gate.
 */

import { createHash } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MeetingRow = {
  id: string;
  workspaceId: string;
  transcript: unknown;
  transcriptSha256: string | null;
  fileUrl: string | null;
  mediaDiscardedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
};

const h = vi.hoisted(() => {
  const state: {
    meetings: MeetingRow[];
    workspacePosture: "RETAIN" | "DISCARD" | null;
    /** When true, meeting.update silently drops writes — simulates a write that did not land. */
    legalHold: boolean;
    dropWrites: boolean;
    failDelete: boolean;
  } = {
    meetings: [],
    workspacePosture: null,
    dropWrites: false,
    failDelete: false,
    legalHold: false,
  };

  const auditCreates: Array<Record<string, unknown>> = [];
  const deletedKeys: string[] = [];

  const meetingOps = {
    findFirst: async (args: { where: { id: string; workspaceId: string } }) => {
      const row = state.meetings.find(
        (m) =>
          m.id === args.where.id &&
          m.workspaceId === args.where.workspaceId &&
          m.deletedAt === null,
      );
      return row ? { ...row } : null;
    },
    findMany: async (args: { where: { workspaceId: string } }) => {
      return state.meetings
        .filter(
          (m) =>
            m.workspaceId === args.where.workspaceId &&
            m.deletedAt === null &&
            m.fileUrl !== null,
        )
        .map((m) => ({ id: m.id }));
    },
    count: async (args: { where: { workspaceId: string } }) => {
      return state.meetings.filter(
        (m) =>
          m.workspaceId === args.where.workspaceId &&
          m.deletedAt === null &&
          m.fileUrl !== null,
      ).length;
    },
    update: async (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      if (state.dropWrites) return null;
      const row = state.meetings.find((m) => m.id === args.where.id);
      if (row) Object.assign(row, args.data);
      return row;
    },
  };

  const auditEventOps = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      auditCreates.push(data);
      return data;
    },
  };

  return { state, auditCreates, deletedKeys, meetingOps, auditEventOps };
});

const { state, auditCreates, deletedKeys } = h;

vi.mock("~/server/db", () => ({
  db: {
    meeting: h.meetingOps,
    auditEvent: h.auditEventOps,
    workspace: {
      findUnique: async () =>
        h.state.workspacePosture === null && h.state.meetings.length === 0
          ? null
          : {
              mediaPosture: h.state.workspacePosture,
              legalHold: h.state.legalHold,
            },
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        meeting: h.meetingOps,
        auditEvent: h.auditEventOps,
        $queryRaw: async () => [
          {
            mediaPosture: h.state.workspacePosture,
            legalHold: h.state.legalHold,
          },
        ],
      }),
  },
}));

vi.mock("~/server/storage", () => ({
  deleteFile: async (key: string) => {
    if (h.state.failDelete) throw new Error("S3 unavailable");
    h.deletedKeys.push(key);
  },
}));

import { canonicalTranscriptText } from "~/server/export/txt";
import { hashCanonicalTranscript, secureTranscript } from "./secure-transcript";
import { purgeRetainedMedia } from "./purge-retained-media";

const SEGMENTS = [
  { startTime: 30, endTime: 40, speaker: "Client", text: "What about fees?" },
  { startTime: 0, endTime: 10, speaker: "Advisor", text: "Welcome back." },
];

function addMeeting(overrides: Partial<MeetingRow> = {}): MeetingRow {
  const row: MeetingRow = {
    id: `meeting_${state.meetings.length + 1}`,
    workspaceId: "ws_1",
    transcript: { segments: SEGMENTS, duration: 40 },
    transcriptSha256: null,
    fileUrl: "workspaces/ws_1/meetings/m/recording.mp4",
    mediaDiscardedAt: null,
    deletedAt: null,
    createdAt: new Date("2026-07-01T00:00:00Z"),
    ...overrides,
  };
  state.meetings.push(row);
  return row;
}

beforeEach(() => {
  state.meetings = [];
  state.workspacePosture = null;
  state.dropWrites = false;
  state.failDelete = false;
  state.legalHold = false;
  auditCreates.length = 0;
  deletedKeys.length = 0;
});

describe("hashCanonicalTranscript", () => {
  it("hashes exactly the canonical serialisation the pack renders", () => {
    const expected = createHash("sha256")
      .update(Buffer.from(canonicalTranscriptText(SEGMENTS), "utf-8"))
      .digest("hex");
    expect(hashCanonicalTranscript(SEGMENTS)).toBe(expected);
  });

  it("is independent of segment input order", () => {
    const reversed = [...SEGMENTS].reverse();
    expect(hashCanonicalTranscript(reversed)).toBe(
      hashCanonicalTranscript(SEGMENTS),
    );
  });
});

describe("secureTranscript", () => {
  it("persists the hash and keeps media under RETAIN posture", async () => {
    const meeting = addMeeting();
    state.workspacePosture = "RETAIN";

    const result = await secureTranscript({
      meetingId: meeting.id,
      workspaceId: "ws_1",
    });

    expect(result.secured).toBe(true);
    expect(meeting.transcriptSha256).toBe(hashCanonicalTranscript(SEGMENTS));
    expect(meeting.fileUrl).not.toBeNull();
    expect(deletedKeys).toHaveLength(0);
  });

  it("deletes media under DISCARD posture after the readback verifies", async () => {
    const meeting = addMeeting();
    state.workspacePosture = "DISCARD";

    const result = await secureTranscript({
      meetingId: meeting.id,
      workspaceId: "ws_1",
    });

    expect(result).toEqual({
      secured: true,
      transcriptSha256: hashCanonicalTranscript(SEGMENTS),
      mediaDiscarded: true,
    });
    expect(deletedKeys).toEqual(["workspaces/ws_1/meetings/m/recording.mp4"]);
    expect(meeting.fileUrl).toBeNull();
    expect(meeting.mediaDiscardedAt).toBeInstanceOf(Date);

    const discardEvent = auditCreates.find(
      (e) =>
        e.action === "MEDIA_DISCARDED" &&
        (e.metadata as Record<string, unknown>).action ===
          "media_discarded_by_policy",
    );
    expect(discardEvent).toBeDefined();
    const metadata = discardEvent!.metadata as Record<string, unknown>;
    expect(metadata.objectUri).toBe("workspaces/ws_1/meetings/m/recording.mp4");
    expect(metadata.transcriptSha256).toBe(hashCanonicalTranscript(SEGMENTS));
  });

  it("never deletes when the hash write did not land (readback gate)", async () => {
    const meeting = addMeeting();
    state.workspacePosture = "DISCARD";
    state.dropWrites = true;

    const result = await secureTranscript({
      meetingId: meeting.id,
      workspaceId: "ws_1",
    });

    expect(result).toEqual({ secured: false, reason: "readback_mismatch" });
    expect(deletedKeys).toHaveLength(0);
    expect(meeting.fileUrl).not.toBeNull();
    const failEvent = auditCreates.find(
      (e) =>
        (e.metadata as Record<string, unknown>).action ===
        "media_discard_readback_failed",
    );
    expect(failEvent).toBeDefined();
  });

  it("refuses to secure a failed or missing transcript", async () => {
    const meeting = addMeeting({
      transcript: { error: true, message: "boom" },
    });
    state.workspacePosture = "DISCARD";

    const result = await secureTranscript({
      meetingId: meeting.id,
      workspaceId: "ws_1",
    });

    expect(result).toEqual({ secured: false, reason: "no_transcript" });
    expect(deletedKeys).toHaveLength(0);
  });

  it("keeps the record honest when the storage delete fails", async () => {
    const meeting = addMeeting();
    state.workspacePosture = "DISCARD";
    state.failDelete = true;

    const result = await secureTranscript({
      meetingId: meeting.id,
      workspaceId: "ws_1",
    });

    expect(result).toEqual({
      secured: true,
      transcriptSha256: hashCanonicalTranscript(SEGMENTS),
      mediaDiscarded: false,
    });
    expect(meeting.fileUrl).not.toBeNull();
    expect(meeting.mediaDiscardedAt).toBeNull();
    const failEvent = auditCreates.find(
      (e) =>
        (e.metadata as Record<string, unknown>).action ===
        "media_discard_failed",
    );
    expect(failEvent).toBeDefined();
  });
});

describe("purgeRetainedMedia (RETAIN → DISCARD follow-up)", () => {
  it("rejects non-CCO actors", async () => {
    state.workspacePosture = "DISCARD";
    addMeeting();

    const result = await purgeRetainedMedia({
      workspaceId: "ws_1",
      userId: "user_member",
      actorRole: "MEMBER",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.status).toBe(403);
    expect(deletedKeys).toHaveLength(0);
  });

  it("only runs while the recorded posture is DISCARD", async () => {
    state.workspacePosture = "RETAIN";
    addMeeting();

    const result = await purgeRetainedMedia({
      workspaceId: "ws_1",
      userId: "user_cco",
      actorRole: "OWNER_CCO",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.status).toBe(409);
    expect(deletedKeys).toHaveLength(0);
  });

  it("purges verified meetings, skips those without a transcript, and audits the run", async () => {
    state.workspacePosture = "DISCARD";
    const withTranscript = addMeeting();
    const withoutTranscript = addMeeting({ transcript: null });

    const result = await purgeRetainedMedia({
      workspaceId: "ws_1",
      userId: "user_cco",
      actorRole: "OWNER_CCO",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        eligible: 2,
        purged: 1,
        skippedNoTranscript: 1,
        failed: 0,
      });
    }
    expect(withTranscript.fileUrl).toBeNull();
    expect(withoutTranscript.fileUrl).not.toBeNull();

    const summaryEvent = auditCreates.find(
      (e) =>
        (e.metadata as Record<string, unknown>).action ===
        "retained_media_purge",
    );
    expect(summaryEvent).toBeDefined();
    expect(summaryEvent!.userId).toBe("user_cco");

    // Per-meeting deletion is attributed to the CCO who requested the purge.
    const discardEvent = auditCreates.find(
      (e) =>
        (e.metadata as Record<string, unknown>).action ===
        "media_discarded_by_policy",
    );
    expect(discardEvent!.userId).toBe("user_cco");
  });
});

describe("legal-hold preservation", () => {
  it("retains source media under DISCARD when a hold is active", async () => {
    state.workspacePosture = "DISCARD";
    state.legalHold = true;
    const row = addMeeting();
    const result = await secureTranscript({
      workspaceId: "ws_1",
      meetingId: row.id,
    });
    expect(result.secured).toBe(true);
    expect(deletedKeys).toHaveLength(0);
    expect(row.fileUrl).not.toBeNull();
  });
  it("rejects explicit retained-media purge under a hold", async () => {
    state.workspacePosture = "DISCARD";
    state.legalHold = true;
    addMeeting();
    const result = await purgeRetainedMedia({
      workspaceId: "ws_1",
      userId: "cco",
      actorRole: "OWNER_CCO",
    });
    expect(result).toMatchObject({ success: false, status: 409 });
    expect(deletedKeys).toHaveLength(0);
  });
});
