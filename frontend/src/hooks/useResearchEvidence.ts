import {useEffect, useState} from 'react';
import {fetchFinancialHistory, fetchFinancialRatios, fetchFundamentals, fetchNews} from '../api/client';
import type {FinancialHistory, FinancialRatios, FundamentalsData, NewsItem} from '../api/client';

interface Evidence {
    symbol: string | null;
    fundamentals: FundamentalsData | null;
    ratios: FinancialRatios | null;
    history: FinancialHistory | null;
    news: NewsItem[];
    loading: boolean;
    failed: string[];
}

const empty: Evidence = {symbol: null, fundamentals: null, ratios: null, history: null, news: [], loading: false, failed: []};

export function useResearchEvidence(symbol: string | null, isFund: boolean) {
    const [state, setState] = useState<Evidence>(empty);
    useEffect(() => {
        if (!symbol) return;
        let cancelled = false;
        void Promise.allSettled([
            isFund ? Promise.resolve(null) : fetchFundamentals(symbol),
            isFund ? Promise.resolve(null) : fetchFinancialRatios(symbol),
            fetchNews(symbol),
            isFund ? Promise.resolve(null) : fetchFinancialHistory(symbol),
        ]).then(([financials, ratios, news, history]) => {
            if (cancelled) return;
            setState({
                symbol,
                fundamentals: financials.status === 'fulfilled' ? financials.value : null,
                ratios: ratios.status === 'fulfilled' ? ratios.value : null,
                history: history.status === 'fulfilled' ? history.value : null,
                news: news.status === 'fulfilled' && Array.isArray(news.value) ? news.value : [],
                loading: false,
                failed: [financials.status === 'rejected' ? 'Finansallar' : '', ratios.status === 'rejected' ? 'Oranlar' : '', news.status === 'rejected' ? 'Haberler' : '', history.status === 'rejected' ? 'Finansal geçmiş' : ''].filter(Boolean),
            });
        });
        return () => {
            cancelled = true;
        };
    }, [symbol, isFund]);
    if (!symbol) return empty;
    return state.symbol === symbol ? state : {...empty, symbol, loading: true};
}
