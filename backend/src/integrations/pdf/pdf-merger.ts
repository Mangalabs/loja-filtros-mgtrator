import { PDFDocument } from "pdf-lib";

export async function mergePdfBuffers(files: Buffer[]) {
  const mergedDocument = await PDFDocument.create();

  for (const file of files) {
    const document = await PDFDocument.load(file);
    const pages = await mergedDocument.copyPages(
      document,
      document.getPageIndices(),
    );

    pages.forEach((page) => mergedDocument.addPage(page));
  }

  return Buffer.from(await mergedDocument.save());
}
