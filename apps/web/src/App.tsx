import { Component, useMemo, useState, type ReactNode } from 'react';
import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowRight,
  ArrowUpDown,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  FlaskConical,
  Layers,
  LayoutDashboard,
  ListFilter,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import {
  calculateFloatExposure,
  calculateScenarios,
  createDemoSandbox,
  defaultScenario,
  DEMO_FEE_POLICY,
  evaluateProduct,
  FEATURE_FLAGS,
  findPriceThreshold,
  formatGbp,
  formatMargin,
  parseGbpToPence,
  parsePercentToBps,
  scenarioInputSchema,
  SCORING_VERSION,
  type Evaluation,
  type Product,
  type ScenarioInput,
} from '@research/domain';
import { demoProducts } from '@research/fixtures';
import { Button } from './components/ui/button';
import { exportCsv } from './lib/export';
import { Portfolio } from './components/Portfolio';

const navigation = [
  ['/', 'Overview', LayoutDashboard],
  ['/products', 'Product explorer', Layers],
  ['/shortlist', 'Compare & watchlist', ListFilter],
  ['/research', 'Evidence lab', FlaskConical],
  ['/profit', 'Profit calculator', ChartNoAxesCombined],
  ['/suppliers', 'Suppliers', ShieldCheck],
  ['/runs', 'Research runs', ArrowUpDown],
  ['/reports', 'Reports', Download],
  ['/settings', 'Settings', Settings],
] as const;
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Europe/London',
      }).format(new Date(value))
    : 'Not recorded';
