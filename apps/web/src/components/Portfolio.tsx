import { useState } from 'react';
import { calculateFloatExposure, formatGbp, parseGbpToPence, type Product } from '@research/domain';
export function Portfolio({ products }: { products: Product[] }) {
  const [payments, setPayments] = useState<Record<string, string>>({});
  const [volumes, setVolumes] = useState<Record<string, string>>({});
  const [reserve, setReserve] = useState('50'),
    [budget, setBudget] = useState('350');
  let result: ReturnType<typeof calculateFloatExposure> | null = null;
  let error = '';
  try {
    result = calculateFloatExposure(
      products.map((p) => ({
        supplierPaidPence: payments[p.id] ? parseGbpToPence(payments[p.id]!) : null,
        concurrentOrders: Number(volumes[p.id] ?? '1'),
      })),
      parseGbpToPence(reserve),
      parseGbpToPence(budget),
    );
  } catch {
    error = 'Use non-negative amounts with at most two decimals and whole order counts.';
  }
  return (
    <section className="card section">
      <h2>Portfolio float · selected products</h2>
      <p>
        Hypothetical supplier payment per order must include quantity, delivery, handling and
        nonrecoverable tax. Blank is unknown. This does not verify any historical lead.
      </p>
      {products.map((p) => (
        <div className="form-grid" key={p.id}>
          <label>
            {p.title} — supplier payment (£)
            <input
              inputMode="decimal"
              value={payments[p.id] ?? ''}
              placeholder="Unknown"
              onChange={(e) => setPayments({ ...payments, [p.id]: e.target.value })}
            />
          </label>
          <label>
            {p.title} — unsettled orders
            <input
              inputMode="numeric"
              value={volumes[p.id] ?? '1'}
              onChange={(e) => setVolumes({ ...volumes, [p.id]: e.target.value })}
            />
          </label>
        </div>
      ))}
      <div className="form-grid">
        <label>
          Portfolio reserve (£)
          <input inputMode="decimal" value={reserve} onChange={(e) => setReserve(e.target.value)} />
        </label>
        <label>
          Portfolio budget (£)
          <input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </label>
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <p>
          Portfolio exposure: <b>{formatGbp(result?.exposurePence ?? null)}</b> · Available:{' '}
          <b>{formatGbp(result?.availablePence ?? null)}</b>
          {result?.exceedsBudget && <strong className="error-text"> · Budget exceeded</strong>}
          {result?.missing.map((m) => (
            <span key={m}> {m}</span>
          ))}
        </p>
      )}
      <small>
        Planning cash pool £200–£500; no proceeds timing or verified supplier commitment is assumed.
      </small>
    </section>
  );
}
