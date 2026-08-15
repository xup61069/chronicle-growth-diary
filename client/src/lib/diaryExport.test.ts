import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportDiaryAsLongImage, exportDiaryAsPdf } from "./diaryExport";

vi.mock("html2canvas", () => ({ default: vi.fn() }));
vi.mock("jspdf", () => ({ jsPDF: vi.fn() }));

const canvas = {
  width: 400,
  height: 1200,
  toDataURL: vi.fn(() => "data:image/png;base64,chronicle"),
  toBlob: vi.fn((callback: BlobCallback) => callback(new Blob(["chronicle"], { type: "image/png" }))),
} as unknown as HTMLCanvasElement;

const captureTarget = { scrollWidth: 400, scrollHeight: 1200 } as HTMLElement;

describe("diary export downloads", () => {
  const addImage = vi.fn();
  const addPage = vi.fn();
  const save = vi.fn();
  const click = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(html2canvas).mockResolvedValue(canvas);
    vi.mocked(jsPDF).mockImplementation(() => ({
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
      addImage,
      addPage,
      save,
    }) as never);
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:chronicle"), revokeObjectURL: vi.fn() });
    vi.stubGlobal("document", { createElement: vi.fn(() => ({ click, download: "", href: "" })) });
  });

  it("downloads a PNG long image", async () => {
    await exportDiaryAsLongImage(captureTarget, "my-growth-archive");

    expect(html2canvas).toHaveBeenCalledWith(captureTarget, expect.objectContaining({ scale: 2, useCORS: true }));
    expect(document.createElement).toHaveBeenCalledWith("a");
    expect(click).toHaveBeenCalledOnce();
  });

  it("creates a multipage PDF from a long archive canvas", async () => {
    await exportDiaryAsPdf(captureTarget, "my-growth-archive");

    expect(jsPDF).toHaveBeenCalledOnce();
    expect(addImage).toHaveBeenCalled();
    expect(addPage).toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith("my-growth-archive.pdf");
  });
});
