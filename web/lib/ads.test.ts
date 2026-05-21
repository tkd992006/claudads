import { describe, it, expect } from "vitest";
import { viewerRewardMicro, ctaBonusMicro } from "./ads";

const ad = {
  id: "a",
  advertiserId: "x",
  title: "",
  videoKey: "",
  durationSec: 10,
  ctaLabel: null,
  ctaUrl: null,
  cpmCents: 10_000, // ₩10,000 per 1000 impressions
  budgetCapCents: 100_000,
  spentCents: 0,
  impressionsCount: 0,
  dailyCapImpressions: null,
  scheduleStart: null,
  scheduleEnd: null,
  status: "APPROVED" as const,
  createdAt: new Date(),
};

describe("reward math", () => {
  it("viewer gets 60% of CPM/1000 per impression", () => {
    // cpmMicro = 10000 * 10000 = 100_000_000
    // /1000 = 100_000
    // *60% = 60_000
    expect(viewerRewardMicro(ad).toString()).toBe("60000");
  });

  it("CTA bonus = 3x viewer reward", () => {
    expect(ctaBonusMicro(ad).toString()).toBe("180000");
  });
});
