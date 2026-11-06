import { describe, expect, it } from "vitest";
import { addDrops, DROPS, dropsToNextStage, MAX_STAGE, stageFor } from "./points";

describe("gouttes et paliers", () => {
  it("donne le bon palier", () => {
    expect(stageFor(0)).toBe(0);
    expect(stageFor(7)).toBe(0);
    expect(stageFor(8)).toBe(1);
    expect(stageFor(49)).toBe(2);
    expect(stageFor(50)).toBe(3);
    expect(stageFor(359)).toBe(6);
    expect(stageFor(360)).toBe(MAX_STAGE);
    expect(stageFor(5000)).toBe(7);
  });

  it("compte les gouttes avant la prochaine feuille", () => {
    expect(dropsToNextStage(0)).toBe(8);
    expect(dropsToNextStage(10)).toBe(15);
    expect(dropsToNextStage(360)).toBeNull();
  });

  it("barème des actions", () => {
    expect(DROPS.task("obligatoire")).toBe(2);
    expect(DROPS.task("secondaire")).toBe(1);
    expect(DROPS.chore(1)).toBe(1);
    expect(DROPS.chore(3)).toBe(3);
    expect(DROPS.minimum).toBe(2);
  });

  it("ne descend jamais sous zéro", () => {
    expect(addDrops(1, -3)).toBe(0);
    expect(addDrops(4, 2)).toBe(6);
  });
});
