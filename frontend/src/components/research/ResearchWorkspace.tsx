import {lazy, Suspense, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {FileText, Plus, Check, ArrowUpRight} from 'lucide-react';
import type {Asset} from '../../api/types';
import type {Stock, Watchlist} from '../../types';
import {useResearchEvidence} from '../../hooks/useResearchEvidence';
import ResearchFinancials from './ResearchFinancials';
import {metric} from './formatResearchMetric';
import {assetTypeLabel} from '../../utils/formatters';
import ResearchSources from './ResearchSources';
import ResearchHistoryChart from './ResearchHistoryChart';

const ChartWorkspace = lazy(() => import('../ChartWorkspace'));
const ResearchAgentReport = lazy(() => import('./ResearchAgentReport'));
const tabs = [['overview', 'Genel bakış'], ['chart', 'Grafik'], ['financials', 'Finansallar'], ['risk', 'Risk'], ['news', 'Haberler'], ['ai', 'AI raporu']] as const;
type Tab = typeof tabs[number][0];

interface Props {
    stocks: Stock[];
    assets?: Asset[];
    symbol?: string;
    onSelectStock: (stock: Stock) => void;
    watchlists?: Watchlist[];
    onAddToWatchlist?: (symbol: string, id: string) => Promise<void>
}

export default function ResearchWorkspace({
                                              stocks,
                                              assets = [],
                                              symbol,
                                              onSelectStock,
                                              watchlists = [],
                                              onAddToWatchlist
                                          }: Props) {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('overview');
    const [sourceOpen, setSourceOpen] = useState(false);
    const [wide, setWide] = useState(false);
    const [listId, setListId] = useState('');
    const [adding, setAdding] = useState(false);
    const [message, setMessage] = useState('');
    const layout = useRef<HTMLDivElement>(null);
    const strip = useRef<HTMLDivElement>(null);
    const sourceButton = useRef<HTMLButtonElement>(null);
    const effectiveSymbol = symbol?.toUpperCase() ?? assets[0]?.symbol ?? stocks[0]?.symbol ?? null;
    const stock = stocks.find(item => item.symbol === effectiveSymbol);
    const asset = assets.find(item => item.symbol === effectiveSymbol);
    const isFund = asset?.type.toUpperCase().includes('ETF') ?? false;
    const evidence = useResearchEvidence(effectiveSymbol, isFund);
    const selectedList = watchlists.find(item => item.id === (listId || watchlists[0]?.id));
    const watched = Boolean(effectiveSymbol && selectedList?.symbols.includes(effectiveSymbol));
    const choices = [...new Map([...assets, ...stocks.map(item => ({
        symbol: item.symbol,
        name: item.name,
        type: item.sector
    }))].map(item => [item.symbol, item])).values()];
    useEffect(() => {
        const target = layout.current;
        if (!target) return;
        const check = () => setWide(window.innerWidth >= 1440 && target.clientWidth - 296 >= 900);
        check();
        const observer = new ResizeObserver(check);
        observer.observe(target);
        window.addEventListener('resize', check);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', check);
        };
    }, []);
    useLayoutEffect(() => {
        const selected = strip.current?.querySelector<HTMLElement>('[aria-selected="true"]');
        if (selected && strip.current) strip.current.scrollLeft = Math.max(0, selected.offsetLeft - strip.current.offsetLeft - 12);
    }, [tab, sourceOpen, wide]);
    const closeSource = () => {
        setSourceOpen(false);
        queueMicrotask(() => sourceButton.current?.focus({preventScroll: true}));
    };
    useEffect(() => {
        if (!sourceOpen || !wide) return;
        const cancel = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSourceOpen(false);
                queueMicrotask(() => sourceButton.current?.focus({preventScroll: true}));
            }
        };
        document.addEventListener('keydown', cancel);
        return () => document.removeEventListener('keydown', cancel);
    }, [sourceOpen, wide]);
    const latest = evidence.fundamentals?.revenue?.filter(point => point.value != null && Number.isFinite(point.value)).slice().sort((a, b) => b.year - a.year)[0];
    return <div className="desk-page research-desk">
        <div className="desk-company">
            <div className="desk-company-identity"><span className="desk-symbol-mark"
                                                         aria-hidden="true">{effectiveSymbol?.slice(0, 2) ?? 'M'}</span>
                <div><p className="desk-eyebrow">Araştır / {effectiveSymbol ?? 'Varlık seçimi'}</p>
                    <h1>{asset?.name ?? stock?.name ?? effectiveSymbol ?? 'Bir varlık seç'}</h1><p
                        className="desk-help">{asset ? assetTypeLabel(asset.type) : 'Kayıtlı araştırma alanı'}</p></div>
            </div>
            <div className="desk-company-price">
                <span>Son fiyat</span><strong>{stock ? `$${metric(stock.price)}` : '—'}</strong><small>{stock ? 'Son mevcut gözlem' : 'Fiyat verisi yok'}</small>
            </div>
            <div className="desk-company-actions">{choices.length > 0 &&
                <label className="desk-visually-labelled">Varlık<select aria-label="Araştırılan varlık"
                                                                        value={effectiveSymbol ?? ''}
                                                                        onChange={event => navigate(`/workspace/${encodeURIComponent(event.target.value)}`)}>{effectiveSymbol && !choices.some(item => item.symbol === effectiveSymbol) &&
                    <option>{effectiveSymbol}</option>}{choices.map(item => <option key={item.symbol}
                                                                                    value={item.symbol}>{item.symbol}</option>)}</select></label>}{watchlists.length > 1 &&
                <label className="desk-visually-labelled">İzleme listesi<select value={selectedList?.id ?? ''}
                                                                                onChange={event => setListId(event.target.value)}>{watchlists.map(item =>
                    <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}{onAddToWatchlist &&
                <button className="desk-button" disabled={!effectiveSymbol || !selectedList || watched || adding}
                        onClick={async () => {
                            if (!effectiveSymbol || !selectedList) return;
                            setAdding(true);
                            setMessage('');
                            try {
                                await onAddToWatchlist(effectiveSymbol, selectedList.id);
                                setMessage(`${effectiveSymbol} izleme listesine eklendi.`);
                            } catch {
                                setMessage('İzleme listesine eklenemedi. Yeniden deneyebilirsin.');
                            } finally {
                                setAdding(false);
                            }
                        }}>{watched ? <Check size={16}/> : <Plus
                    size={16}/ >}{watched ? 'İzleme listemde' : adding ? 'Ekleniyor…' : 'İzleme listesine ekle'}</button>}<Link
                    className="desk-link" to="/journal">Günlüğe geç <ArrowUpRight size={16}/></Link></div></div>
            {onAddToWatchlist&&watchlists.length===0&&<p className="desk-help">Eklemek için önce <Link to="/watchlist" className="desk-link">bir izleme listesi oluştur</Link>.</p>}{message &&
                <p role="status" className="desk-notice">{message}</p>}
                <div className="desk-tabs" role="tablist" aria-label="Araştırma bölümleri"
                     ref={strip}>{tabs.map(([key, label], index) => <button role="tab" key={key}
                                                                            id={`research-tab-${key}`}
                                                                            aria-controls="research-content"
                                                                            aria-selected={key === tab}
                                                                            tabIndex={key === tab ? 0 : -1}
                                                                            onClick={() => setTab(key)}
                                                                            onKeyDown={event => {
                                                                                if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
                                                                                    event.preventDefault();
                                                                                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
                                                                                    setTab(tabs[next][0]);
                                                                                    document.getElementById(`research-tab-${tabs[next][0]}`)?.focus();
                                                                                }
                                                                            }}>{label}</button>)}</div>
                <div className="desk-source-strip"><p>Kaynak: kayıtlı finansal ve fiyat verileri
                    · {effectiveSymbol ?? 'Sembol seçilmedi'}<br/><span>Finansal dönem ve birim kapsamı ilgili tabloda; eksik kanıt “—” olarak gösterilir.</span>
                </p>
                    <button ref={sourceButton} className="desk-button" aria-expanded={sourceOpen}
                            aria-controls={wide ? 'research-source-aside' : 'research-source-dialog'}
                            onClick={() => sourceOpen ? closeSource() : setSourceOpen(true)}><FileText size={16}/>Kaynak
                        ayrıntıları
                    </button>
                </div>
                <div ref={layout} className={`research-layout ${wide && sourceOpen ? 'with-source' : ''}`}>
                    <div className="research-content" id="research-content" role="tabpanel"
                         aria-labelledby={`research-tab-${tab}`} tabIndex={0}>
                        {!effectiveSymbol ?
                            <section className="desk-panel desk-empty"><h2>Araştırmaya başla</h2><p>Kayıtlı varlıklardan
                                birini seç veya izleme listene bir sembol ekle.</p><Link className="desk-link"
                                                                                         to="/watchlist">İzleme
                                listesine git</Link></section> : tab === 'overview' ?
                                <div className="desk-overview-grid">
                                    <section className="desk-panel">
                                        <div className="desk-panel-head"><h2>Finansal görünüm</h2><span
                                            className="desk-badge">{evidence.loading ? 'Yükleniyor' : 'Raporlanan veri'}</span>
                                        </div>
                                        <div className="desk-summary-metrics">
                                            <div>
                                                <span>Son raporlanan gelir</span><strong>{metric(latest?.value, 0)}</strong><small>{latest ? `FY${latest.year}` : 'Dönem yok'}</small>
                                            </div>
                                            <div>
                                                <span>Fiyat / kazanç</span><strong>{metric(evidence.ratios?.pe)}</strong><small>Raporlanan
                                                oran</small></div>
                                            <div>
                                                <span>Özkaynak kârlılığı</span><strong>{metric(evidence.ratios?.roe)}</strong><small>Sağlayıcı
                                                değeri</small></div>
                                        </div>
                                        {!evidence.loading && <ResearchHistoryChart data={evidence.fundamentals}/>}<p
                                        className="desk-footnote">Birim ve para birimi bildirilmedi. Şirket finansalları
                                        kaynaklı değerlerdir; fiyat veya portföy getirisi değildir.</p>
                                        <button className="desk-button desk-text-button"
                                                onClick={() => setTab('financials')}>Finansalları aç →
                                        </button>
                                    </section>
                                    <section className="desk-panel">
                                        <div className="desk-panel-head"><h2>Kanıt kapsamı</h2></div>
                                        <div className="desk-evidence-row"><h3>Finansallar</h3>
                                            <p>{isFund ? 'Fon için şirket gelir tablosu uygulanmaz.' : evidence.loading ? 'Kanıt yükleniyor…' : latest ? 'Raporlanan mali yılları tablo üzerinden karşılaştır.' : 'Finansal dönem verisi kullanılamıyor.'}</p>
                                        </div>
                                        <div className="desk-evidence-row"><h3>Fiyat ve risk</h3>
                                            <p>{stock ? 'Son mevcut fiyat gözlemi kullanılabilir.' : 'Fiyat geçmişi kullanılamıyor.'} Risk
                                                metrikleri ayrı kanıt gerektirir.</p></div>
                                        <div className="desk-evidence-row"><h3>AI raporu</h3><p>Hazırlanmış kanıtı
                                            değerlendiren altı analist.</p>
                                            <button className="desk-link" onClick={() => setTab('ai')}>AI raporunu aç
                                                →
                                            </button>
                                        </div>
                                    </section>
                                </div> : tab === 'financials' ?
                                    <ResearchFinancials data={evidence.fundamentals} loading={evidence.loading}
                                                        isFund={isFund}/> : tab === 'chart' ?
                                        <Suspense fallback={<p role="status">Grafik yükleniyor…</p>}><ChartWorkspace
                                            stocks={stock ? [stock] : []} symbol={effectiveSymbol}
                                            onSelectStock={onSelectStock}/></Suspense> : tab === 'risk' ?
                                            <section className="desk-panel">
                                                <div className="desk-panel-head"><h2>Risk görünümü</h2><span
                                                    className="desk-badge desk-warning">Kanıt eksik</span></div>
                                                <div
                                                    className="desk-summary-metrics">{['Volatilite', 'Beta', 'Maksimum düşüş'].map(label =>
                                                    <div key={label}><span>{label}</span><strong>—</strong>
                                                    </div>)}</div>
                                                <p className="desk-footnote">Risk metrikleri kullanılamıyor. Bağımsız
                                                    risk metriği bu görünümün veri sözleşmesinde sağlanmıyor; bilinmeyen
                                                    risk düşük veya sıfır risk değildir.</p><Link
                                                to={`/reports/${effectiveSymbol}`}
                                                className="desk-link desk-section-link">Mevcut analiz raporunu incele
                                                →</Link></section> : tab === 'news' ? <section className="desk-panel">
                                                <div className="desk-panel-head"><h2>{effectiveSymbol} haberleri</h2>
                                                </div>
                                                {evidence.loading ? <p role="status" className="desk-empty">Haberler
                                                    yükleniyor…</p> : evidence.news.length === 0 ?
                                                    <p className="desk-empty">{evidence.failed.includes('Haberler') ? 'Haber kaynağı kullanılamıyor.' : 'Haber bulunamadı.'}</p> : evidence.news.map(item =>
                                                        <article className="desk-news-item" key={item.id}><p
                                                            className="desk-help">{item.source || 'Kaynak bildirilmedi'} · {item.datetime ? new Date(item.datetime * 1000).toLocaleString('tr-TR') : 'Yayın zamanı yok'}</p>
                                                            <h3>{/^https?:\/\//.test(item.url) ?
                                                                <a href={item.url} target="_blank"
                                                                   rel="noreferrer">{item.headline}</a> : item.headline}</h3>
                                                            <p>{item.summary}</p></article>)}</section> : <Suspense
                                                fallback={<p role="status">Rapor yükleniyor…</p>}><ResearchAgentReport
                                                symbol={effectiveSymbol}/></Suspense>}
                        {evidence.failed.map(name => <p className="desk-help desk-section-link"
                                                        key={name}>{name} kullanılamıyor; diğer bölümlerdeki kanıtlar
                            korunur.</p>)}
                    </div>
                    <ResearchSources open={sourceOpen} wide={wide} symbol={effectiveSymbol} onClose={closeSource}/>
                </div>
            </div>
            ;
            }
