import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Navbar } from '../components/Navbar';
import { User } from '../types';

describe('Navbar Component', () => {
  const mockUser: User = {
    id: '1',
    name: 'Victoria Vance',
    email: 'treasurer@acme-corp.com',
    role: 'TREASURER',
    department: 'Global Treasury',
  };

  it('renders application title and active persona', () => {
    render(
      <Navbar
        currentTab="overview"
        setCurrentTab={vi.fn()}
        currentUser={mockUser}
        onSwitchUser={vi.fn()}
        onOpenNewTransaction={vi.fn()}
        onOpenImportExport={vi.fn()}
      />
    );

    expect(screen.getByText('Acme Treasury')).toBeInTheDocument();
    const matches = screen.getAllByText('Victoria Vance');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]).toBeInTheDocument();
  });

  it('triggers onOpenNewTransaction when clicked', () => {
    const handleNewTx = vi.fn();
    render(
      <Navbar
        currentTab="overview"
        setCurrentTab={vi.fn()}
        currentUser={mockUser}
        onSwitchUser={vi.fn()}
        onOpenNewTransaction={handleNewTx}
        onOpenImportExport={vi.fn()}
      />
    );

    const btn = screen.getByText('New Transaction');
    fireEvent.click(btn);
    expect(handleNewTx).toHaveBeenCalledTimes(1);
  });

  it('triggers setCurrentTab on tab click', () => {
    const handleTabChange = vi.fn();
    render(
      <Navbar
        currentTab="overview"
        setCurrentTab={handleTabChange}
        currentUser={mockUser}
        onSwitchUser={vi.fn()}
        onOpenNewTransaction={vi.fn()}
        onOpenImportExport={vi.fn()}
      />
    );

    const accountsTab = screen.getByText('Cash Accounts');
    fireEvent.click(accountsTab);
    expect(handleTabChange).toHaveBeenCalledWith('accounts');
  });
});
