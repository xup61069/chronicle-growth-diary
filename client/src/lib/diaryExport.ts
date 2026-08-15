/** Browser-only export utilities for a private growth-diary archive. */

async function capture(node: HTMLElement) {
  const { default: html2canvas } = await import("html2canvas");
  return html2canvas(node, {
    backgroundColor: "#f7f4ec",
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
  });
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportDiaryAsLongImage(node: HTMLElement, baseName: string) {
  const canvas = await capture(node);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("無法建立長圖片檔案。");
  downloadBlob(blob, `${baseName}.png`);
}

export async function exportDiaryAsPdf(node: HTMLElement, baseName: string) {
  const canvas = await capture(node);
  const { jsPDF } = await import("jspdf");
  const image = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageHeight = (canvas.height * pageWidth) / canvas.width;
  let renderedHeight = 0;

  while (renderedHeight < imageHeight) {
    if (renderedHeight > 0) pdf.addPage();
    pdf.addImage(image, "PNG", 0, -renderedHeight, pageWidth, imageHeight, undefined, "FAST");
    renderedHeight += pageHeight;
  }
  pdf.save(`${baseName}.pdf`);
}
