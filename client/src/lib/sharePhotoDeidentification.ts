export type FaceRegion = { xMin: number; yMin: number; width: number; height: number };

export type DeidentifiedPhoto = {
  file: File;
  faceCount: number;
};

export function padFaceRegions(regions: FaceRegion[], imageWidth: number, imageHeight: number, paddingRatio = 0.28): FaceRegion[] {
  return regions
    .filter((region) => Number.isFinite(region.xMin) && Number.isFinite(region.yMin) && region.width > 0 && region.height > 0)
    .map((region) => {
      const padding = Math.max(region.width, region.height) * paddingRatio;
      const xMin = Math.max(0, region.xMin - padding);
      const yMin = Math.max(0, region.yMin - padding);
      const xMax = Math.min(imageWidth, region.xMin + region.width + padding);
      const yMax = Math.min(imageHeight, region.yMin + region.height + padding);
      return { xMin, yMin, width: Math.max(0, xMax - xMin), height: Math.max(0, yMax - yMin) };
    })
    .filter((region) => region.width > 0 && region.height > 0);
}

function loadImage(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("無法載入選定的照片。")); };
    image.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("無法建立去識別化圖片。")), "image/jpeg", 0.9));
}

/** Draws source pixels and blurs padded face rectangles in an in-memory browser canvas. */
export async function blurPhotoRegions(source: Blob, regions: FaceRegion[], outputName: string): Promise<DeidentifiedPhoto> {
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("目前瀏覽器無法建立本機影像畫布。" );
  context.drawImage(image, 0, 0);
  const padded = padFaceRegions(regions, canvas.width, canvas.height);
  for (const region of padded) {
    const blurPadding = Math.ceil(Math.max(region.width, region.height) * 0.15);
    const sourceX = Math.max(0, Math.floor(region.xMin - blurPadding));
    const sourceY = Math.max(0, Math.floor(region.yMin - blurPadding));
    const sourceWidth = Math.min(canvas.width - sourceX, Math.ceil(region.width + blurPadding * 2));
    const sourceHeight = Math.min(canvas.height - sourceY, Math.ceil(region.height + blurPadding * 2));
    const patch = document.createElement("canvas");
    patch.width = sourceWidth;
    patch.height = sourceHeight;
    const patchContext = patch.getContext("2d");
    if (!patchContext) continue;
    patchContext.drawImage(canvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
    context.save();
    context.filter = `blur(${Math.max(12, Math.round(Math.max(region.width, region.height) * 0.28))}px)`;
    context.drawImage(patch, sourceX, sourceY, sourceWidth, sourceHeight);
    context.restore();
  }
  const jpeg = await canvasToJpeg(canvas);
  return { file: new File([jpeg], outputName.replace(/\.[^.]+$/, "") + "-blurred.jpg", { type: "image/jpeg" }), faceCount: padded.length };
}

/** Runs a TensorFlow.js detector in the browser. Photo bytes and detected regions never leave the device. */
export async function detectFacesLocally(source: Blob): Promise<FaceRegion[]> {
  const image = await loadImage(source);
  const tf = await import("@tensorflow/tfjs-core");
  await import("@tensorflow/tfjs-backend-webgl");
  await import("@tensorflow/tfjs-backend-cpu");
  const faceDetection = await import("@tensorflow-models/face-detection");
  try {
    const webglReady = await tf.setBackend("webgl");
    if (!webglReady) throw new Error("webgl-unavailable");
  } catch {
    await tf.setBackend("cpu");
  }
  await tf.ready();
  const detector = await faceDetection.createDetector(faceDetection.SupportedModels.MediaPipeFaceDetector, { runtime: "tfjs", modelType: "full", maxFaces: 10 });
  try {
    const faces = await detector.estimateFaces(image);
    return faces.map((face) => ({ xMin: face.box.xMin, yMin: face.box.yMin, width: face.box.width, height: face.box.height }));
  } finally {
    detector.dispose();
  }
}

export async function createDeidentifiedPhoto(source: Blob, outputName: string, detector = detectFacesLocally) {
  const regions = await detector(source);
  if (!regions.length) return { status: "no_faces" as const, faceCount: 0 };
  const result = await blurPhotoRegions(source, regions, outputName);
  return { status: "ready" as const, ...result };
}
