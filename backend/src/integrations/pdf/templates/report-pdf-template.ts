export type ReportPdfDocument = {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  periodLabel: string;
  metrics: Array<{
    label: string;
    value: string | number;
  }>;
  sections: Array<{
    title: string;
    emptyMessage: string;
    columns: Array<{
      label: string;
      align?: "left" | "right" | "center";
    }>;
    rows: Array<Array<string | number | null | undefined>>;
  }>;
};

export function reportPdfHtml(report: ReportPdfDocument) {
  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(report.title)}</title>
        <style>${reportPdfCss()}</style>
      </head>
      <body>
        <main class="page">
          <header class="header">
            <div>
              <span class="eyebrow">Relatorio gerencial</span>
              <h1>${escapeHtml(report.title)}</h1>
              ${report.subtitle ? `<p>${escapeHtml(report.subtitle)}</p>` : ""}
            </div>
            <div class="meta">
              <strong>${escapeHtml(report.periodLabel)}</strong>
              <span>Gerado em ${formatDateTime(report.generatedAt)}</span>
            </div>
          </header>

          <section class="metrics">
            ${report.metrics
              .map(
                (metric) => `
                  <article>
                    <span>${escapeHtml(metric.label)}</span>
                    <strong>${escapeHtml(String(metric.value))}</strong>
                  </article>
                `,
              )
              .join("")}
          </section>

          ${report.sections.map(reportSectionHtml).join("")}
        </main>
      </body>
    </html>
  `;
}

function reportSectionHtml(section: ReportPdfDocument["sections"][number]) {
  const rowsHtml =
    section.rows.length > 0
      ? section.rows
          .map(
            (row) => `
              <tr>
                ${row
                  .map((cell, index) => {
                    const align = section.columns[index]?.align ?? "left";

                    return `<td class="${alignClass(align)}">${escapeHtml(String(cell ?? ""))}</td>`;
                  })
                  .join("")}
              </tr>
            `,
          )
          .join("")
      : `<tr><td colspan="${section.columns.length}">${escapeHtml(section.emptyMessage)}</td></tr>`;

  return `
    <section class="section">
      <h2>${escapeHtml(section.title)}</h2>
      <table>
        <thead>
          <tr>
            ${section.columns
              .map(
                (column) =>
                  `<th class="${alignClass(column.align ?? "left")}">${escapeHtml(column.label)}</th>`,
              )
              .join("")}
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </section>
  `;
}

function reportPdfCss() {
  return `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f4f6f3;
      color: #242820;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
    }
    .page {
      min-height: 100vh;
      padding: 18px;
      background: #fbfcfb;
    }
    .header {
      align-items: flex-start;
      border-bottom: 2px solid #203466;
      display: flex;
      justify-content: space-between;
      gap: 24px;
      padding-bottom: 14px;
    }
    .eyebrow {
      color: #577049;
      display: block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .08em;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    h1 {
      color: #203466;
      font-size: 24px;
      margin: 0;
    }
    h2 {
      color: #203466;
      font-size: 14px;
      margin: 0 0 8px;
    }
    p {
      color: #5f665f;
      margin: 7px 0 0;
      max-width: 620px;
    }
    .meta {
      color: #5f665f;
      display: grid;
      gap: 4px;
      min-width: 210px;
      text-align: right;
    }
    .meta strong {
      color: #242820;
    }
    .metrics {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin: 16px 0;
    }
    article {
      background: #ffffff;
      border: 1px solid #dfe5e1;
      border-radius: 7px;
      min-height: 58px;
      padding: 9px;
    }
    article span {
      color: #5f665f;
      display: block;
      font-size: 10px;
      margin-bottom: 6px;
    }
    article strong {
      color: #242820;
      display: block;
      font-size: 16px;
    }
    .section {
      margin-top: 14px;
      page-break-inside: avoid;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th {
      background: #203466;
      color: #ffffff;
      font-size: 10px;
      padding: 7px;
      text-transform: uppercase;
    }
    td {
      border-bottom: 1px solid #dfe5e1;
      padding: 7px;
      vertical-align: top;
    }
    tbody tr:nth-child(even) td {
      background: #f4f6f3;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
  `;
}

function alignClass(align: "left" | "right" | "center") {
  if (align === "right") {
    return "text-right";
  }

  if (align === "center") {
    return "text-center";
  }

  return "";
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
