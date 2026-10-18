import {useEffect, useRef} from 'react';

interface Props {
    open: boolean;
    wide: boolean;
    symbol: string | null;
    onClose: () => void
}

export default function ResearchSources({open, wide, symbol, onClose}: Props) {
    const dialog = useRef<HTMLDialogElement>(null);
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        const target = dialog.current;
        if (open && !wide) {
            if (!target?.open) target?.showModal();
        } else if (target?.open) target.close();
        if (open && wide) heading.current?.focus({preventScroll: true});
    }, [open, wide]);
    const content = <>
        <div className="desk-panel-head"><h2 ref={wide ? heading : undefined} tabIndex={-1}
                                             id={wide ? 'source-aside-title' : 'source-dialog-title'}>Kaynak
            ayrıntıları</h2>
            <button className="desk-icon-button" aria-label="Kaynak ayrıntılarını kapat" onClick={onClose}>×</button>
        </div>
        <div className="desk-source-body"><p>Bu görünüm {symbol ?? 'seçilen varlık'} için kayıtlı finansal kanıtı sunar.
            Eksik kaynak bilgisi tamamlanmış gibi gösterilmez.</p>
            <dl>
                <dt>Finansallar</dt>
                <dd>Raporlanan yıllık seriler</dd>
                <dt>Dönem</dt>
                <dd>Tablodaki mali yıllar; dönem bitiş tarihi bildirilmedi</dd>
                <dt>Birim / para birimi</dt>
                <dd>Sağlayıcı yanıtında bildirilmedi</dd>
                <dt>Fiyat</dt>
                <dd>Son mevcut tarihsel gözlem; canlı fiyat garantisi yok</dd>
                <dt>Haber</dt>
                <dd>Her haberin kaynak ve yayın zamanı kendi satırında</dd>
                <dt>AI raporu</dt>
                <dd>Hazırlanmış metrikleri değerlendiren sıralı analist çıktısı; finansal kanıtın yerine geçmez</dd>
            </dl>
        </div>
    </>;
    return <>{open && wide && <aside className="desk-panel desk-source-aside" aria-labelledby="source-aside-title"
                                     id="research-source-aside">{content}</aside>}
        <dialog className="desk-source-dialog" ref={dialog} aria-labelledby="source-dialog-title"
                id="research-source-dialog" onCancel={event => {
            event.preventDefault();
            onClose();
        }} onClick={event => {
            if (event.target === event.currentTarget) {
                const rect = event.currentTarget.getBoundingClientRect();
                if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
            }
        }}>{!wide && content}</dialog>
    </>;
}
