/**
 * Tabs Component Tests (TDD)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, TabPanel } from './Tabs';

// Helper to check if class name contains a pattern (CSS Modules add hashes)
const hasClassContaining = (element: HTMLElement, pattern: string) => {
  return Array.from(element.classList).some(cls => cls.includes(pattern));
};

const mockTabs = [
  { id: 'tab1', label: 'Tab 1' },
  { id: 'tab2', label: 'Tab 2' },
  { id: 'tab3', label: 'Tab 3' },
];

describe('Tabs', () => {
  describe('rendering', () => {
    it('renders all tab buttons', () => {
      render(
        <Tabs tabs={mockTabs}>
          <TabPanel id="tab1">Content 1</TabPanel>
          <TabPanel id="tab2">Content 2</TabPanel>
          <TabPanel id="tab3">Content 3</TabPanel>
        </Tabs>
      );

      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 3' })).toBeInTheDocument();
    });

    it('renders first tab as active by default', () => {
      render(
        <Tabs tabs={mockTabs}>
          <TabPanel id="tab1">Content 1</TabPanel>
          <TabPanel id="tab2">Content 2</TabPanel>
        </Tabs>
      );

      expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('renders specified defaultTab as active', () => {
      render(
        <Tabs tabs={mockTabs} defaultTab="tab2">
          <TabPanel id="tab1">Content 1</TabPanel>
          <TabPanel id="tab2">Content 2</TabPanel>
        </Tabs>
      );

      expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('only shows active panel content', () => {
      render(
        <Tabs tabs={mockTabs} defaultTab="tab1">
          <TabPanel id="tab1">Content 1</TabPanel>
          <TabPanel id="tab2">Content 2</TabPanel>
        </Tabs>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('switches tabs when clicked', () => {
      render(
        <Tabs tabs={mockTabs}>
          <TabPanel id="tab1">Content 1</TabPanel>
          <TabPanel id="tab2">Content 2</TabPanel>
        </Tabs>
      );

      fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));

      expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('calls onTabChange when tab is clicked', () => {
      const onTabChange = vi.fn();
      render(
        <Tabs tabs={mockTabs} onTabChange={onTabChange}>
          <TabPanel id="tab1">Content 1</TabPanel>
          <TabPanel id="tab2">Content 2</TabPanel>
        </Tabs>
      );

      fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));

      expect(onTabChange).toHaveBeenCalledWith('tab2');
    });

    it('does not switch to disabled tab', () => {
      const tabs = [
        { id: 'tab1', label: 'Tab 1' },
        { id: 'tab2', label: 'Tab 2', disabled: true },
      ];

      render(
        <Tabs tabs={tabs}>
          <TabPanel id="tab1">Content 1</TabPanel>
          <TabPanel id="tab2">Content 2</TabPanel>
        </Tabs>
      );

      const disabledTab = screen.getByRole('tab', { name: 'Tab 2' });
      expect(disabledTab).toBeDisabled();
    });
  });

  describe('controlled mode', () => {
    it('uses controlled activeTab', () => {
      render(
        <Tabs tabs={mockTabs} activeTab="tab2">
          <TabPanel id="tab1">Content 1</TabPanel>
          <TabPanel id="tab2">Content 2</TabPanel>
        </Tabs>
      );

      expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('does not change internal state in controlled mode', () => {
      const onTabChange = vi.fn();
      render(
        <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={onTabChange}>
          <TabPanel id="tab1">Content 1</TabPanel>
          <TabPanel id="tab2">Content 2</TabPanel>
        </Tabs>
      );

      fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));

      // Should call callback but not change visual state (controlled)
      expect(onTabChange).toHaveBeenCalledWith('tab2');
      // Still showing tab1 because parent didn't update activeTab prop
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  describe('badges', () => {
    it('renders tab badge', () => {
      const tabs = [
        { id: 'tab1', label: 'Tab 1', badge: 5 },
        { id: 'tab2', label: 'Tab 2', badge: 'New' },
      ];

      render(
        <Tabs tabs={tabs}>
          <TabPanel id="tab1">Content 1</TabPanel>
          <TabPanel id="tab2">Content 2</TabPanel>
        </Tabs>
      );

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('renders tab icon', () => {
      const tabs = [
        { id: 'tab1', label: 'Tab 1', icon: <span data-testid="icon1">🏠</span> },
      ];

      render(
        <Tabs tabs={tabs}>
          <TabPanel id="tab1">Content 1</TabPanel>
        </Tabs>
      );

      expect(screen.getByTestId('icon1')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(
        <Tabs tabs={mockTabs}>
          <TabPanel id="tab1">Content 1</TabPanel>
          <TabPanel id="tab2">Content 2</TabPanel>
        </Tabs>
      );

      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveAttribute('aria-controls', 'panel-tab1');
      expect(tab1).toHaveAttribute('id', 'tab-tab1');

      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveAttribute('aria-labelledby', 'tab-tab1');
      expect(panel).toHaveAttribute('id', 'panel-tab1');
    });
  });

  describe('fullWidth', () => {
    it('applies fullWidth class', () => {
      const { container } = render(
        <Tabs tabs={mockTabs} fullWidth>
          <TabPanel id="tab1">Content 1</TabPanel>
        </Tabs>
      );

      const tabList = container.querySelector('[role="tablist"]') as HTMLElement;
      expect(hasClassContaining(tabList, 'tabListFull')).toBe(true);
    });
  });
});
