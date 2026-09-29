import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage.jsx';

describe('LandingPage', () => {
  it('renders scrapbook hero matching design reference', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/VDA Ledger/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Track your crypto journey/i)).toBeInTheDocument();
    expect(screen.getByText(/with confidence/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Your complete crypto portfolio & tax platform for Indian investors/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Snow-capped mountains/i })).toBeInTheDocument();
  });
});
