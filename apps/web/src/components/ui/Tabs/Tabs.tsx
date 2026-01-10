/**
 * Tabs Component
 * 
 * Tabbed interface for organizing content
 */

import { createContext, useContext, useState, type ReactNode } from 'react';
import styles from './Tabs.module.css';

// Context
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

// Types
export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
}

export interface TabPanelProps {
  id: string;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

// Main Tabs component
export function Tabs({
  tabs,
  defaultTab,
  activeTab: controlledActiveTab,
  onTabChange,
  orientation = 'horizontal',
  size = 'md',
  fullWidth = false,
  children,
  className,
}: TabsProps) {
  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState(
    defaultTab ?? tabs[0]?.id ?? ''
  );

  const isControlled = controlledActiveTab !== undefined;
  const activeTab = isControlled ? controlledActiveTab : uncontrolledActiveTab;

  const setActiveTab = (id: string) => {
    if (!isControlled) {
      setUncontrolledActiveTab(id);
    }
    onTabChange?.(id);
  };

  const rootClassNames = [
    styles.tabsRoot,
    orientation === 'vertical' && styles.vertical,
    size === 'sm' && styles.tabsSm,
    size === 'lg' && styles.tabsLg,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const listClassNames = [
    styles.tabList,
    fullWidth && styles.tabListFull,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={rootClassNames}>
        <div className={listClassNames} role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
              disabled={tab.disabled}
            >
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
              {tab.badge !== undefined && (
                <span className={styles.tabBadge}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// TabPanel component
export function TabPanel({ id, children, className, padded = false }: TabPanelProps) {
  const { activeTab } = useTabsContext();

  if (activeTab !== id) {
    return null;
  }

  const classNames = [
    styles.tabPanel,
    padded && styles.tabPanelPadded,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={classNames}
    >
      {children}
    </div>
  );
}
