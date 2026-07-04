import { useMemo, useState } from 'react';
import type { AddJournalTradeRequest, InvestmentPortfolio, JournalTrade, JournalTradeType, PortfolioAssetType, PortfolioTransactionAction } from '../../api/client';
import { InputGroup } from './journalShared';
import { INPUT_STYLE, nonThemeTags, STRATEGIES, THEMES, themesFromTags, today } from './journalUtils';
import type { JournalActionKind } from './journalUtils';

export interface TradeModalPayload {
  journal: AddJournalTradeRequest;
  portfolioId: number | null;
  portfolioAction: PortfolioTransactionAction;
  assetType: PortfolioAssetType;
  currency: string;
  themeTags: string[];
  actionKind: JournalActionKind;
}

interface TradeModalProps {
  portfolios: InvestmentPortfolio[];
  defaultPortfolioId: number | null;
  initial?: JournalTrade | null;
  onClose: () => void;
  onSubmit: (payload: TradeModalPayload) => Promise<void>;
}

const actionOptions: { value: JournalActionKind; label: string; portfolioAction: PortfolioTransactionAction; journalType: JournalTradeType }[] = [
  { value: 'BUY', label: 'BUY', portfolioAction: 'BUY', journalType: 'BUY' },
  { value: 'SELL', label: 'SELL', portfolioAction: 'SELL', journalType: 'SELL' },
  { value: 'ADD', label: 'Pozisyon Arttirma', portfolioAction: 'BUY', journalType: 'BUY' },
  { value: 'REDUCE', label: 'Pozisyon Azaltma', portfolioAction: 'SELL', journalType: 'SELL' },
  { value: 'DIVIDEND', label: 'Temettu', portfolioAction: 'DIVIDEND', journalType: 'BUY' },
];

const actionFromTrade = (trade: JournalTrade | null | undefined): JournalActionKind => {
  const tagged = trade?.tags?.find(tag => tag.startsWith('action:'))?.replace('action:', '') as JournalActionKind | undefined;
  return tagged ?? trade?.type ?? 'BUY';
};

