import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    share: {
      get: {
        useQuery: mocks.useQuery,
      },
    },
  },
}));

vi.mock("wouter", () => ({
  useRoute: () => [true, { slug: "my-story" }],
}));

import SharedStory from "./SharedStory";

const publicStory = {
  status: "available" as const,
  diary: {
    title: "我的成長史",
    subtitle: "一段可以慢慢閱讀的故事",
    publicCoverTitle: "從好奇開始",
    publicCoverUrl: "https://example.test/cover.webp",
    publicStoryLayout: "editorial" as "editorial" | "gallery" | "minimal",
    shareMode: "public" as const,
  },
  events: [],
  lifePhases: [],
};

describe("SharedStory", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { search: "" } },
    });
  });

  it.each(["editorial", "gallery", "minimal"] as const)("renders the %s public reading layout after data resolves", (publicStoryLayout) => {
    mocks.useQuery.mockReturnValue({
      data: { ...publicStory, diary: { ...publicStory.diary, publicStoryLayout } },
      isLoading: false,
    });

    const html = renderToStaticMarkup(<SharedStory />);

    expect(html).toContain(`shared-layout-${publicStoryLayout}`);
    expect(html).toContain("從好奇開始");
  });

  it("renders the explicitly configured cover image with meaningful alternative text", () => {
    mocks.useQuery.mockReturnValue({ data: publicStory, isLoading: false });

    const html = renderToStaticMarkup(<SharedStory />);

    expect(html).toContain('src="https://example.test/cover.webp"');
    expect(html).toContain('alt="從好奇開始 的故事封面"');
  });
});
