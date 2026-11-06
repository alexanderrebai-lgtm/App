import { describe, expect, it } from "vitest";
import { guessAisle, normalizeName } from "./aisles";

describe("rayons", () => {
  it.each([
    ["Bananes", "Fruits & légumes"],
    ["pommes de terre", "Fruits & légumes"],
    ["Lait", "Frais"],
    ["Œufs", "Frais"],
    ["Yaourts", "Frais"],
    ["blancs de poulet", "Viande & poisson"],
    ["thon en boîte", "Épicerie"],
    ["lait de coco", "Épicerie"],
    ["Pain", "Boulangerie"],
    ["pain complet", "Boulangerie"],
    ["brocolis surgelés", "Surgelés"],
    ["haricots verts surgelés", "Surgelés"],
    ["Café", "Boissons"],
    ["Papier toilette", "Hygiène"],
    ["Liquide vaisselle", "Entretien"],
    ["Sacs poubelle", "Entretien"],
    ["Pâtes", "Épicerie"],
    ["Riz", "Épicerie"],
    ["maïs en conserve", "Épicerie"],
    ["gruyère râpé", "Frais"],
    ["Ampoule", "Autre"],
  ])("%s → %s", (name, aisle) => {
    expect(guessAisle(name)).toBe(aisle);
  });

  it("ne confond pas les mots courts", () => {
    expect(guessAisle("thé vert")).toBe("Boissons");
    expect(guessAisle("Thon frais")).toBe("Viande & poisson");
    expect(guessAisle("Poireaux")).toBe("Fruits & légumes");
  });

  it("normalise les noms", () => {
    expect(normalizeName("  Œufs  Frais ")).toBe("oeufs frais");
    expect(normalizeName("Pâtes")).toBe("pates");
  });
});
