import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  CircleAlert,
  Database,
  GitCompareArrows,
  Info,
  Layers3,
  LineChart as LineChartIcon,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  GradingCompany,
  ListingAssessment,
  MarketTier,
  ResponseEnvelope,
  SearchInput,
  SearchResult,
} from '@/src/domain/types';
import { formatMoney, formatPercent } from '@/src/engine/money';
import { cardMarketService } from '@/src/services/card-market-service';
import { isSyntheticEnvelope } from '@/src/webmcp/register-tools';

type View = 'market' | 'compare' | 'methodology' | 'sources';
type GradeFilter = 'ANY' | 'RAW' | 'PSA_10' | 'CGC_10' | 'BGS_95';

const DEFAULT_QUERY = 'Ember Dragon ex';
const MarketChart = lazy(() =>
  import('@/components/market-chart').then((module) => ({ default: module.MarketChart })),
);

function tierLabel(tier: MarketTier): string {
  if (tier.kind === 'RAW') return `Raw · ${tier.condition.replaceAll('_', ' ')}`;
  return `${tier.company} ${tier.grade}`;
}

function displayClassification(value: ListingAssessment['deal']['classification']): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function searchInput(
  query: string,
  gradeFilter: GradeFilter,
  budget: string,
  minimumTrust: string,
  minimumBelow: string,
): SearchInput {
  const input: SearchInput = { query, limit: 20 };
  const budgetNumber = Number(budget);
  const trustNumber = Number(minimumTrust);
  const belowNumber = Number(minimumBelow);
  if (Number.isFinite(budgetNumber) && budgetNumber > 0) input.maxTotalCents = Math.round(budgetNumber * 100);
  if (Number.isFinite(trustNumber) && trustNumber > 0) input.minimumSellerTrust = trustNumber;
  if (Number.isFinite(belowNumber) && belowNumber > 0) input.minimumPercentBelowMarket = belowNumber;
  if (gradeFilter === 'RAW') input.rawOrGraded = 'RAW';
  if (gradeFilter !== 'ANY' && gradeFilter !== 'RAW') {
    input.rawOrGraded = 'GRADED';
    const [company, grade] = gradeFilter.split('_');
    input.gradingCompany = company as GradingCompany;
    input.grade = Number(grade) / (grade === '95' ? 10 : 1);
  }
  return input;
}

