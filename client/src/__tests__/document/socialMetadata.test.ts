import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../../../index.html", import.meta.url), "utf8");
const openGraphImage = "/manus-storage/chronicle-open-graph-timeline_ec4e6355.png";

describe("public social metadata", () => {
  it("uses a branded timeline visual for Open Graph and Twitter previews", () => {
    expect(html).toContain(`property="og:image" content="${openGraphImage}"`);
    expect(html).toContain('property="og:image:alt" content="Chronicle 的深墨藍時間帶與辰砂橘紅里程碑節點"');
    expect(html).toContain(`name="twitter:image" content="${openGraphImage}"`);
    expect(html).toContain('name="twitter:image:alt" content="Chronicle 的深墨藍時間帶與辰砂橘紅里程碑節點"');
    expect(html).not.toContain('property="og:image" content="/manus-storage/chronicle-mark_5e825172.png"');
  });
});
