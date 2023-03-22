import { ThresholdClient } from "./plugin";
import { describe, it, expect } from "vitest";

describe("threshold", () => {
  describe("split", () => {
    it("should split incoming array data into a given number of equally sized chunks", () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunks = 3;
      const expected = [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10],
      ];
      const actual = ThresholdClient.split(data, chunks);
      expect(actual).toEqual(expected);
    });
  });

  describe("merge", () => {
    it("should merge incoming array data into a single array", () => {
      const data = [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10],
      ];
      const expected = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const actual = ThresholdClient.merge(data);
      expect(actual).toEqual(expected);
    });
  });

  describe("");
});
