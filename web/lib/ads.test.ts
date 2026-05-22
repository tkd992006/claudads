import { describe, it, expect } from "vitest";
import {
  concurrencyFactor,
  viewerRewardForCost,
  impressionCostCents,
  ctaCostCents,
} from "./ads";

// 1 cent = 10_000 micro (통화 모델 환산비).
const MICRO_PER_CENT = 10_000n;

describe("viewerRewardForCost — 광고주 과금 ↔ 시청자 보상", () => {
  it("시청자 보상 = 과금(cent) × 8_000 micro", () => {
    expect(viewerRewardForCost(1)).toBe(8_000n);
    expect(viewerRewardForCost(10)).toBe(80_000n);
  });

  it("광고주 과금은 항상 시청자 보상의 정확히 1.25배 (반올림 없음)", () => {
    for (const cost of [1, 7, 10, 123, 9999]) {
      const reward = viewerRewardForCost(cost);
      const advertiserMicro = BigInt(cost) * MICRO_PER_CENT;
      // 과금 / 보상 = 1.25 = 5/4  ⇔  과금 × 4 === 보상 × 5
      expect(advertiserMicro * 4n).toBe(reward * 5n);
    }
  });

  it("0 이하 과금은 0 보상", () => {
    expect(viewerRewardForCost(0)).toBe(0n);
    expect(viewerRewardForCost(-3)).toBe(0n);
  });
});

describe("concurrencyFactor", () => {
  it("N=1 → 1 (감쇠 없음)", () => {
    expect(concurrencyFactor(1)).toBe(1);
  });

  it("N<=0 은 1 로 클램프", () => {
    expect(concurrencyFactor(0)).toBe(1);
    expect(concurrencyFactor(-2)).toBe(1);
  });

  it("N=2 → 0.75 (두 view 합계 1.5x)", () => {
    expect(concurrencyFactor(2)).toBe(0.75);
    expect(concurrencyFactor(2) * 2).toBe(1.5);
  });

  it("N 이 커질수록 1 view 당 계수는 단조 감소", () => {
    let prev = concurrencyFactor(1);
    for (let n = 2; n <= 10; n++) {
      const cur = concurrencyFactor(n);
      expect(cur).toBeLessThan(prev);
      prev = cur;
    }
  });

  it("합계(N × factor)는 2x asymptote 미만", () => {
    for (let n = 1; n <= 50; n++) {
      expect(concurrencyFactor(n) * n).toBeLessThan(2);
    }
  });
});

describe("impressionCostCents", () => {
  it("N=1·full → ceil(cpmCents / 1000)", () => {
    expect(impressionCostCents(10_000, 1, 1)).toBe(10);
    expect(impressionCostCents(10_500, 1, 1)).toBe(11); // 10.5 → 올림
  });

  it("partial(50%) 시청은 과금을 깎는다", () => {
    expect(impressionCostCents(10_000, 1, 0.5)).toBe(5);
  });

  it("동시 시청 N>1 은 과금을 sub-linear 하게 깎는다", () => {
    // N=2, full: 10 × 0.75 = 7.5 → 올림 8
    expect(impressionCostCents(10_000, 2, 1)).toBe(8);
  });

  it("항상 최소 1 cent", () => {
    expect(impressionCostCents(1, 1, 0.5)).toBe(1);
    expect(impressionCostCents(1, 50, 0.5)).toBe(1);
  });
});

describe("ctaCostCents", () => {
  it("노출 기본 과금(N=1·full)의 3배", () => {
    expect(ctaCostCents(10_000)).toBe(30); // 3 × 10
  });

  it("CTA 도 시청자 보너스 대비 1.25배 비율을 유지", () => {
    const cost = ctaCostCents(10_000);
    const bonus = viewerRewardForCost(cost);
    const advertiserMicro = BigInt(cost) * MICRO_PER_CENT;
    expect(advertiserMicro * 4n).toBe(bonus * 5n);
  });
});