const human = (value: string) => value.replaceAll('_', ' ').toLowerCase();
function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <CircleHelp size={30} />
      <h2>{title}</h2>
      <p>{children}</p>
      <Button asChild variant="outline">
        <Link to="/products">
          Explore demo leads <ArrowRight size={15} />
        </Link>
      </Button>
    </div>
  );
}
function Heading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{children}</p>
      </div>
      {action}
    </div>
  );
}
function Stat({ label, value, note }: { label: string; value: ReactNode; note: string }) {
  return (
    <div className="card stat">
      <div>{label}</div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Empty title="The demo could not load">
        Reload the page to reset session edits. No data has been sent to a server.
      </Empty>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('fieldwork-theme') === 'dark');
  const [selected, setSelected] = useState<string[]>([]);
  const [watched, setWatched] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [runs, setRuns] = useState<
    { id: string; at: string; results: { product: Product; evaluation: Evaluation }[] }[]
  >([]);
  const query = useQuery({ queryKey: ['demo-products-v1'], queryFn: async () => demoProducts });
  const products = useMemo(() => query.data ?? [], [query.data]);
  const evaluated = useMemo(
    () => products.map((product) => ({ product, evaluation: evaluateProduct(product) })),
    [products],
  );
  function toggle(id: string) {
    setSelected((previous) => {
      if (previous.includes(id)) return previous.filter((x) => x !== id);
      if (previous.length === 5) {
        setNotice('Compare supports up to five products. Remove one to add another.');
        return previous;
      }
      return [...previous, id];
    });
  }
  function watch(id: string) {
    setWatched((previous) =>
      previous.includes(id) ? previous.filter((x) => x !== id) : [...previous, id],
    );
  }
  function run() {
    const at = new Date().toISOString();
    setRuns((previous) => [
      {
        id: `DEMO-${previous.length + 1}`,
        at,
        results: products.map((product) => ({
          product,
          evaluation: evaluateProduct(product, defaultScenario(product), at),
        })),
      },
      ...previous,
    ]);
    setNotice('Demo screening complete. No supplier or marketplace was contacted.');
  }
  const toggleTheme = () => {
    setDark(!dark);
    localStorage.setItem('fieldwork-theme', !dark ? 'dark' : 'light');
  };
  return (
    <div className={`app ${dark ? 'dark' : ''}`}>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-icon">
            <ChartNoAxesCombined size={24} />
          </span>
          <span>
            fieldwork<small>PRODUCT INTELLIGENCE</small>
          </span>
        </Link>
        <div className="workspace">
          <span className="avatar">UK</span>
          <div>
            Research workspace<small>United Kingdom · GBP</small>
          </div>
          <Badge>DEMO</Badge>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navigation.map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end={path === '/'}>
              <Icon size={18} />
              {label}
              {path === '/products' && <span className="nav-count">20</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck size={21} />
          <b>Evidence before confidence.</b>
          <p>Research assistant — not a guarantee of sales.</p>
          <Link to="/settings">
            View safeguards <ArrowRight size={13} />
          </Link>
        </div>
        <div className="profile">
          <span className="avatar">D</span>
          <div>
            Demo researcher<small>Session only · no sign-in</small>
          </div>
          <button className="icon-button" onClick={toggleTheme} aria-label="Toggle colour theme">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>
            Workspace <span className="muted">/</span> Research
          </span>
          <div>
            <Badge tone="green">UK · GBP</Badge>
            <details className="mobile-menu">
              <summary>More</summary>
              <nav aria-label="More workspace pages">
                {navigation.slice(5).map(([path, label]) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={(e) => e.currentTarget.closest('details')?.removeAttribute('open')}
                  >
                    {label}
                  </Link>
                ))}
                <Link to="/onboarding">Quick start</Link>
                <Link to="/imports">Import scope</Link>
              </nav>
            </details>
            <Button asChild variant="ghost" size="sm">
              <Link to="/onboarding">
                <CircleHelp size={16} /> Quick start
              </Link>
            </Button>
            <button
              className="icon-button mobile-theme"
              onClick={toggleTheme}
              aria-label="Toggle colour theme"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <div className="demo-banner">
          <FlaskConical size={16} />
          <strong>DEMO DATA</strong>
          <span>20 historical, unverified leads. No live prices, sales or approved products.</span>
          <Link to="/research">
            Why evidence matters <ArrowRight size={14} />
          </Link>
        </div>
        <main id="main" tabIndex={-1}>
          <ErrorBoundary>
            {notice && (
              <div role="status" className="notice">
                {notice}
                <button
                  className="icon-button"
                  onClick={() => setNotice('')}
                  aria-label="Dismiss notification"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {query.isPending ? (
              <p role="status">Loading demo leads…</p>
            ) : query.isError ? (
              <Empty title="Demo fixtures unavailable">
                Reload to try again. No external connection is needed.
              </Empty>
            ) : (
              <Routes>
                <Route
                  path="/"
                  element={
                    <Dashboard entries={evaluated} run={run} lastRun={runs[0]?.at ?? null} />
                  }
                />
                <Route
                  path="/products"
                  element={
                    <Explorer
                      products={products}
                      selected={selected}
                      toggle={toggle}
                      watched={watched}
                      watch={watch}
                    />
                  }
                />
                <Route
                  path="/products/:id"
                  element={
                    <Detail
                      products={products}
                      toggle={toggle}
                      selected={selected}
                      watch={watch}
                      watched={watched}
                    />
                  }
                />
                <Route
                  path="/shortlist"
                  element={
                    <Compare
                      products={products}
                      selected={selected}
                      toggle={toggle}
                      watched={watched}
                      watch={watch}
                    />
                  }
                />
                <Route
                  path="/profit"
                  element={
                    <>
                      <Heading
                        eyebrow="MANUAL WHAT-IF SCENARIOS"
                        title="Know what stays in your pocket."
                      >
                        Calculate contribution before overhead and income tax. These are
                        assumptions, not marketplace price advice.
                      </Heading>
                      <Calculator />
                    </>
                  }
                />
                <Route path="/research" element={<EvidenceLab />} />
                <Route
                  path="/suppliers"
                  element={
                    <>
                      <Heading
                        eyebrow="SUPPLIER DUE DILIGENCE"
                        title="Permission is still pending."
                      >
                        Historical supplier names do not establish an approved wholesale fulfilment
                        arrangement.
                      </Heading>
                      <div className="grid two">
                        {['Wholesale Finds UK', 'Avasam'].map((name) => (
                          <section className="card" key={name}>
                            <Badge tone="amber">UNVERIFIED</Badge>
                            <h2>{name}</h2>
                            <p>
                              {products.filter((p) => p.supplier === name).length} historical leads
                              · no connected feed
                            </p>
                            <dl>
                              <dt>Fulfilment permission</dt>
                              <dd>Not documented</dd>
                              <dt>Stock / delivery / returns</dt>
                              <dd>Not verified</dd>
                              <dt>Last source refresh</dt>
                              <dd>Not recorded</dd>
                            </dl>
                            <p>
                              Document source rights, individual dispatch, VAT basis, UK delivery
                              and returns before operational approval. Supplier document storage is
                              reserved for P2/P3.
                            </p>
                          </section>
                        ))}
                      </div>
                    </>
                  }
                />
                <Route
                  path="/runs"
                  element={
                    <>
                      <Heading
                        eyebrow="LOCAL DEMO SCREENING"
                        title="A reproducible research trail."
                        action={
                          <Button onClick={run}>
                            <FlaskConical size={16} /> Run demo screen
                          </Button>
                        }
                      >
                        Evaluates existing fixtures only. Runs reset when this page is reloaded; no
                        scheduled jobs or live refresh.
                      </Heading>
                      {runs.length === 0 ? (
                        <Empty title="No demo screening run yet">
                          Use Run demo screen to evaluate all 20 historical leads and record each
                          reason in this session.
                        </Empty>
                      ) : (
                        runs.map((r) => (
                          <section className="card section" key={r.id}>
                            <div className="section-title">
                              <h2>{r.id}</h2>
                              <Badge>COMPLETED · DEMO</Badge>
                            </div>
                            <p>
                              {date(r.at)} · {SCORING_VERSION} · {r.results.length} candidates ·{' '}
                              {r.results.filter((e) => e.evaluation.rating !== null).length} scored
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => exportCsv(r.results, r.id, r.at)}
                            >
                              Export this snapshot
                            </Button>
                            <details>
                              <summary>All candidate decisions</summary>
                              {r.results.map((e) => (
                                <p key={e.product.id}>
                                  <Link to={`/products/${e.product.id}`}>{e.product.title}</Link> —{' '}
                                  {human(e.evaluation.status)}:{' '}
                                  {e.evaluation.gates
                                    .filter((g) => !g.passed)
                                    .map((g) => g.code)
                                    .join(', ')}
                                </p>
                              ))}
                            </details>
                          </section>
                        ))
                      )}
                    </>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <>
                      <Heading
                        eyebrow="AUDITABLE OUTPUT"
                        title="The full picture, including the gaps."
                      >
                        Export all 20 demo candidates with provenance, assumptions and every
                        hard-gate reason. Unknowns stay blank.
                      </Heading>
                      <section className="card">
                        <h2>Demo research report · CSV</h2>
                        <p>{SCORING_VERSION} · 20 leads · 0 final ratings · no private data</p>
                        <Button onClick={() => exportCsv(evaluated)}>
                          {' '}
                          <Download size={16} /> Download demo CSV
                        </Button>
                        <p>
                          Generated locally in your browser. Spreadsheet formula prefixes are
                          escaped. XLSX and private signed downloads are future milestones.
                        </p>
                      </section>
                    </>
                  }
                />
                <Route path="/settings" element={<SettingsPage />} />
                <Route
                  path="/imports"
                  element={
                    <Empty title="Supplier imports are a later milestone">
                      P3 will add private CSV preview, mapping and validation. For P0/P1, the
                      supplied 20-lead fixture is loaded automatically; private uploads are
                      unavailable on this public demo.
                    </Empty>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <Empty title="Explore without an account">
                      This is an open demo, not an authenticated workspace. Supabase Auth and
                      private storage are reserved for P2. No credentials are required.
                    </Empty>
                  }
                />
                <Route
                  path="/onboarding"
                  element={
                    <>
                      <Heading eyebrow="WELCOME TO FIELDWORK" title="A clearer way to research.">
                        Start with what is known. Make the missing evidence visible. Keep every
                        decision explainable.
                      </Heading>
                      <section className="card">
                        <ol className="guide">
                          <li>Explore 20 historical leads; source costs are unverified.</li>
                          <li>Open a product to review its identity, sources and hard gates.</li>
                          <li>Enter hypothetical costs in the calculator to model contribution.</li>
                          <li>Compare up to five products and watch candidates in this session.</li>
                          <li>Use the separate synthetic evidence lab to understand scoring.</li>
                          <li>Run a demo screen and export the full report.</li>
                        </ol>
                        <Button asChild>
                          <Link to="/products">
                            Start exploring <ArrowRight size={16} />
                          </Link>
                        </Button>
                      </section>
                    </>
                  }
                />
                <Route
                  path="*"
                  element={
                    <Empty title="Page not found">
                      This route is unavailable. Return to the product explorer to continue your
                      research.
                    </Empty>
                  }
                />
              </Routes>
            )}
          </ErrorBoundary>
          <footer>
            FIELDWORK · DEMO WORKSPACE{' '}
            <span>
              Research assistant — not a guarantee of sales. No listing or fulfilment automation.
            </span>
          </footer>
        </main>
        <nav className="mobile-nav">
          {navigation.slice(0, 5).map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end={path === '/'}>
              <Icon size={19} />
              <span>{label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
function Dashboard({
  entries,
  run,
  lastRun,
}: {
  entries: { product: Product; evaluation: Evaluation }[];
  run: () => void;
  lastRun: string | null;
}) {
  const counts = [
    { name: 'Imported leads', count: entries.length },
    {
      name: 'Complete costs',
      count: entries.filter((e) => e.evaluation.economics.complete).length,
    },
    { name: 'Score eligible', count: entries.filter((e) => e.evaluation.rating !== null).length },
    {
      name: 'For review',
      count: entries.filter((e) => e.evaluation.status === 'APPROVED_FOR_REVIEW').length,
    },
  ];
  return (
    <>
      <Heading
        eyebrow="YOUR RESEARCH, WITH CONTEXT"
        title="Good decisions start with evidence."
        action={
          <Button onClick={run}>
            <FlaskConical size={16} /> Run demo screen
          </Button>
        }
      >
        A focused view of your UK product pipeline. Twenty leads to investigate. No shortcuts to
        approval.
      </Heading>
      <div className="grid stats">
        <Stat label="Candidates imported" value="20" note="Historical source · unverified" />
        <Stat label="Evidence incomplete" value="20" note="Ratings withheld until complete" />
        <Stat label="Verified shortlist" value="0" note="Zero is a valid outcome" />
        <Stat label="Safety flags" value="2" note="Title-based battery / PPE cautions" />
      </div>
      <div className="grid dashboard-grid">
        <section className="card">
          <div className="section-title">
            <div>
              <div className="eyebrow">THE RESEARCH PIPELINE</div>
              <h2>Every stage has a reason.</h2>
            </div>
            <Badge>20 → 0</Badge>
          </div>
          <p>Actual fixture counts. We never force a top three.</p>
          <div className="pipeline">
            {counts.map((stage, i) => (
              <Link key={stage.name} to="/products" className="pipeline-step">
                <span className="step-number">0{i + 1}</span>
                <b>{stage.count}</b>
                <span>{stage.name}</span>
                <div className="track">
                  <i style={{ width: `${(stage.count / 20) * 100}%` }} />
                </div>
              </Link>
            ))}
          </div>
          <div className="callout">
            <ShieldCheck size={21} />
            <div>
              <b>Missing evidence is a finding.</b>
              <p>
                All 20 leads need a verified delivered cost, exact identity and authorised demand
                evidence before a rating.
              </p>
            </div>
          </div>
        </section>
        <section className="card soft-card">
          <Badge tone="green">RESEARCH STANDARD</Badge>
          <h2>A score is only as good as its sources.</h2>
          <p>
            Understand the evidence checklist, the weighted model and the gates that a high score
            cannot override.
          </p>
          <ul className="check-list">
            <li>
              <Check size={16} /> Transparent cost assumptions
            </li>
            <li>
              <Check size={16} /> Source and freshness checks
            </li>
            <li>
              <Check size={16} /> Independent safety gates
            </li>
          </ul>
          <Button asChild variant="outline">
            <Link to="/research">
              Open evidence lab <ArrowRight size={15} />
            </Link>
          </Button>
        </section>
      </div>
      <section className="card section">
        <div className="section-title">
          <div>
            <div className="eyebrow">START WITH THE UNKNOWNS</div>
            <h2>Historical investigation leads</h2>
          </div>
          <Link className="text-link" to="/products">
            View all 20 <ArrowRight size={15} />
          </Link>
        </div>
        <p>
          The original three investigation leads were never approved. Shipping uncertainty and price
          competition require fresh evidence.
        </p>
        <div className="grid three">
          {entries.slice(0, 3).map(({ product }) => (
            <Link className="lead-preview" to={`/products/${product.id}`} key={product.id}>
              <div className="product-glyph">
                <Layers size={26} />
              </div>
              <small>{product.category}</small>
              <h3>{product.title}</h3>
              <span>
                {formatGbp(product.historicalUnitCostPence)} <small>historical source cost</small>
              </span>
              <Badge tone="amber">Rating withheld</Badge>
            </Link>
          ))}
        </div>
      </section>
      <div className="grid two">
        <section className="card">
          <h2>Source health</h2>
          <p>
            20 / 20 missing source dates. No connected supplier feeds. Stock and sales are not
            verified.
          </p>
          <Link to="/suppliers" className="text-link">
            Review suppliers <ArrowRight size={15} />
          </Link>
        </section>
        <section className="card">
          <h2>Last demo screen</h2>
          <p>{lastRun ? date(lastRun) : 'No run in this session.'}</p>
          <Link to="/runs" className="text-link">
            View run history <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </>
  );
}
function Explorer({
  products,
  selected,
  toggle,
  watched,
  watch,
}: {
  products: Product[];
  selected: string[];
  toggle: (id: string) => void;
  watched: string[];
  watch: (id: string) => void;
}) {
  const [search, setSearch] = useState(''),
    [supplier, setSupplier] = useState(''),
    [risk, setRisk] = useState(''),
    [status, setStatus] = useState(''),
    [missing, setMissing] = useState(''),
    [category, setCategory] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const rows = useMemo(
    () =>
      products.filter(
        (p) =>
          `${p.title} ${p.id} ${p.supplier}`.toLowerCase().includes(search.toLowerCase()) &&
          (!supplier || p.supplier === supplier) &&
          (!risk || p.risk === risk) &&
          (!category || p.category === category) &&
          (!status || evaluateProduct(p).status === status) &&
          (!missing || p.evidence[missing as keyof Product['evidence']] === null),
      ),
    [products, search, supplier, risk, status, missing, category],
  );
  const columns: ColumnDef<Product>[] = [
    {
      id: 'select',
      header: 'Compare',
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selected.includes(row.original.id)}
          onChange={() => toggle(row.original.id)}
          aria-label={`Compare ${row.original.title}`}
        />
      ),
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="sort-button">
          Product <ArrowUpDown size={13} />
        </button>
      ),
      cell: ({ row }) => (
        <div className="product-cell">
          <Link to={`/products/${row.original.id}`}>{row.original.title}</Link>
          <small>{row.original.id} · SKU not verified</small>
          <Badge>{row.original.category}</Badge>
        </div>
      ),
    },
    {
      accessorKey: 'supplier',
      header: 'Supplier',
      cell: ({ getValue }) => (
        <span>
          {String(getValue())}
          <small>Not connected</small>
        </span>
      ),
    },
    {
      accessorKey: 'historicalUnitCostPence',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="sort-button">
          Source cost <ArrowUpDown size={13} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span>
          {formatGbp(getValue<number | null>())}
          <small>Historical · unverified</small>
        </span>
      ),
    },
    {
      id: 'economics',
      header: 'Delivered cost / profit',
      cell: () => (
        <span>
          Not verified<small>Shipping unknown</small>
        </span>
      ),
    },
    {
      accessorKey: 'risk',
      header: 'Risk / status',
      cell: ({ row }) => (
        <>
          <Badge tone={row.original.risk === 'high' ? 'red' : 'amber'}>
            {row.original.risk === 'high' ? 'Blocked' : human(evaluateProduct(row.original).status)}
          </Badge>
          <small>{row.original.risk} risk · 0/10 evidence</small>
        </>
      ),
    },
    {
      id: 'rating',
      header: 'Rating',
      cell: () => (
        <span>
          Withheld<small>No demand evidence</small>
        </span>
      ),
    },
    {
      id: 'watch',
      header: 'Research',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => watch(row.original.id)}>
          {watched.includes(row.original.id) ? 'Watching' : 'Watch'}
        </Button>
      ),
    },
  ];
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });
  return (
    <>
      <Heading
        eyebrow="20 UNVERIFIED HISTORICAL LEADS"
        title="Your next question starts here."
        action={
          <Button
            variant="outline"
            onClick={() =>
              exportCsv(rows.map((product) => ({ product, evaluation: evaluateProduct(product) })))
            }
          >
            <Download size={16} /> Export filtered CSV
          </Button>
        }
      >
        Inspect the gaps, compare candidates and model the costs. No seed lead is approved or rated.
      </Heading>
      <section className="card table-card">
        <div className="filters">
          <label className="search">
            <Search size={16} />
            <input
              placeholder="Search products or suppliers…"
              aria-label="Search products"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter supplier"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          >
            <option value="">All suppliers</option>
            {[...new Set(products.map((p) => p.supplier))].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            aria-label="Filter category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {[...new Set(products.map((p) => p.category))].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select aria-label="Filter risk" value={risk} onChange={(e) => setRisk(e.target.value)}>
            <option value="">All risk levels</option>
            {['unknown', 'low', 'high'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            aria-label="Filter status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="RESEARCH_NEEDED">Research needed</option>
            <option value="BLOCKED">Blocked</option>
            <option value="APPROVED_FOR_REVIEW">Approved for review</option>
          </select>
          <select
            aria-label="Missing evidence"
            value={missing}
            onChange={(e) => setMissing(e.target.value)}
          >
            <option value="">Any missing data</option>
            <option value="cost">Missing cost evidence</option>
            <option value="demand">Missing demand</option>
            <option value="supplierPermission">Missing permission</option>
          </select>
        </div>
        <div className="table-summary">
          <span>{rows.length} candidates · stock and source dates unverified</span>
          <Link className="text-link" to="/shortlist">
            Compare selected ({selected.length}/5) <ArrowRight size={14} />
          </Link>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((h) => (
                    <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <Empty title="No matching leads">
            Change a filter or search term. There are no verified or approved leads in this fixture.
          </Empty>
        )}
        <div className="pagination">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </span>
          <select
            aria-label="Rows per page"
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            <option value="5">5 per page</option>
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
          </select>
          <Button
            variant="outline"
            size="icon"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </section>
    </>
  );
}
function Gates({ evaluation }: { evaluation: Evaluation }) {
  return (
    <section className="card section">
      <div className="section-title">
        <h2>Evidence & hard gates</h2>
        <Badge tone="amber">{human(evaluation.status)}</Badge>
      </div>
      <p>
        Completeness {evaluation.completeness.present}/{evaluation.completeness.total} · confidence{' '}
        {evaluation.confidence.level} ({evaluation.confidence.score}/100) · rating{' '}
        {evaluation.rating ?? 'withheld'}
      </p>
      <p>
        Gates take precedence over a score. A rating is a research priority, never permission to
        list.
      </p>
      <div className="gates">
        {evaluation.gates.map((g) => (
          <div className="gate" key={g.code}>
            <span className={g.passed ? 'pass' : 'fail'}>
              {g.passed ? <Check size={16} /> : <X size={16} />}
            </span>
            <div>
              <b>{g.label}</b>
              <p>{g.reason}</p>
              <code>{g.code}</code>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
function Detail({
  products,
  selected,
  toggle,
  watched,
  watch,
}: {
  products: Product[];
  selected: string[];
  toggle: (id: string) => void;
  watched: string[];
  watch: (id: string) => void;
}) {
  const { id } = useParams();
  const p = products.find((p) => p.id === id);
  if (!p)
    return (
      <Empty title="Product not found">This lead is not in the 20-product demo fixture.</Empty>
    );
  return (
    <>
      <Link to="/products" className="text-link">
        <ChevronLeft size={15} /> Back to explorer
      </Link>
      <Heading
        eyebrow={`${p.id} · UNVERIFIED LEAD`}
        title={p.title}
        action={
          <div className="actions">
            <Button variant="outline" onClick={() => watch(p.id)}>
              {watched.includes(p.id) ? 'Remove watch' : 'Watch lead'}
            </Button>
            <Button onClick={() => toggle(p.id)}>
              {selected.includes(p.id) ? 'Remove comparison' : 'Add to compare'}
            </Button>
          </div>
        }
      >
        {p.supplier} · {p.category} · historical source only
      </Heading>
      <div className="grid two">
        <section className="card">
          <h2>Identity & supplier offer</h2>
          <dl>
            <dt>Supplier SKU</dt>
            <dd>{p.supplierSku ?? 'Not supplied'}</dd>
            <dt>Exact variant / pack</dt>
            <dd>Not verified</dd>
            <dt>Historical source cost</dt>
            <dd>{formatGbp(p.historicalUnitCostPence)} · UNVERIFIED</dd>
            <dt>Delivery / handling</dt>
            <dd>
              Delivery unknown /{' '}
              {p.historicalHandlingPence === null
                ? 'handling unknown'
                : `${formatGbp(p.historicalHandlingPence)} historical`}
            </dd>
            <dt>Stock / delivery SLA</dt>
            <dd>Not verified</dd>
            <dt>Risk screening</dt>
            <dd>{p.risk} · requires review</dd>
          </dl>
        </section>
        <section className="card">
          <h2>Source & provenance</h2>
          <dl>
            <dt>Document / row</dt>
            <dd>{p.source.sourceRecordId}</dd>
            <dt>Recorded / valid as of</dt>
            <dd>
              {date(p.source.recordedAt)} / {date(p.source.validAsOf)}
            </dd>
            <dt>Permission / licence</dt>
            <dd>Pending / not documented</dd>
            <dt>Permitted current use</dt>
            <dd>Historical demo catalogue only</dd>
          </dl>
          <details>
            <summary>Source limitations and screening notes</summary>
            {p.notes.map((n) => (
              <p key={n}>{n}</p>
            ))}
          </details>
        </section>
      </div>
      <Gates evaluation={evaluateProduct(p)} />
      <section className="section">
        <h2>Manual scenario calculator</h2>
        <p>
          Editing costs does not verify evidence. Unspecified handling defaults to a clearly
          hypothetical £0 allowance; update it before using the scenario.
        </p>
        <Calculator key={p.id} product={p} />
      </section>
      <section className="card section">
        <h2>History & review trail</h2>
        <p>
          No dated offer snapshots or human approvals exist. Historical costs have not been
          presented as a time series. Versioned private history is a future milestone.
        </p>
      </section>
    </>
  );
}
function Compare({
  products,
  selected,
  toggle,
  watched,
  watch,
}: {
  products: Product[];
  selected: string[];
  toggle: (id: string) => void;
  watched: string[];
  watch: (id: string) => void;
}) {
  const items = products.filter((p) => selected.includes(p.id));
  return (
    <>
      <Heading eyebrow="SIDE-BY-SIDE RESEARCH" title="Compare the facts. See the gaps.">
        Select up to five products in the explorer. Selections and watchlists last for this session.
      </Heading>
      {items.length === 0 ? (
        <Empty title="No products selected">
          Select Compare beside a product in the explorer to build a side-by-side view.
        </Empty>
      ) : (
        <div className="compare-grid">
          {items.map((p) => (
            <section className="card" key={p.id}>
              <Button variant="ghost" size="sm" onClick={() => toggle(p.id)}>
                <X size={14} /> Remove
              </Button>
              <h2>
                <Link to={`/products/${p.id}`}>{p.title}</Link>
              </h2>
              <dl>
                <dt>Supplier</dt>
                <dd>{p.supplier}</dd>
                <dt>SKU / variant</dt>
                <dd>Not verified</dd>
                <dt>Historical cost</dt>
                <dd>{formatGbp(p.historicalUnitCostPence)} · unverified</dd>
                <dt>Manual historical target</dt>
                <dd>
                  {p.suggestedScenarioPricePence === null
                    ? 'Not supplied'
                    : formatGbp(p.suggestedScenarioPricePence)}
                </dd>
                <dt>Delivered cost / contribution / margin</dt>
                <dd>Not verified</dd>
                <dt>Stock / delivery / source dates</dt>
                <dd>Not verified</dd>
                <dt>Evidence / confidence</dt>
                <dd>0/10 · Low</dd>
                <dt>Risk</dt>
                <dd>{p.risk}</dd>
                <dt>Rating</dt>
                <dd>Withheld</dd>
                <dt>Status</dt>
                <dd>{human(evaluateProduct(p).status)}</dd>
                <dt>Float impact</dt>
                <dd>Unknown until supplier payment verified</dd>
              </dl>
            </section>
          ))}
        </div>
      )}
      {items.length > 0 && <Portfolio key={items.map((p) => p.id).join(',')} products={items} />}
      <section className="card section">
        <h2>Watchlist · {watched.length} leads</h2>
        {watched.length === 0 ? (
          <p>No watched leads. Use Watch in the explorer.</p>
        ) : (
          products
            .filter((p) => watched.includes(p.id))
            .map((p) => (
              <div className="watch-row" key={p.id}>
                <Link to={`/products/${p.id}`}>{p.title}</Link>
                <Button variant="ghost" size="sm" onClick={() => watch(p.id)}>
                  Remove
                </Button>
              </div>
            ))
        )}
      </section>
    </>
  );
}
type MoneyKey =
  | 'sellingPricePence'
  | 'buyerShippingPence'
  | 'supplierUnitCostPence'
  | 'supplierShippingPence'
  | 'supplierHandlingPence'
  | 'packagingPence'
  | 'otherVariableCostsPence';
const moneyFields: [MoneyKey, string][] = [
  ['sellingPricePence', 'Selling price per order (£)'],
  ['buyerShippingPence', 'Buyer postage revenue (£)'],
  ['supplierUnitCostPence', 'Supplier unit cost (£)'],
  ['supplierShippingPence', 'Supplier delivery per order (£)'],
  ['supplierHandlingPence', 'Supplier handling per order (£)'],
  ['packagingPence', 'Packaging per order (£)'],
  ['otherVariableCostsPence', 'Other variable costs (£)'],
];
function Calculator({ product }: { product?: Product }) {
  const initial = useMemo(() => defaultScenario(product), [product]);
  const [fields, setFields] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(
      moneyFields.map(([key]) => [
        key,
        initial[key] === null ? '' : (initial[key]! / 100).toFixed(2),
      ]),
    ),
    advertisingRateBps: '2',
    returnsRateBps: '3',
    supplierVatRateBps: '20',
    quantity: '1',
    expectedUnitsSold: '1',
    renewalPeriods: '0',
    supplierTaxIncluded:
      initial.supplierTaxIncluded === null ? 'unknown' : String(initial.supplierTaxIncluded),
    vatRegistered: 'false',
    concurrent: '10',
    budget: '350',
    reserve: '50',
    feeRate: '12',
  }));
  const parsed = useMemo(() => {
    try {
      const input: ScenarioInput = {
        ...initial,
        ...Object.fromEntries(
          moneyFields.map(([key]) => [
            key,
            fields[key] === '' && ['supplierUnitCostPence', 'supplierShippingPence'].includes(key)
              ? null
              : parseGbpToPence(fields[key] ?? ''),
          ]),
        ),
        advertisingRateBps: parsePercentToBps(fields.advertisingRateBps ?? ''),
        returnsRateBps: parsePercentToBps(fields.returnsRateBps ?? ''),
        supplierVatRateBps: parsePercentToBps(fields.supplierVatRateBps ?? ''),
        quantity: Number(fields.quantity),
        expectedUnitsSold: Number(fields.expectedUnitsSold),
        renewalPeriods: Number(fields.renewalPeriods),
        supplierTaxIncluded:
          fields.supplierTaxIncluded === 'unknown' ? null : fields.supplierTaxIncluded === 'true',
        vatRegistered: fields.vatRegistered === 'true',
      };
      const validated = scenarioInputSchema.parse(input);
      const policy = {
        ...DEMO_FEE_POLICY,
        finalValueTiers: [{ upToPence: null, rateBps: parsePercentToBps(fields.feeRate ?? '') }],
      };
      return { input: validated, policy, error: null };
    } catch (error) {
      return {
        input: null,
        policy: DEMO_FEE_POLICY,
        error: error instanceof Error ? error.message : 'Invalid scenario',
      };
    }
  }, [fields, initial]);
  const scenarios = useMemo(
    () => (parsed.input ? calculateScenarios(parsed.input, parsed.policy) : null),
    [parsed.input, parsed.policy],
  );
  const [solved, setSolved] = useState<{
    breakEven: number | null;
    target: number | null;
    key: string;
  } | null>(null);
  const signature = JSON.stringify(fields);
  const float = useMemo(() => {
    try {
      return calculateFloatExposure(
        [
          {
            supplierPaidPence: scenarios?.base.supplierPaidPence ?? null,
            concurrentOrders: Number(fields.concurrent),
          },
        ],
        parseGbpToPence(fields.reserve ?? ''),
        parseGbpToPence(fields.budget ?? ''),
      );
    } catch {
      return null;
    }
  }, [fields, scenarios]);
  const update = (key: string, value: string) =>
    setFields((previous) => ({ ...previous, [key]: value }));
  const field = (key: string, label: string, kind = 'decimal') => (
    <label key={key}>
      {label}
      <input
        inputMode={kind === 'decimal' ? 'decimal' : 'numeric'}
        value={fields[key] ?? ''}
        onChange={(e) => update(key, e.target.value)}
        placeholder={key === 'supplierShippingPence' ? 'Unknown — required for contribution' : ''}
      />
    </label>
  );
  return (
    <>
      <div className="grid calculator-grid">
        <section className="card">
          <div className="section-title">
            <h2>Build your scenario</h2>
            <Badge>HYPOTHETICAL</Badge>
          </div>
          <p>
            Manual inputs only. A generic £20 selling-price default is hypothetical when no
            historical target exists. Blank supplier cost or delivery remains unknown. Unspecified
            handling starts at a hypothetical £0 allowance; confirm it explicitly. Fees are
            illustrative, not a current eBay quote. All values are per order unless labelled per
            unit.
          </p>
          <div className="form-grid">
            {moneyFields.map(([key, label]) => field(key, label))}
            {field('advertisingRateBps', 'Advertising allowance (%)')}
            {field('returnsRateBps', 'Expected return loss (%)')}
            {field('feeRate', 'Illustrative category fee (%)')}
            {field('supplierVatRateBps', 'Supplier VAT rate (%)')}
            <label>
              Supplier quote VAT basis
              <select
                value={fields.supplierTaxIncluded}
                onChange={(e) => update('supplierTaxIncluded', e.target.value)}
              >
                <option value="unknown">Unknown</option>
                <option value="true">VAT included</option>
                <option value="false">VAT excluded</option>
              </select>
            </label>
            <label>
              Seller VAT scenario
              <select
                value={fields.vatRegistered}
                onChange={(e) => update('vatRegistered', e.target.value)}
              >
                <option value="false">Not VAT registered</option>
                <option value="true">VAT registered — illustrative recovery</option>
              </select>
            </label>
            {field('quantity', 'Units in this order', 'numeric')}
            {field('expectedUnitsSold', 'Expected units per listing (allocation)', 'numeric')}
            {field('renewalPeriods', 'GTC renewal periods', 'numeric')}
          </div>
          <details>
            <summary>Fee policy and rounding</summary>
            <p>
              {DEMO_FEE_POLICY.id}. Effective 16 October 2026; not verified. Default category fee
              12%, order fee £0.30 for revenue ≤£10 / £0.40 above, regulatory allowance 0.35%,
              listing £0.30 per period allocated across expected units, VAT on fees 20%. Fees
              include buyer postage. Money uses integer pence and half-away-from-zero rounding.
              Supplier VAT basis also applies to delivery and handling. Packaging and other costs
              are gross without input VAT recovery.
            </p>
          </details>
          {parsed.error && (
            <p role="alert" className="error-text">
              Enter valid non-negative amounts with at most two decimals, percentages 0–100 and
              valid whole-unit allocations.
            </p>
          )}
        </section>
        <section className="card result-card">
          <div className="eyebrow">BASE SCENARIO</div>
          <h2>Contribution before overhead & tax</h2>
          <div className="big-result">{formatGbp(scenarios?.base.contributionPence ?? null)}</div>
          <Badge tone="amber">
            {formatMargin(scenarios?.base.marginBps ?? null)} contribution margin
          </Badge>
          {scenarios && !scenarios.base.complete && (
            <div className="callout">
              <p>{scenarios.base.missing.join('. ')}.</p>
            </div>
          )}
          <dl>
            {[
              ['Buyer revenue', scenarios?.base.revenuePence],
              ['Landed economic cost', scenarios?.base.landedCostPence],
              ['Marketplace fees incl. fee VAT', scenarios?.base.fees.marketplaceGrossPence],
              ['Advertising allowance', scenarios?.base.advertisingPence],
              ['Returns allowance', scenarios?.base.returnsAllowancePence],
              ['Output VAT', scenarios?.base.outputVatPence],
              ['Input VAT recovered', scenarios?.base.inputVatRecoveredPence],
            ].map(([label, value]) => (
              <div className="dl-row" key={String(label)}>
                <dt>{label}</dt>
                <dd>{formatGbp(typeof value === 'number' ? value : null)}</dd>
              </div>
            ))}
          </dl>
          <p>
            Default financial screen requires both £4 contribution and 20% margin. Hypothetical
            economics cannot complete missing product evidence.
          </p>
          <Button
            variant="outline"
            disabled={!parsed.input || !scenarios?.base.complete}
            onClick={() => {
              if (parsed.input)
                setSolved({
                  breakEven: findPriceThreshold(parsed.input, parsed.policy, {
                    minContributionPence: 0,
                    minMarginBps: 0,
                  }),
                  target: findPriceThreshold(parsed.input, parsed.policy),
                  key: signature,
                });
            }}
          >
            Calculate break-even & target scenarios
          </Button>
          {solved?.key === signature && (
            <p>
              Smallest price at break-even: <b>{formatGbp(solved.breakEven)}</b>
              <br />
              Smallest price satisfying £4 AND 20%: <b>{formatGbp(solved.target)}</b>
              <br />
              <small>
                Bounded £0–£1,000 search. No solution in range is shown as not verified; manual
                planning only.
              </small>
            </p>
          )}
        </section>
      </div>
      {scenarios && (
        <>
          <div className="grid three section">
            {(['optimistic', 'base', 'stress'] as const).map((key) => (
              <section className="card" key={key}>
                <div className="eyebrow">{key.toUpperCase()} · HYPOTHETICAL</div>
                <h2>{formatGbp(scenarios[key].contributionPence)}</h2>
                <p>{formatMargin(scenarios[key].marginBps)} margin</p>
                <small>
                  {key === 'stress'
                    ? 'Selling price −10%, delivery +20%, returns +50%, one extra listing renewal.'
                    : key === 'optimistic'
                      ? scenarios.optimisticNote
                      : 'Your current manual inputs and illustrative fee assumptions.'}
                </small>
              </section>
            ))}
          </div>
          {scenarios.stressWarning && (
            <p className="callout">
              Stress scenario fails the default financial targets. It must be reviewed independently
              of base economics.
            </p>
          )}
        </>
      )}
      <section className="card section">
        <h2>Working capital · portfolio float</h2>
        <p>
          Planning range £200–£500; default budget £350. Supplier payments before platform proceeds,
          plus reserve. Compare multiple scenarios by summing their supplier payments with their own
          order volumes; no payout date is assumed.
        </p>
        <div className="form-grid">
          {field('concurrent', 'Concurrent unsettled orders', 'numeric')}
          {field('budget', 'Cash budget (£)')}
          {field('reserve', 'Reserve (£)')}
        </div>
        {float ? (
          <p>
            Exposure <b>{formatGbp(float.exposurePence)}</b> · available{' '}
            <b>{formatGbp(float.availablePence)}</b>{' '}
            {float.exceedsBudget && <Badge tone="red">Budget exceeded</Badge>}
            {float.missing.join(' ')}
          </p>
        ) : (
          <p role="alert">
            Enter valid whole order counts and non-negative budget / reserve amounts.
          </p>
        )}
      </section>
    </>
  );
}
function EvidenceLab() {
  const [mode, setMode] = useState('missing');
  const sandbox = useMemo(() => {
    const s = createDemoSandbox();
    if (mode === 'missing') s.product.evidence.demand = null;
    if (mode === 'permission')
      s.product.evidence.supplierPermission!.permissionDecision = 'rejected';
    if (mode === 'safety') s.product.risk = 'high';
    return s;
  }, [mode]);
  const result = evaluateProduct(sandbox.product, sandbox.scenario);
  return (
    <>
      <Heading eyebrow="ISOLATED SYNTHETIC EXAMPLE" title="See exactly why a rating exists.">
        This lab uses a fictional desk organiser, separate from the 20 historical leads. Every sales
        count, supplier document and cost below is synthetic DEMO data.
      </Heading>
      <section className="card">
        <label>
          Evidence experiment
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="missing">Remove demand evidence → withhold rating</option>
            <option value="complete">Complete synthetic evidence → explain rating</option>
            <option value="permission">Complete evidence, supplier rejected → block</option>
            <option value="safety">Complete evidence, high safety risk → block</option>
          </select>
        </label>
        <p>
          <Badge tone="amber">DEMO ONLY</Badge> Synthetic desk organiser · 1 unit · fictional
          wholesaler · £6 unit + £2 delivery · £25 manual selling scenario. No seed product has been
          changed.
        </p>
        <h2>
          Rating: {result.rating ?? 'withheld'} {result.rating !== null && '/100'} ·{' '}
          {human(result.status)}
        </h2>
        <p>
          Model {result.algorithmVersion}. Weights: profitability 30, demand 25, competition 20,
          supplier 15, risk 10. These are ranking labels, not approval or probability of sales.
        </p>
        {result.components.length > 0 && (
          <>
            <div
              className="chart"
              role="img"
              aria-label="Synthetic component scores; exact values and inputs follow"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={result.components}
                  layout="vertical"
                  margin={{ left: 5, right: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="component" width={95} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#24745e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {result.components.map((c) => (
              <details key={c.component} className="score-detail">
                <summary>
                  {c.component}: {c.score.toFixed(1)}/100 × {c.weight}% ={' '}
                  {c.weightedPoints.toFixed(1)} points
                </summary>
                <p>
                  Input: {c.rawMetric} ({c.unit}).
                </p>
                <p>Normalisation: {c.normalisation}</p>
                <p>
                  Source: {c.dataSource}. Valid as of {date(c.validAsOf)}.
                </p>
                <p>{c.limitations}</p>
              </details>
            ))}
          </>
        )}
        <details>
          <summary>Exact synthetic evidence records</summary>
          {Object.entries(sandbox.product.evidence).map(([key, value]) => (
            <p key={key}>
              <b>{key}</b>: {value ? JSON.stringify(value) : 'Missing'}
            </p>
          ))}
        </details>
      </section>
      <Gates evaluation={result} />
    </>
  );
}
function SettingsPage() {
  return (
    <>
      <Heading eyebrow="TRANSPARENT BY DEFAULT" title="The rules behind the research.">
        P0/P1 assumptions are documented and versioned. Persistent workspace administration starts
        in P2.
      </Heading>
      <div className="grid two">
        <section className="card">
          <h2>Financial assumptions</h2>
          <dl>
            <dt>Currency / time zone</dt>
            <dd>GBP / Europe/London</dd>
            <dt>Minimum contribution / margin</dt>
            <dd>£4 AND 20%</dd>
            <dt>Float planning range</dt>
            <dd>£200–£500 · default £350</dd>
            <dt>Fee policy</dt>
            <dd>{DEMO_FEE_POLICY.id} · illustrative, unverified</dd>
          </dl>
          <Link to="/profit" className="text-link">
            Edit hypothetical calculator inputs <ArrowRight size={15} />
          </Link>
        </section>
        <section className="card">
          <h2>Integrations & permissions</h2>
          {Object.entries(FEATURE_FLAGS).map(([key, value]) => (
            <p key={key}>
              <code>{key}</code>
              <Badge tone="amber">{String(value)}</Badge>
            </p>
          ))}
          <p>
            No network provider is connected. No scraping fallback, price modelling from eBay
            content, seller OAuth or publishing actions exist.
          </p>
        </section>
        <section className="card">
          <h2>Data & access</h2>
          <p>
            All assets are public when hosted on Pages. This demo has no authentication. Do not
            enter confidential data. Research edits, runs and watchlists reset on reload. Theme
            preference alone persists locally.
          </p>
          <Link to="/login" className="text-link">
            Access information <ArrowRight size={15} />
          </Link>
        </section>
        <section className="card">
          <h2>Research model</h2>
          <p>
            {SCORING_VERSION} · evidence freshness: cost and stock 7 days, demand and competition 14
            days, operational reviews 90 days. Expired permissions and prohibited sources fail
            closed.
          </p>
          <Link to="/research" className="text-link">
            Inspect synthetic scoring <ArrowRight size={15} />
          </Link>
          <p>
            Scheduling, team management, retention controls and owner settings require the later
            private backend.
          </p>
          <Link to="/imports">Supplier import scope</Link>
        </section>
      </div>
    </>
  );
}
