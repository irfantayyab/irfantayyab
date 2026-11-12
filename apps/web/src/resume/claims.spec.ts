import { describe, expect, it } from "vitest";
import { productionUrl } from "@/production-url";
import { resume } from "./claims";

describe("the resume's website link", () => {
  it("is the site's production address", () => {
    expect(resume.links.website).toEqual({
      url: productionUrl,
      label: new URL(productionUrl).host,
    });
  });
});
