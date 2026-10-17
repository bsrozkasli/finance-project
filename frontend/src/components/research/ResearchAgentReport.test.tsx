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
