import { describe, expect, it } from "vitest";
import { addDays, daysBetween, greeting, isISODate, isSunday, longDate, mondayOf, weekDays, weekdayShort } from "./dates";

describe("dates", () => {
  it("la semaine commence le lundi", () => {
    expect(mondayOf("2026-11-06")).toBe("2026-11-02"); // vendredi
    expect(mondayOf("2026-11-08")).toBe("2026-11-02"); // dimanche
    expect(mondayOf("2026-11-02")).toBe("2026-11-02");
    expect(weekDays("2026-11-06")).toEqual([
      "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08",
    ]);
  });

  it("ajoute des jours en traversant mois, années et changement d'heure", () => {
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26"); // passage à l'heure d'hiver
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("compte les jours entre deux dates", () => {
    expect(daysBetween("2026-11-01", "2026-11-06")).toBe(5);
    expect(daysBetween("2026-11-06", "2026-11-01")).toBe(-5);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2); // heure d'été
  });

  it("écrit les dates en français", () => {
    expect(longDate("2026-11-06")).toBe("vendredi 6 novembre");
    expect(weekdayShort("2026-11-02")).toBe("Lu");
    expect(isSunday("2026-11-08")).toBe(true);
    expect(isSunday("2026-11-06")).toBe(false);
  });

  it("valide le format des dates", () => {
    expect(isISODate("2026-11-06")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("06/11/2026")).toBe(false);
    expect(isISODate(42)).toBe(false);
  });

  it("salue selon l'heure", () => {
    expect(greeting(8)).toBe("Bonjour");
    expect(greeting(14)).toBe("Bon après-midi");
    expect(greeting(20)).toBe("Bonsoir");
    expect(greeting(2)).toBe("Bonsoir");
  });
});
