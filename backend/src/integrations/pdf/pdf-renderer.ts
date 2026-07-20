import { existsSync } from "node:fs";
import puppeteer from "puppeteer";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";

export type PdfRenderOptions = {
  html: string;
  landscape?: boolean;
};

export async function renderPdf({
  html,
  landscape = false,
}: PdfRenderOptions): Promise<Buffer> {
  const executablePath = resolvePuppeteerExecutablePath();
  const browser = await puppeteer.launch({
    args: puppeteerArgs(),
    executablePath,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      landscape,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function puppeteerArgs() {
  return env.puppeteer.noSandbox
    ? ["--no-sandbox", "--disable-setuid-sandbox"]
    : [];
}

function resolvePuppeteerExecutablePath() {
  const { executablePath } = env.puppeteer;

  if (!executablePath) {
    return undefined;
  }

  if (existsSync(executablePath)) {
    return executablePath;
  }

  throw new AppError(
    `Chrome/Chromium nao encontrado em ${executablePath}. Configure PUPPETEER_EXECUTABLE_PATH com um caminho valido.`,
    503,
  );
}
