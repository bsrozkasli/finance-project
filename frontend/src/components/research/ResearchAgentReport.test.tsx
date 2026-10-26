import {render, screen} from '@testing-library/react';
import {http, HttpResponse} from 'msw';
import {describe, expect, it} from 'vitest';
import {API_BASE_URL as base} from '../../api/config';
import {server} from '../../test/server';
import ResearchAgentReport from './ResearchAgentReport';

describe('ResearchAgentReport', () => {
    it('renders only the returned analyst text in the documented order', async () => {
        // Stub the Spring HTTP boundary; report rendering and text escaping run normally.
        server.use(http.get(`${base}/agent-analysis/AAA`, () => HttpResponse.json({
            ticker: 'AAA',
            fundamental_summary: 'Kaynaklı temel görüş',
            technical_summary: 'Teknik görüş',
            risk_summary: 'Risk görüşü',
            bull_case: 'Lehte görüş',
            bear_case: 'Karşı görüş',
            portfolio_manager_reasoning: '<script>unsafe()</script>',
            generated_at: '2026-07-09T09:00:00Z',
            from_cache: true
        })));
        render(<ResearchAgentReport symbol="AAA"/>);
        await screen.findByText('Kaynaklı temel görüş');
        expect(screen.getAllByRole('heading', {level: 3}).map(item => item.textContent)).toEqual(['Temel Analist', 'Teknik Analist', 'Risk Analisti', 'Boğa Araştırmacısı', 'Ayı Araştırmacısı', 'Portföy Yöneticisi']);
        expect(screen.getByText('<script>unsafe()</script>')).toBeInTheDocument();
        expect(document.querySelector('script')).toBeNull();
    });
    it('keeps every analyst unavailable when the AI service fails', async () => {
        server.use(http.get(`${base}/agent-analysis/AAA`, () => new HttpResponse(null, {status: 503})));
        render(<ResearchAgentReport symbol="AAA"/>);
        await screen.findByRole('alert');
        expect(screen.getAllByText('Çıktı kullanılamıyor.')).toHaveLength(6);
        expect(screen.queryByText(/STRONG BUY|Tamamlandı|%100/)).not.toBeInTheDocument();
    });
});

describe('ResearchAgentReport decision status', () => {
    const base_ = {
        ticker: 'AAA', fundamental_summary: 'f', technical_summary: 't', risk_summary: 'r', bull_case: 'b', bear_case: 'e',
        portfolio_manager_reasoning: 'ham yönetici metni', generated_at: '2026-07-09T09:00:00Z', from_cache: false
    };
    const serve = (extra: Record<string, unknown>) => server.use(http.get(`${base}/agent-analysis/AAA`, () => HttpResponse.json({...base_, ...extra})));
    it('FAILED shows the note and reason, keeps raw text, shows no decision or confidence', async () => {
        serve({decision: null, confidence: null, decision_status: {status: 'FAILED', reason: 'pm_response_not_json_default_hold'}});
        render(<ResearchAgentReport symbol="AAA"/>);
        await screen.findByText('ham yönetici metni');
        expect(screen.getByRole('note')).toHaveTextContent('Karar çıktısı ayrıştırılamadı; karar gösterilmiyor');
        expect(screen.getByText(/pm_response_not_json_default_hold/)).toBeVisible();
        expect(document.body.textContent).not.toMatch(/null|HOLD|BUY|SELL|\b50\b|%/);
    });
    it('OK shows no note', async () => {
        serve({decision: 'BUY', confidence: 70, decision_status: {status: 'OK', reason: null}});
        render(<ResearchAgentReport symbol="AAA"/>);
        await screen.findByText('ham yönetici metni');
        expect(screen.queryByRole('note')).not.toBeInTheDocument();
    });
    it('absent decision_status shows Durum bilinmiyor', async () => {
        serve({decision: 'HOLD', confidence: 50});
        render(<ResearchAgentReport symbol="AAA"/>);
        await screen.findByText('ham yönetici metni');
        expect(screen.getByRole('note')).toHaveTextContent('Durum bilinmiyor');
        expect(document.body.textContent).not.toMatch(/HOLD/);
    });
    it('null status object and null decision do not crash', async () => {
        serve({decision: null, confidence: null, decision_status: {status: null, reason: null}});
        render(<ResearchAgentReport symbol="AAA"/>);
        await screen.findByText('ham yönetici metni');
        expect(screen.getByRole('note')).toHaveTextContent('Durum bilinmiyor');
        expect(document.body.textContent).not.toMatch(/null/);
    });
});
