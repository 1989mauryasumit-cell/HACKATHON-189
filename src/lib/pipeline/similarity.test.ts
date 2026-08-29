import { describe, it, expect } from "vitest";
import { jaroWinklerSimilarity, levenshteinDistance } from "./similarity";
import { metaphone } from "./phonetic";

describe("Entity Resolution Algorithms", () => {
  describe("Levenshtein Distance", () => {
    it("should compute correct edit distance", () => {
      expect(levenshteinDistance("Devendra", "Devendra")).toBe(0);
      expect(levenshteinDistance("Devendra", "Devender")).toBe(2);
      expect(levenshteinDistance("Maurya", "Mourya")).toBe(1);
      expect(levenshteinDistance("Arjun", "Sen")).toBe(4);
    });
  });

  describe("Jaro-Winkler Similarity", () => {
    it("should compute correct similarity scores", () => {
      expect(jaroWinklerSimilarity("Devendra Maurya", "Devendra Maurya")).toBe(1.0);
      
      const score = jaroWinklerSimilarity("Rajesh Kumaar", "Rajesh Kumar");
      expect(score).toBeGreaterThan(0.9); // High similarity expected
    });
  });

  describe("Indian Metaphone Encoder", () => {
    it("should encode similar sounding names to same key", () => {
      const code1 = metaphone("Kumaar");
      const code2 = metaphone("Kumar");
      expect(code1).toBe(code2);

      const v1 = metaphone("Sanjai");
      const v2 = metaphone("Sanjay");
      expect(v1).toBe(v2);
    });
  });
});
