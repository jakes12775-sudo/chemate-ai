import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function wrapLine(text: string, limit = 92) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > limit) {
      if (current) {
        lines.push(current);
      }
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export async function buildLabReportPdf(args: {
  title: string;
  objective: string;
  introduction: string;
  apparatusAndReagents: string;
  procedure: string;
  results: string;
  observations: string;
  calculations: string;
  discussion: string;
  conclusion: string;
  references: string[];
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595.28, 841.89]);
  let cursorY = 790;
  const marginX = 54;
  const sectionGap = 16;
  const bodyColor = rgb(0.1, 0.16, 0.28);
  const accentColor = rgb(0.03, 0.56, 0.92);

  function ensureSpace(linesNeeded = 4) {
    if (cursorY > 70 + linesNeeded * 16) {
      return;
    }
    page = pdf.addPage([595.28, 841.89]);
    cursorY = 790;
  }

  function drawTitle(text: string) {
    page.drawText(text, {
      x: marginX,
      y: cursorY,
      size: 22,
      font: bold,
      color: accentColor,
    });
    cursorY -= 30;
  }

  function drawSection(label: string, content: string | string[]) {
    ensureSpace(Array.isArray(content) ? content.length + 3 : 6);
    page.drawText(label, {
      x: marginX,
      y: cursorY,
      size: 14,
      font: bold,
      color: bodyColor,
    });
    cursorY -= 20;

    const entries = Array.isArray(content) ? content : [content];
    for (const entry of entries) {
      const wrapped = wrapLine(entry);
      for (const line of wrapped) {
        ensureSpace(2);
        page.drawText(line, {
          x: marginX,
          y: cursorY,
          size: 11,
          font: regular,
          color: bodyColor,
        });
        cursorY -= 15;
      }
      cursorY -= 4;
    }

    cursorY -= sectionGap;
  }

  drawTitle(args.title);
  drawSection("Objective", args.objective);
  drawSection("Introduction", args.introduction);
  drawSection("Apparatus and Reagents", args.apparatusAndReagents);
  drawSection("Procedure", args.procedure);
  drawSection("Results", args.results);
  drawSection("Observations", args.observations);
  drawSection("Discussion / Calculations", `${args.calculations}\n\n${args.discussion}`);
  drawSection("Conclusions", args.conclusion);
  drawSection("References", args.references);

  return pdf.save();
}
