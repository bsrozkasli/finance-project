import { useState } from 'react';

export const SubPortfolioTabs = () => {
  const [activeTab, setActiveTab] = useState('Total Family (Consolidated)');
  const tabs = ['Total Family (Consolidated)', 'My Portfolio', "Dad's Portfolio"];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === tab
              ? 'text-[#001a42]'
              : 'hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'
          }`}
          style={{
            background: activeTab === tab ? 'var(--color-accent)' : 'var(--color-bg-card)',
            color: activeTab === tab ? '#001a42' : 'var(--color-text-secondary)',
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};
