import {useEffect, useState} from 'react';
import {apiClient} from '../../api/client';
import type {AgentAnalysis} from '../../hooks/useAgentAnalysis';

const roles = [['Temel Analist', 'fundamental_summary'], ['Teknik Analist', 'technical_summary'], ['Risk Analisti', 'risk_summary'], ['Boğa Araştırmacısı', 'bull_case'], ['Ayı Araştırmacısı', 'bear_case'], ['Portföy Yöneticisi', 'portfolio_manager_reasoning']] as const;
export default function ResearchAgentReport({symbol}: { symbol: string | null }) {
    const [state, setState] = useState<{
        symbol: string | null;
        data: AgentAnalysis | null;
        loading: boolean;
        error: boolean
    }>({symbol: null, data: null, loading: false, error: false});
    useEffect(() => {
        if (!symbol) return;
        let cancelled = false;
        void apiClient.get<AgentAnalysis>(`/agent-analysis/${encodeURIComponent(symbol)}`).then(({data}) => {
            if (!cancelled) setState({
                symbol,
                data: data?.ticker === symbol ? data : null,
                loading: false,
                error: false
            });
        }).catch(() => {
            if (!cancelled) setState({symbol, data: null, loading: false, error: true});
        });
        return () => {
            cancelled = true;
        };
    }, [symbol]);
    const current = state.symbol === symbol ? state : {data: null, loading: Boolean(symbol), error: false};
    return <section className="desk-panel">
        <div className="desk-panel-head">
            <div><h2>AI raporu</h2><p className="desk-help">Altı analist · belgelenen değerlendirme sırası</p></div>
            <span className="desk-badge">{current.loading ? 'Yükleniyor' : current.data ? 'Rapor' : 'Rapor yok'}</span>
        </div>
        {current.loading &&
            <p role="status" className="desk-notice">Analist raporu bekleniyor. Adım bazlı canlı ilerleme bilgisi
                sağlanmıyor.</p>}{current.error &&
        <p role="alert" className="desk-notice">AI raporu kullanılamıyor. Diğer araştırma bölümlerindeki kanıtları
            inceleyebilirsin.</p>}{current.data?.generated_at && <p className="desk-footnote">Rapor
        zamanı: {new Date(current.data.generated_at).toLocaleString('tr-TR')} · {current.data.from_cache ? 'Önbellekten' : 'Sunucudan'}</p>}
        <div className="desk-analysts">{roles.map(([name, key], index) => <section key={key} className="desk-analyst">
            <span className="desk-analyst-number">{index + 1}</span>
            <div><h3>{name}</h3><p
                className="desk-report-text">{typeof current.data?.[key] === 'string' && current.data[key].trim() ? current.data[key] : 'Çıktı kullanılamıyor.'}</p>
            </div>
        </section>)}</div>
    </section>;
}