export const TradeModal = ({ portfolios, defaultPortfolioId, initial, onClose, onSubmit }: TradeModalProps) => {
  const initialThemes = useMemo(() => themesFromTags(initial?.tags), [initial?.tags]);
  const initialOtherTags = useMemo(() => nonThemeTags(initial?.tags).filter(tag => !tag.startsWith('action:')).join(', '), [initial?.tags]);
  const [form, setForm] = useState({
    portfolioId: initial?.portfolioId ?? defaultPortfolioId,
    actionKind: actionFromTrade(initial),
    symbol: initial?.symbol ?? '',
    quantity: initial?.quantity ?? 0,
    price: initial?.purchasePrice ?? 0,
    openedAt: initial?.openedAt ?? today(),
    commission: initial?.commission ?? 0,
    strategy: initial?.strategy ?? '',
    thesis: initial?.notes ?? '',
    tags: initialOtherTags,
    assetType: 'US_STOCK' as PortfolioAssetType,
    currency: portfolios.find(portfolio => portfolio.id === (initial?.portfolioId ?? defaultPortfolioId))?.baseCurrency ?? 'USD',
  });
  const [selectedThemes, setSelectedThemes] = useState<string[]>(initialThemes);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const selectedAction = actionOptions.find(option => option.value === form.actionKind) ?? actionOptions[0];
  const selectedPortfolio = portfolios.find(portfolio => portfolio.id === form.portfolioId) ?? null;

  const set = (key: keyof typeof form, value: string | number | null) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleTheme = (theme: string) => {
    setSelectedThemes(prev => prev.includes(theme) ? prev.filter(item => item !== theme) : [...prev, theme]);
  };

  const handlePortfolioChange = (value: string) => {
    const portfolioId = value ? Number(value) : null;
    const portfolio = portfolios.find(item => item.id === portfolioId);
    setForm(prev => ({ ...prev, portfolioId, currency: portfolio?.baseCurrency ?? prev.currency }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldError(null);
    if (!form.symbol.trim() && form.actionKind !== 'DIVIDEND') return setFieldError('Ticker is required');
    if (form.quantity <= 0) return setFieldError('Quantity must be > 0');
    if (form.price <= 0) return setFieldError('Price must be > 0');
    if (!form.thesis.trim()) return setFieldError('Yatirim tezi / neden zorunlu');
    if (!form.portfolioId) return setFieldError('Portfoy secimi zorunlu');

    const tags = [
      ...form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      ...selectedThemes,
      `action:${form.actionKind}`,
    ];

    setSubmitting(true);
    try {
      await onSubmit({
        journal: {
          symbol: form.symbol.toUpperCase().trim(),
          type: selectedAction.journalType,
          quantity: Number(form.quantity),
          purchasePrice: Number(form.price),
          currentPrice: selectedAction.journalType === 'SELL' ? Number(form.price) : undefined,
          openedAt: form.openedAt,
          closedAt: selectedAction.journalType === 'SELL' ? form.openedAt : undefined,
          status: selectedAction.journalType === 'SELL' ? 'CLOSED' : 'OPEN',
          commission: form.commission > 0 ? Number(form.commission) : undefined,
          portfolioId: form.portfolioId,
          strategy: form.strategy || undefined,
          notes: form.thesis.trim(),
          tags,
        },
        portfolioId: form.portfolioId,
        portfolioAction: selectedAction.portfolioAction,
        assetType: form.assetType,
        currency: form.currency || selectedPortfolio?.baseCurrency || 'USD',
        themeTags: selectedThemes,
        actionKind: form.actionKind,
      });
      onClose();
    } catch {
      setFieldError('Failed to save trade. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(6,14,32,0.8)', backdropFilter: 'blur(6px)' }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl animate-fade-in" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <div className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>{initial ? 'Edit Trade' : 'Log New Trade'}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Journal kaydi ve portfoy ledger entegrasyonu</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5" style={{ color: 'var(--color-text-secondary)' }}>X</button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[76vh] space-y-4 overflow-y-auto px-6 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <InputGroup label="Portfoy">
              <select style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={form.portfolioId ?? ''} onChange={event => handlePortfolioChange(event.target.value)}>
                <option value="">Portfoy sec</option>
                {portfolios.map(portfolio => <option key={portfolio.id} value={portfolio.id}>{portfolio.name} ({portfolio.baseCurrency})</option>)}
              </select>
            </InputGroup>
            <InputGroup label="Islem Turu">
              <select style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={form.actionKind} onChange={event => set('actionKind', event.target.value)}>
                {actionOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </InputGroup>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
            <InputGroup label="Ticker">
              <input style={INPUT_STYLE} placeholder="AAPL" value={form.symbol} onChange={event => set('symbol', event.target.value.toUpperCase())} maxLength={12} autoFocus />
            </InputGroup>
            <InputGroup label="Quantity">
              <input style={INPUT_STYLE} type="number" min="0" step="0.0001" value={form.quantity || ''} onChange={event => set('quantity', parseFloat(event.target.value) || 0)} />
            </InputGroup>
            <InputGroup label={form.actionKind === 'DIVIDEND' ? 'Dividend Amount' : 'Price'}>
              <input style={INPUT_STYLE} type="number" min="0" step="0.01" value={form.price || ''} onChange={event => set('price', parseFloat(event.target.value) || 0)} />
            </InputGroup>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <InputGroup label="Date"><input style={INPUT_STYLE} type="date" value={form.openedAt} onChange={event => set('openedAt', event.target.value)} /></InputGroup>
            <InputGroup label="Commission"><input style={INPUT_STYLE} type="number" min="0" step="0.01" value={form.commission || ''} onChange={event => set('commission', parseFloat(event.target.value) || 0)} /></InputGroup>
            <InputGroup label="Asset Type">
              <select style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={form.assetType} onChange={event => set('assetType', event.target.value)}>
                {(['US_STOCK', 'US_ETF', 'BIST_STOCK', 'FUND', 'GOLD', 'CASH', 'OTHER'] as PortfolioAssetType[]).map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </InputGroup>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <InputGroup label="Strategy">
              <select style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={form.strategy} onChange={event => set('strategy', event.target.value)}>
                <option value="">Select strategy</option>
                {STRATEGIES.map(strategy => <option key={strategy} value={strategy}>{strategy}</option>)}
              </select>
            </InputGroup>
            <InputGroup label="Tags">
              <input style={INPUT_STYLE} placeholder="earnings, largecap" value={form.tags} onChange={event => set('tags', event.target.value)} />
            </InputGroup>
          </div>

          <InputGroup label="Tema Etiketleri">
            <div className="flex flex-wrap gap-2">
              {THEMES.map(theme => (
                <button key={theme} type="button" onClick={() => toggleTheme(theme)} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: selectedThemes.includes(theme) ? 'var(--color-accent-dim)' : 'var(--color-bg-base)', color: selectedThemes.includes(theme) ? 'var(--color-accent-light)' : 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                  {theme}
                </button>
              ))}
            </div>
          </InputGroup>

          <InputGroup label="Yatirim Tezi / Neden?">
            <textarea style={{ ...INPUT_STYLE, minHeight: 92, resize: 'vertical' }} placeholder="Bu isleme neden girdin? Risk, katalizor, cikis plani..." value={form.thesis} onChange={event => set('thesis', event.target.value)} />
          </InputGroup>

          {form.quantity > 0 && form.price > 0 && (
            <div className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Estimated Value</span>
              <span className="font-mono text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>${(form.quantity * form.price + (form.commission || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          {fieldError && <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--color-bear-dim)', color: 'var(--color-bear)' }}>{fieldError}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg py-2.5 text-sm font-semibold" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-lg py-2.5 text-sm font-bold" style={{ background: selectedAction.journalType === 'BUY' ? 'var(--color-bull-dim)' : 'var(--color-bear-dim)', color: selectedAction.journalType === 'BUY' ? 'var(--color-bull)' : 'var(--color-bear)', border: `1px solid ${selectedAction.journalType === 'BUY' ? 'rgba(78,222,163,0.3)' : 'rgba(255,84,81,0.3)'}`, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Saving...' : initial ? 'Update Trade' : 'Log Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};