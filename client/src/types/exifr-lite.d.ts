declare module "exifr/dist/full.esm.mjs" {
  const exifr: {
    parse: (input: ArrayBuffer, pick: string[]) => Promise<Record<string, Date | string | undefined> | undefined>;
  };

  export default exifr;
}
