import { describe, it, expect } from 'vitest';
import { csvCell, reportCsv } from './export';
import { demoProducts } from '@research/fixtures';
import { evaluateProduct } from '@research/domain';
describe('auditable demo CSV', () => {
  it('escapes quotes and spreadsheet formula injection', () => {
    expect(csvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"');
    expect(csvCell('  +SUM(1)')).toBe('"\'  +SUM(1)"');
    expect(csvCell(null)).toBe('""');
  });
  it('exports all seed decisions with missing ratings and provenance', () => {
    const report = reportCsv(
      demoProducts.map((product) => ({ product, evaluation: evaluateProduct(product) })),
      'DEMO-1',
      '2026-10-17T12:00:00Z',
    );
    expect(report.split('\r\n')).toHaveLength(21);
    expect(report).toContain('DEMO_UNVERIFIED');
    expect(report).toContain('twenty_unverified_leads.csv');
    expect(report).toContain('SUPPLIER_PERMISSION');
    expect(report).not.toContain('APPROVED_FOR_REVIEW');
  });
});
