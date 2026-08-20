declare module "exifr/dist/full.esm.mjs" {
  const exifr: {
    parse: (input: ArrayBuffer, pick: string[]) => Promise<Record<string, Date | string | undefined> | undefined>;
    gps: (input: ArrayBuffer) => Promise<{ latitude?: number; longitude?: number } | undefined>;
  };

  export default exifr;
}
