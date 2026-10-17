export const metric = (value: number | null | undefined, digits = 2): string =>
    value == null || !Number.isFinite(value)
        ? '—'
        : new Intl.NumberFormat('tr-TR', {maximumFractionDigits: digits}).format(value);