export function CardScoutApp() {
  const initialSearch = useMemo(
    () => cardMarketService.searchCards({ query: DEFAULT_QUERY, limit: 20 }),
    [],
  );
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [submittedQuery, setSubmittedQuery] = useState(DEFAULT_QUERY);
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('ANY');
  const [budget, setBudget] = useState('');
  const [minimumTrust, setMinimumTrust] = useState('');
  const [minimumBelow, setMinimumBelow] = useState('');
  const [searchResults, setSearchResults] = useState<ResponseEnvelope<SearchResult[]>>(initialSearch);
  const [selectedCardId, setSelectedCardId] = useState(initialSearch.data[0]?.card.id ?? '');
  const [selectedListingId, setSelectedListingId] = useState(
    initialSearch.data[0]?.bestListing?.listing.id ?? '',
  );
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [view, setView] = useState<View>('market');
  const [toolActivity, setToolActivity] = useState<string | null>(null);

  const cardState = useMemo(
    () => (selectedCardId ? cardMarketService.getCardMarketState(selectedCardId) : undefined),
    [selectedCardId],
  );
  const selectedAssessment =
    cardState?.data.assessments.find((assessment) => assessment.listing.id === selectedListingId) ??
    cardState?.data.assessments[0];
  const rawVsGraded = useMemo(
    () => (selectedCardId ? cardMarketService.compareRawVsGraded(selectedCardId) : undefined),
    [selectedCardId],
  );
  const comparison = useMemo(
    () => (compareIds.length >= 2 ? cardMarketService.compareListings(compareIds) : undefined),
    [compareIds],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ toolName: string; result: unknown }>).detail;
      if (!detail || !isSyntheticEnvelope(detail.result)) return;
      const envelope = detail.result as ResponseEnvelope<unknown>;
      setToolActivity(`${detail.toolName.replaceAll('_', ' ')} updated the visible workspace`);
      if (envelope.uiState.query !== undefined) {
        setQuery(envelope.uiState.query);
        setSubmittedQuery(envelope.uiState.query);
      }
      if (envelope.uiState.selectedCardId) setSelectedCardId(envelope.uiState.selectedCardId);
      if (envelope.uiState.selectedListingIds?.length) {
        setSelectedListingId(envelope.uiState.selectedListingIds[0]);
        if (envelope.uiState.selectedListingIds.length >= 2) {
          setCompareIds(envelope.uiState.selectedListingIds.slice(0, 5));
          setView('compare');
        } else {
          setView('market');
        }
      }
      if (detail.toolName === 'search_cards') {
        setSearchResults(detail.result as ResponseEnvelope<SearchResult[]>);
        setView('market');
      }
    };
    window.addEventListener('cardscout:webmcp-result', handler);
    return () => window.removeEventListener('cardscout:webmcp-result', handler);
  }, []);

  const runSearch = () => {
    const input = searchInput(query.trim(), gradeFilter, budget, minimumTrust, minimumBelow);
    const result = cardMarketService.searchCards(input);
    setSubmittedQuery(input.query);
    setSearchResults(result);
    const first = result.data[0];
    if (first) {
      setSelectedCardId(first.card.id);
      if (first.bestListing) setSelectedListingId(first.bestListing.listing.id);
    }
    setView('market');
  };

  const runPreset = (presetQuery: string) => {
    const input = searchInput(presetQuery, 'ANY', '', '', '');
    const result = cardMarketService.searchCards(input);
    setQuery(presetQuery);
    setSubmittedQuery(presetQuery);
    setGradeFilter('ANY');
    setBudget('');
    setMinimumTrust('');
    setMinimumBelow('');
    setSearchResults(result);
    const first = result.data[0];
    if (first) {
      setSelectedCardId(first.card.id);
      if (first.bestListing) setSelectedListingId(first.bestListing.listing.id);
    }
    setView('market');
  };

  const selectCard = (result: SearchResult) => {
    setSelectedCardId(result.card.id);
    if (result.bestListing) setSelectedListingId(result.bestListing.listing.id);
    setView('market');
  };

  const toggleCompare = (listingId: string) => {
    setCompareIds((current) => {
      if (current.includes(listingId)) return current.filter((id) => id !== listingId);
      if (current.length >= 5) return current;
      return [...current, listingId];
    });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0c121b]/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-7">
          <button className="flex items-center gap-3 text-left" onClick={() => setView('market')}>
            <span className="grid size-9 place-items-center rounded-xl bg-[#d8ff67] text-[#13200c] shadow-[0_0_24px_rgba(216,255,103,.22)]">
              <BarChart3 className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold tracking-[-0.02em]">CardScout</span>
              <span className="block text-[9px] uppercase tracking-[0.17em] text-white/45">Collector intelligence</span>
            </span>
          </button>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {([
              ['market', 'Market'],
              ['compare', `Compare${compareIds.length ? ` (${compareIds.length})` : ''}`],
              ['methodology', 'Methodology'],
              ['sources', 'Data sources'],
            ] as Array<[View, string]>).map(([key, label]) => (
              <Button
                key={key}
                variant="ghost"
                aria-pressed={view === key}
                onClick={() => setView(key)}
                className={view === key ? 'bg-white/10 text-white hover:bg-white/15' : 'text-white/65 hover:bg-white/8 hover:text-white'}
              >
                {label}
              </Button>
            ))}
          </nav>
          <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100">
            Synthetic demo
          </Badge>
        </div>
      </header>

      <div className="border-b border-amber-200 bg-amber-50 text-amber-950">
        <div className="mx-auto flex max-w-[1500px] items-start gap-2 px-4 py-2.5 text-xs leading-5 sm:items-center sm:px-7">
          <CircleAlert className="mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden="true" />
          Every listing, sale, seller, and marketplace shown here is fictional synthetic demonstration data. No live marketplace is connected.
        </div>
      </div>

      {toolActivity ? (
        <output className="block border-b border-lime-200 bg-lime-50 text-lime-950">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-2 text-xs sm:px-7">
            <span className="flex items-center gap-2"><Bot className="size-4" /> {toolActivity}</span>
            <button aria-label="Dismiss agent activity" onClick={() => setToolActivity(null)}><X className="size-4" /></button>
          </div>
        </output>
      ) : null}

      {view === 'market' ? (
        <MarketView
          query={query}
          setQuery={setQuery}
          runSearch={runSearch}
          runPreset={runPreset}
          gradeFilter={gradeFilter}
          setGradeFilter={setGradeFilter}
          budget={budget}
          setBudget={setBudget}
          minimumTrust={minimumTrust}
          setMinimumTrust={setMinimumTrust}
          minimumBelow={minimumBelow}
          setMinimumBelow={setMinimumBelow}
          results={searchResults.data}
          submittedQuery={submittedQuery}
          selectedCardId={selectedCardId}
          selectCard={selectCard}
          selectedAssessment={selectedAssessment}
          assessments={cardState?.data.assessments ?? []}
          rawVsGraded={rawVsGraded?.data}
          compareIds={compareIds}
          toggleCompare={toggleCompare}
          setSelectedListingId={setSelectedListingId}
          setView={setView}
        />
      ) : null}
      {view === 'compare' ? (
        <CompareView
          compareIds={compareIds}
          comparison={comparison?.data}
          remove={(id) => setCompareIds((current) => current.filter((item) => item !== id))}
          back={() => setView('market')}
        />
      ) : null}
      {view === 'methodology' ? <MethodologyView /> : null}
      {view === 'sources' ? <SourcesView /> : null}

      <nav className="sticky bottom-0 z-30 grid grid-cols-4 border-t bg-white/95 p-2 shadow-[0_-8px_28px_rgba(15,23,42,.08)] backdrop-blur md:hidden">
        {([
          ['market', 'Market', Search],
          ['compare', 'Compare', GitCompareArrows],
          ['methodology', 'Methods', LineChartIcon],
          ['sources', 'Sources', Database],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium ${view === key ? 'bg-slate-100 text-slate-950' : 'text-slate-500'}`}
          >
            <Icon className="size-4" />{label}
          </button>
        ))}
      </nav>
    </main>
  );
}

interface MarketViewProps {
  query: string;
  setQuery: (value: string) => void;
  runSearch: () => void;
  runPreset: (query: string) => void;
  gradeFilter: GradeFilter;
  setGradeFilter: (value: GradeFilter) => void;
  budget: string;
  setBudget: (value: string) => void;
  minimumTrust: string;
  setMinimumTrust: (value: string) => void;
  minimumBelow: string;
  setMinimumBelow: (value: string) => void;
  results: SearchResult[];
  submittedQuery: string;
  selectedCardId: string;
  selectCard: (result: SearchResult) => void;
  selectedAssessment?: ListingAssessment;
  assessments: ListingAssessment[];
  rawVsGraded?: ReturnType<typeof cardMarketService.compareRawVsGraded>['data'];
  compareIds: string[];
  toggleCompare: (listingId: string) => void;
  setSelectedListingId: (listingId: string) => void;
  setView: (view: View) => void;
}

function MarketView(props: MarketViewProps) {
  const {
    query,
    setQuery,
    runSearch,
    runPreset,
    gradeFilter,
    setGradeFilter,
    budget,
    setBudget,
    minimumTrust,
    setMinimumTrust,
    minimumBelow,
    setMinimumBelow,
    results,
    submittedQuery,
    selectedCardId,
    selectCard,
    selectedAssessment,
    assessments,
    rawVsGraded,
    compareIds,
    toggleCompare,
    setSelectedListingId,
    setView,
  } = props;

  return (
    <>
      <section className="border-b bg-[#101925] text-white">
        <div className="mx-auto grid max-w-[1500px] gap-7 px-4 py-8 sm:px-7 lg:grid-cols-[minmax(0,1.3fr)_340px] lg:py-10">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#d8ff67]">
              <Sparkles className="size-3.5" /> Exact card, variant, and grade matching
            </div>
            <h1 className="max-w-3xl text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-[42px] sm:leading-[1.05]">
              Know the market before you make the offer.
            </h1>
            <form
              className="mt-6 flex max-w-4xl flex-col gap-2 rounded-2xl border border-white/12 bg-white/7 p-2 shadow-2xl shadow-black/15 sm:flex-row"
              onSubmit={(event) => { event.preventDefault(); runSearch(); }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  aria-label="Search cards"
                  data-testid="search-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-11 border-0 bg-transparent pl-10 text-white placeholder:text-slate-500 focus-visible:ring-[#d8ff67]/50"
                  placeholder="Try: Ember Dragon ex PSA 10"
                />
              </div>
              <Button data-testid="search-submit" type="submit" className="h-11 bg-[#d8ff67] px-5 text-[#14200d] hover:bg-[#c8ed5f]">
                Search market <ChevronRight />
              </Button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {([
                ['ANY', 'All tiers'],
                ['RAW', 'Raw'],
                ['PSA_10', 'PSA 10'],
                ['CGC_10', 'CGC 10'],
                ['BGS_95', 'BGS 9.5'],
              ] as Array<[GradeFilter, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={gradeFilter === value}
                  onClick={() => setGradeFilter(value)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${gradeFilter === value ? 'border-[#d8ff67]/60 bg-[#d8ff67]/12 text-[#e7ffa2]' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <aside className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Buyer criteria</p>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              <FilterInput label="Max total $" value={budget} onChange={setBudget} placeholder="500" />
              <FilterInput label="Min trust" value={minimumTrust} onChange={setMinimumTrust} placeholder="85" />
              <FilterInput label="Min % below" value={minimumBelow} onChange={setMinimumBelow} placeholder="8" />
            </div>
            <p className="mt-3 text-[11px] leading-4 text-slate-500">Filters apply on Search. Unknown evidence never becomes a zero score.</p>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Normalized cards</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Results for “{submittedQuery}”</h2>
          </div>
          <p className="text-xs text-muted-foreground">{results.length} canonical card{results.length === 1 ? '' : 's'} · ranked by evidence-adjusted score</p>
        </div>
        {results.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="search-results">
            {results.map((result) => (
              <button
                key={result.card.id}
                onClick={() => selectCard(result)}
                aria-pressed={selectedCardId === result.card.id}
                className={`flex items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selectedCardId === result.card.id ? 'border-[#1d7557] ring-2 ring-[#1d7557]/10' : 'border-slate-200'}`}
              >
                <CardMark cardName={result.card.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{result.card.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{result.card.setName} · {result.card.cardNumber}</span>
                  <span className="mt-2 flex flex-wrap gap-1">
                    {result.tiers.slice(0, 3).map((tier) => <Badge key={tierLabel(tier)} variant="secondary">{tierLabel(tier)}</Badge>)}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-xl font-semibold">{result.bestListing?.deal.score ?? '—'}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Deal</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Card className="border-dashed py-10 text-center" data-testid="empty-results">
            <CardContent>
              <p className="font-medium">No synthetic record matches every criterion.</p>
              <p className="mt-1 text-sm text-muted-foreground">Try Ember Dragon, Volt Lynx, or Tide Oracle and relax one filter.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {selectedAssessment ? (
        <section className="border-y bg-white">
          <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-7">
            <div className="grid gap-7 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,.75fr)]">
              <div>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex gap-4">
                    <CardMark cardName={selectedAssessment.listing.identity.name} large />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold tracking-[-0.035em]">{selectedAssessment.listing.identity.name}</h2>
                        <Badge className="bg-[#192638] text-white">{tierLabel(selectedAssessment.listing.tier)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedAssessment.listing.identity.setName} ({selectedAssessment.listing.identity.setCode}) · {selectedAssessment.listing.identity.cardNumber} · {selectedAssessment.listing.identity.language.toLowerCase()}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">{selectedAssessment.listing.identity.variant} · {selectedAssessment.listing.identity.finish.replaceAll('_', ' ').toLowerCase()} · {selectedAssessment.listing.identity.printing}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedAssessment.market.confidenceLabel} comp confidence</Badge>
                    <Badge variant="outline">As of Aug 29, 2026</Badge>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricCard label="90-day median" value={formatMoney(selectedAssessment.market.median90)} sub={`${selectedAssessment.market.count90} exact sales`} />
                  <MetricCard label="Latest sale" value={formatMoney(selectedAssessment.market.latestSale ? { amountCents: selectedAssessment.market.latestSale.price.amountCents + (selectedAssessment.market.latestSale.shipping?.amountCents ?? 0), currency: selectedAssessment.market.latestSale.price.currency } : undefined)} sub={selectedAssessment.market.latestSale ? new Date(selectedAssessment.market.latestSale.soldAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unavailable'} />
                  <MetricCard label="30-day median" value={formatMoney(selectedAssessment.market.median30)} sub={`${selectedAssessment.market.count30} exact sales`} />
                  <MetricCard label="Clean 90-day range" value={selectedAssessment.market.cleanedLow90 && selectedAssessment.market.cleanedHigh90 ? `${formatMoney(selectedAssessment.market.cleanedLow90)}–${formatMoney(selectedAssessment.market.cleanedHigh90).replace('$', '')}` : 'Unavailable'} sub={`${selectedAssessment.market.anomalySaleIds.length} anomaly flagged`} />
                </div>

                <Card className="mt-5 border-0 bg-slate-50 ring-1 ring-slate-200">
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Exact-tier sale history</CardTitle>
                    <span className="text-xs text-muted-foreground">Item + known shipping</span>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<div className="h-[240px] animate-pulse rounded-xl bg-slate-100" />}>
                      <MarketChart assessment={selectedAssessment} />
                    </Suspense>
                  </CardContent>
                </Card>
              </div>

              <aside className="rounded-2xl bg-[#101925] p-5 text-white shadow-xl shadow-slate-950/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Selected listing</p>
                    <p className="mt-2 text-sm font-medium">{selectedAssessment.listing.provenance.providerLabel}</p>
                    <p className="text-xs text-slate-400">{selectedAssessment.seller.displayName}</p>
                  </div>
                  <ScoreDial value={selectedAssessment.deal.score} label="Deal Score" />
                </div>
                <div className="mt-5 flex items-end justify-between border-y border-white/10 py-4">
                  <div>
                    <p className="text-xs text-slate-400">Total acquisition</p>
                    <p className="mt-0.5 text-3xl font-semibold tracking-[-0.045em]">{formatMoney(selectedAssessment.deal.totalAcquisition)}</p>
                    <p className="mt-1 text-xs text-slate-400">Item + known shipping · taxes excluded</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#d8ff67]">{formatPercent(selectedAssessment.deal.percentFromMedian90)}</p>
                    <p className="text-xs text-slate-400">vs 90-day median</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <DarkMetric label="Seller Trust" value={selectedAssessment.sellerTrust.score === null ? 'Withheld' : `${selectedAssessment.sellerTrust.score}/100`} sub={`${selectedAssessment.sellerTrust.coverage}% evidence`} />
                  <DarkMetric label="Classification" value={displayClassification(selectedAssessment.deal.classification)} sub="Not investment advice" />
                </div>
                <div className="mt-4 space-y-2">
                  {selectedAssessment.risks.slice(0, 3).map((risk) => (
                    <div key={risk.code} className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-4">
                      {risk.severity === 'INFO' ? <Info className="mt-0.5 size-3.5 shrink-0 text-slate-400" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-300" />}
                      <span><strong className="block text-white">{risk.label}</strong><span className="text-slate-400">{risk.evidence}</span></span>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </section>
      ) : null}

      {assessments.length ? (
        <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-7">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Current availability</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Compare every exact listing</h2>
            </div>
            {compareIds.length >= 2 ? <Button onClick={() => setView('compare')}>Compare {compareIds.length} <ArrowRight /></Button> : null}
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {assessments.map((assessment) => (
              <ListingCard
                key={assessment.listing.id}
                assessment={assessment}
                selected={selectedAssessment?.listing.id === assessment.listing.id}
                compared={compareIds.includes(assessment.listing.id)}
                onInspect={() => setSelectedListingId(assessment.listing.id)}
                onCompare={() => toggleCompare(assessment.listing.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {rawVsGraded ? (
        <section className="border-t bg-[#edf1f4]">
          <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-7">
            <div className="mb-4 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tier comparison</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Raw versus graded, without false equivalence</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{rawVsGraded.note}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[...rawVsGraded.raw, ...rawVsGraded.graded].map((entry) => (
                <Card key={tierLabel(entry.tier)} className="border-0 bg-white ring-1 ring-slate-200">
                  <CardContent>
                    <Badge variant="secondary">{tierLabel(entry.tier)}</Badge>
                    <p className="mt-4 text-2xl font-semibold tracking-[-0.04em]">{formatMoney(entry.market.median90)}</p>
                    <p className="text-xs text-muted-foreground">90-day exact median · {entry.market.count90} sales</p>
                    <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-semibold">{entry.market.confidenceScore}/100</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <AgentPanel runPreset={runPreset} />
      <DisclaimerFooter />
    </>
  );
}

function FilterInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder={placeholder} className="border-white/10 bg-white/5 text-white placeholder:text-slate-600" />
    </label>
  );
}

function CardMark({ cardName, large = false }: { cardName: string; large?: boolean }) {
  const initials = cardName.split(/\s+/).slice(0, 2).map((word) => word[0]).join('');
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-[#f6b94c] via-[#dc4943] to-[#26314f] text-white shadow-lg ${large ? 'h-28 w-20' : 'h-20 w-14'}`} aria-label={`Synthetic placeholder for ${cardName}`}>
      <span className="absolute inset-1 rounded-[5px] border border-white/30" />
      <span className="text-sm font-bold tracking-[0.16em]">{initials}</span>
      <span className="absolute bottom-2 text-[7px] font-bold tracking-[0.16em]">DEMO</span>
    </span>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="rounded-xl border bg-slate-50 p-3"><p className="text-[10px] uppercase tracking-[0.11em] text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tracking-[-0.03em]">{value}</p><p className="mt-0.5 text-xs text-muted-foreground">{sub}</p></div>;
}

function DarkMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="rounded-xl bg-white/5 p-3"><p className="text-[10px] uppercase tracking-[0.11em] text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p><p className="mt-0.5 text-[11px] text-slate-500">{sub}</p></div>;
}

function ScoreDial({ value, label }: { value: number | null; label: string }) {
  const score = value ?? 0;
  return (
    <div className="grid size-20 shrink-0 place-items-center rounded-full p-1" style={{ background: `conic-gradient(#d8ff67 ${score * 3.6}deg, rgba(255,255,255,.1) 0deg)` }}>
      <div className="grid size-full place-items-center rounded-full bg-[#101925] text-center"><span><strong className="block text-xl leading-none">{value ?? '—'}</strong><span className="text-[8px] uppercase tracking-wide text-slate-400">{label}</span></span></div>
    </div>
  );
}


function ListingCard({ assessment, selected, compared, onInspect, onCompare }: { assessment: ListingAssessment; selected: boolean; compared: boolean; onInspect: () => void; onCompare: () => void }) {
  return (
    <Card data-testid="listing-card" className={`border-0 bg-white shadow-sm ring-1 ${selected ? 'ring-[#1d7557]' : 'ring-slate-200'}`}>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div><Badge variant="secondary">{tierLabel(assessment.listing.tier)}</Badge><p className="mt-2 font-semibold">{assessment.listing.provenance.providerLabel}</p><p className="text-xs text-muted-foreground">{assessment.seller.displayName}</p></div>
          <div className="text-right"><p className="text-2xl font-semibold tracking-[-0.04em]">{formatMoney(assessment.deal.totalAcquisition)}</p><p className={`text-xs font-medium ${(assessment.deal.percentFromMedian90 ?? 0) <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatPercent(assessment.deal.percentFromMedian90)}</p></div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-y py-3">
          <MiniScore label="Deal" value={assessment.deal.score} />
          <MiniScore label="Trust" value={assessment.sellerTrust.score} />
          <MiniScore label="Comps" value={assessment.market.confidenceScore} />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          {assessment.listing.imageCount} photos · {assessment.listing.returnsAccepted ? 'Returns accepted' : 'No returns'} · {assessment.risks.filter((risk) => risk.severity !== 'INFO').length} alerts
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onInspect}>Inspect evidence</Button>
          <Button variant={compared ? 'secondary' : 'outline'} onClick={onCompare}>{compared ? <><Check /> Added</> : <><GitCompareArrows /> Compare</>}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniScore({ label, value }: { label: string; value: number | null }) {
  return <div className="text-center"><p className="text-lg font-semibold">{value ?? '—'}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p></div>;
}

function CompareView({ compareIds, comparison, remove, back }: { compareIds: string[]; comparison?: ReturnType<typeof cardMarketService.compareListings>['data']; remove: (id: string) => void; back: () => void }) {
  if (compareIds.length < 2 || !comparison) {
    return (
      <section className="mx-auto max-w-[1100px] px-4 py-16 text-center sm:px-7">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-900 text-[#d8ff67]"><GitCompareArrows /></div>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">Select two to five listings</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Add listings from a card’s availability grid to compare acquisition cost, market delta, seller evidence, and risk.</p>
        <Button className="mt-6" onClick={back}>Return to market</Button>
      </section>
    );
  }
  return (
    <section className="mx-auto max-w-[1500px] px-4 py-9 sm:px-7">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Evidence-aligned comparison</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Compare {comparison.assessments.length} listings</h1><p className="mt-2 text-sm text-muted-foreground">{comparison.summary}</p></div><Button variant="outline" onClick={back}>Add more listings</Button></div>
      <Card className="border-0 bg-white ring-1 ring-slate-200">
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Listing</TableHead><TableHead>Total</TableHead><TableHead>Vs 90-day</TableHead><TableHead>Deal</TableHead><TableHead>Trust</TableHead><TableHead>Exact comps</TableHead><TableHead>Alerts</TableHead><TableHead><span className="sr-only">Remove</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {comparison.assessments.map((assessment) => (
                <TableRow key={assessment.listing.id} className={comparison.strongestListingId === assessment.listing.id ? 'bg-lime-50' : ''}>
                  <TableCell><div className="flex items-center gap-2"><span>{assessment.listing.provenance.providerLabel}<span className="block text-xs text-muted-foreground">{tierLabel(assessment.listing.tier)}</span></span>{comparison.strongestListingId === assessment.listing.id ? <Badge className="bg-[#1d7557]">Strongest</Badge> : null}</div></TableCell>
                  <TableCell className="font-semibold">{formatMoney(assessment.deal.totalAcquisition)}</TableCell>
                  <TableCell>{formatPercent(assessment.deal.percentFromMedian90)}</TableCell>
                  <TableCell>{assessment.deal.score ?? '—'}</TableCell>
                  <TableCell>{assessment.sellerTrust.score ?? '—'}</TableCell>
                  <TableCell>{assessment.market.count90}</TableCell>
                  <TableCell>{assessment.risks.filter((risk) => risk.severity !== 'INFO').length}</TableCell>
                  <TableCell><Button variant="ghost" size="icon-sm" aria-label={`Remove ${assessment.listing.id}`} onClick={() => remove(assessment.listing.id)}><X /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">Scores compare available evidence only. Review the underlying listing and certification evidence before purchasing.</p>
    </section>
  );
}

function AgentPanel({ runPreset }: { runPreset: (query: string) => void }) {
  const examples = ['Best CGC 10 Ember Dragon deal', 'PSA 10 cards under $500', 'Compare raw versus graded'];
  return (
    <section className="bg-[#0c121b] text-white">
      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-9 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#d8ff67] text-[#14200d]"><Bot /></span><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d8ff67]">Human + agent workflow</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Six WebMCP tools use the same market engine and visible workspace.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">An agent can search, assess, compare, filter deals, or contrast raw and graded tiers. Every tool is read-only, returns provenance and limitations, and updates what you see.</p></div></div>
        <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">{examples.map((example) => <button key={example} onClick={() => runPreset(example.includes('PSA') ? 'Volt Lynx PSA 10' : 'Ember Dragon ex')} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10">{example}</button>)}</div>
      </div>
    </section>
  );
}

function MethodologyView() {
  const steps = [
    ['Normalize identity', 'Set, code, number, variant, finish, edition, language, printing, condition, grader, and grade form deterministic keys.'],
    ['Match exact comps', 'Raw and graded tiers never pool. PSA 10, PSA 9, BGS 9.5, and CGC 10 remain separate markets.'],
    ['Use robust statistics', '30/90-day medians, recency-weighted median, log-price MAD anomaly flags, dispersion, and exact sale counts.'],
    ['Score transparently', 'Deal Score weights price 40%, comp evidence 20%, seller trust 20%, listing quality 10%, and liquidity 10%.'],
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-10 sm:px-7">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Transparent by design</p>
      <h1 className="mt-1 max-w-3xl text-4xl font-semibold tracking-[-0.045em]">A score should be inspectable, reproducible, and willing to say “unknown.”</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">CardScout never turns asking prices into sales, aggregate guide values into a latest sale, or missing seller evidence into a zero. Estimates are withheld when fewer than three exact comps are available.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">{steps.map(([title, body], index) => <Card key={title} className="border-0 bg-white ring-1 ring-slate-200"><CardContent><span className="text-xs font-semibold text-[#1d7557]">0{index + 1}</span><h2 className="mt-2 text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p></CardContent></Card>)}</div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2"><MethodCard title="Deal Score v1.0" icon={BarChart3} items={['40% price versus exact 90-day median', '20% comparable-sale confidence', '20% Seller Trust', '10% listing quality', '10% exact-tier liquidity']} /><MethodCard title="Seller Trust v1.0" icon={ShieldCheck} items={['35% feedback confidence with sample adjustment', '15% transaction volume', '15% recent rating mix', '10% tenure', '10% returns and verified indicators', '10% relevant selling history', '5% listing consistency']} /></div>
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong>Important:</strong> CardScout reports evidence and warning signals. It does not authenticate cards, accuse sellers of fraud, guarantee profit, or provide investment advice.</div>
      <DisclaimerFooter />
    </section>
  );
}

function MethodCard({ title, icon: Icon, items }: { title: string; icon: typeof BarChart3; items: string[] }) {
  return <Card className="border-0 bg-[#101925] text-white ring-0"><CardContent><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#d8ff67] text-[#14200d]"><Icon /></span><h2 className="text-xl font-semibold">{title}</h2></div><ul className="mt-5 space-y-3">{items.map((item) => <li key={item} className="flex gap-2 text-sm text-slate-300"><Check className="mt-0.5 size-4 shrink-0 text-[#d8ff67]" />{item}</li>)}</ul></CardContent></Card>;
}

function SourcesView() {
  const statuses = cardMarketService.providerStatuses();
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-10 sm:px-7">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Provider policy gate</p>
      <h1 className="mt-1 text-4xl font-semibold tracking-[-0.045em]">No provider goes live without access and display rights.</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">Phase 1 intentionally runs only on isolated synthetic data. Marketplace adapters are capability-scoped, and credentials belong in server-side environment variables.</p>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">{statuses.map((status) => <Card key={status.id} className="border-0 bg-white ring-1 ring-slate-200"><CardContent><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-semibold">{status.label}</p><p className="text-xs text-muted-foreground">Provider ID: {status.id}</p></div><Badge className="bg-amber-100 text-amber-950">Synthetic only</Badge></div><div className="mt-4 flex flex-wrap gap-2">{Object.entries(status.capabilities).filter(([, enabled]) => enabled).map(([capability]) => <Badge key={capability} variant="secondary">{capability.replace(/([A-Z])/g, ' $1')}</Badge>)}</div><p className="mt-4 border-t pt-4 text-sm leading-6 text-muted-foreground">{status.limitation}</p></CardContent></Card>)}</div>
      <Card className="mt-5 border-0 bg-[#101925] text-white ring-0"><CardContent><div className="flex items-start gap-3"><LockKeyhole className="mt-1 size-5 shrink-0 text-[#d8ff67]" /><div><h2 className="font-semibold">eBay production adapter — disabled</h2><p className="mt-1 text-sm leading-6 text-slate-400">Environment placeholders exist for EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, and EBAY_MARKETPLACE_ID. The adapter remains disabled until production API approval, display rights, a server runtime, and sold-data authorization are confirmed.</p></div></div></CardContent></Card>
      <div className="mt-6 grid gap-3 md:grid-cols-3"><PolicyItem icon={Layers3} title="Mode isolation" body="LIVE, SANDBOX, and SYNTHETIC records cannot share a runtime snapshot." /><PolicyItem icon={Database} title="Provenance required" body="Every record carries provider, mode, timestamp, and synthetic status." /><PolicyItem icon={BadgeCheck} title="Rights before display" body="Search access does not imply public display or redistribution rights." /></div>
      <DisclaimerFooter />
    </section>
  );
}

function PolicyItem({ icon: Icon, title, body }: { icon: typeof Database; title: string; body: string }) {
  return <div className="rounded-2xl border bg-white p-4"><Icon className="size-5 text-[#1d7557]" /><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></div>;
}

function DisclaimerFooter() {
  return <footer className="border-t bg-white"><div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-7"><span>CardScout Phase 1 · Synthetic demonstration only</span><span>Not affiliated with Pokémon, Nintendo, The Pokémon Company, or any marketplace. Not investment advice.</span></div></footer>;
}

