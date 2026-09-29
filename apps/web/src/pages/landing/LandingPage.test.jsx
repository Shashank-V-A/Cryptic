import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage.jsx';

describe('LandingPage', () => {
  it('renders brand and hero headline', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/VDA Ledger/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Track\. Understand\./i)).toBeInTheDocument();
    expect(screen.getByText(/Built for Indian crypto investors/i)).toBeInTheDocument();
  });
});
