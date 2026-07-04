import type { ReactNode } from 'react';

export const InputGroup = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
      {label}
    </label>
    {children}
  </div>
);

export const SortTh = ({
  label,
  sortKey,
  k,
  sortDir,
  onSort,
}: {
  label: string;
  sortKey: string;
  k: string;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
}) => (
  <th onClick={() => onSort(k)} style={{ cursor: 'pointer' }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {label}
      {sortKey === k && (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" style={{ opacity: 0.7 }}>
          {sortDir === 'desc' ? <path d="M4 6L0 2h8z" /> : <path d="M4 2l4 4H0z" />}
        </svg>
      )}
    </span>
  </th>
);