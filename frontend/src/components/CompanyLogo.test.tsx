import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CompanyLogo from './CompanyLogo';

describe('CompanyLogo', () => {
  it('shows the provider logo when a usable URL exists', () => {
    render(<CompanyLogo symbol="AAPL" logoUrl="https://images.example.com/apple.png" website="https://www.apple.com" />);

    expect(screen.getByRole('img', { name: 'AAPL logo' })).toHaveAttribute(
      'src',
      'https://images.example.com/apple.png',
    );
  });

  it('uses the company website favicon when the profile has no logo URL', () => {
    render(<CompanyLogo symbol="AAPL" logoUrl={null} website="https://www.apple.com/about" />);

    expect(screen.getByRole('img', { name: 'AAPL logo' })).toHaveAttribute(
      'src',
      'https://www.apple.com/favicon.ico',
    );
  });

  it('tries the favicon after a broken logo and then shows the symbol', () => {
    render(<CompanyLogo symbol="AAPL" logoUrl="https://images.example.com/missing.png" website="https://www.apple.com" />);

    fireEvent.error(screen.getByRole('img', { name: 'AAPL logo' }));
    expect(screen.getByRole('img', { name: 'AAPL logo' })).toHaveAttribute('src', 'https://www.apple.com/favicon.ico');

    fireEvent.error(screen.getByRole('img', { name: 'AAPL logo' }));
    expect(screen.getByText('AA')).toBeInTheDocument();
  });

  it('does not request a favicon from an unsafe website URL', () => {
    render(<CompanyLogo symbol="AAPL" website="javascript:alert(1)" />);

    expect(screen.queryByRole('img', { name: 'AAPL logo' })).not.toBeInTheDocument();
    expect(screen.getByText('AA')).toBeInTheDocument();
  });
});
