import type { Report } from './reportBuilder'

// jsPDF and write-excel-file are dynamically imported so they only load when the
// user actually exports a PDF / Excel file (kept out of the main bundle).

export async function toPdf(r: Report, fileName: string): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const M = 40
  const PW = 595 - 2 * M
  const PH = 842
  let y = M
  const ensure = (need: number) => {
    if (y + need > PH - M) {
      doc.addPage()
      y = M
    }
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(r.title, M, y)
  y += 20
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Generated ${r.generatedAt}`, M, y)
  y += 18
  doc.setTextColor(30)

  for (const s of r.sections) {
    ensure(30)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(s.title, M, y)
    y += 15
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    if (s.kind === 'text' && s.text) {
      for (const line of doc.splitTextToSize(s.text, PW)) {
        ensure(13)
        doc.text(line, M, y)
        y += 12
      }
    } else if (s.kind === 'kv' && s.kv) {
      for (const [k, v] of s.kv) {
        ensure(13)
        doc.text(`${k}:`, M, y)
        doc.text(String(v), M + 190, y)
        y += 12
      }
    } else if (s.kind === 'table' && s.table) {
      const cols = s.table.headers.length || 1
      const colW = PW / cols
      const drawRow = (cells: (string | number)[], bold: boolean) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        // wrap every cell; the row is as tall as its tallest cell (no data dropped)
        const wrapped = cells.map((c) => doc.splitTextToSize(String(c), colW - 6) as string[])
        const lines = Math.max(1, ...wrapped.map((w) => w.length))
        ensure(lines * 11 + 2)
        wrapped.forEach((w, i) => {
          w.forEach((ln, li) => doc.text(ln, M + i * colW, y + li * 11))
        })
        y += lines * 11 + 2
      }
      drawRow(s.table.headers, true)
      for (const row of s.table.rows) drawRow(row, false)
    }
    y += 8
  }
  doc.save(fileName)
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export async function toExcel(r: Report, fileName: string): Promise<void> {
  const mod = await import('write-excel-file/browser')
  const writeXlsxFile = mod.default as any
  type Cell = { value: string | number | null; type?: unknown; fontWeight?: string } | null
  const cell = (v: string | number | null | undefined): Cell =>
    v == null ? null : typeof v === 'number' && Number.isFinite(v) ? { type: Number, value: v } : { value: String(v) }
  const bold = (v: string | number): Cell => ({ value: v == null ? '' : String(v), fontWeight: 'bold' })

  const rows: Cell[][] = []
  rows.push([bold(r.title)])
  rows.push([bold('Generated'), cell(r.generatedAt)])
  rows.push([])
  for (const s of r.sections) {
    rows.push([bold(s.title)])
    if (s.kind === 'text' && s.text) rows.push([cell(s.text)])
    else if (s.kind === 'kv' && s.kv) for (const [k, v] of s.kv) rows.push([cell(k), cell(v)])
    else if (s.kind === 'table' && s.table) {
      rows.push(s.table.headers.map((h) => bold(h)))
      for (const row of s.table.rows) rows.push(row.map((c) => cell(c)))
    }
    rows.push([])
  }
  // pad rows to a uniform column count
  const width = Math.max(1, ...rows.map((row) => row.length))
  const padded = rows.map((row) => {
    const c = [...row]
    while (c.length < width) c.push(null)
    return c
  })
  // write-excel-file v4 browser API: returns { toBlob, toFile } — { fileName } is
  // ignored, so we take the Blob and download it ourselves.
  const writer = await writeXlsxFile(padded, { sheet: 'Report' })
  const blob: Blob = await writer.toBlob()
  downloadBlob(blob, fileName)
}
