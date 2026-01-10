/**
 * Scenarios Page - Scenario management
 * 
 * Features:
 * - Scenario list with cards
 * - Search and filter
 * - Inspector panel with details and parameters
 * - Create, edit, duplicate, delete scenarios
 */

import { useEffect } from 'react';
import { useScenariosStore, type Scenario, type ScenarioStatus } from '../../stores/scenariosStore';
import styles from './Scenarios.module.css';

export function Scenarios() {
  const {
    scenarios,
    selectedScenarioId,
    selectScenario,
    clearSelection,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    getFilteredScenarios,
    getSelectedScenario,
    addScenario,
    deleteScenario,
    duplicateScenario,
    updateScenario,
  } = useScenariosStore();

  const filteredScenarios = getFilteredScenarios();
  const selectedScenario = getSelectedScenario();

  // Add demo scenarios on first load if empty
  useEffect(() => {
    if (scenarios.length === 0) {
      addScenario({
        name: 'Baseline Projection',
        description: 'Standard demographic projection using current trends and assumptions.',
        status: 'published',
        owner: 'system',
        parameters: {
          fertility: 1.65,
          mortality: 'medium',
          migration: 'baseline',
        },
        tags: ['default', 'ONS'],
      });
      addScenario({
        name: 'High Growth',
        description: 'Optimistic scenario with higher fertility and increased immigration.',
        status: 'published',
        owner: 'user',
        parameters: {
          fertility: 2.1,
          mortality: 'low',
          migration: 'high',
        },
        tags: ['optimistic', 'policy'],
      });
      addScenario({
        name: 'Low Growth',
        description: 'Conservative scenario with lower fertility and reduced migration.',
        status: 'draft',
        owner: 'user',
        parameters: {
          fertility: 1.4,
          mortality: 'high',
          migration: 'low',
        },
        tags: ['conservative'],
      });
    }
  }, [scenarios.length, addScenario]);

  const handleCardClick = (id: string) => {
    if (selectedScenarioId === id) {
      clearSelection();
    } else {
      selectScenario(id);
    }
  };

  const statusFilters: Array<{ label: string; value: ScenarioStatus | null }> = [
    { label: 'All', value: null },
    { label: 'Published', value: 'published' },
    { label: 'Draft', value: 'draft' },
    { label: 'Archived', value: 'archived' },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Scenarios</h1>
        </div>
        <div className={styles.headerActions}>
          <button 
            className="btn btn-primary"
            onClick={() => {
              addScenario({
                name: 'New Scenario',
                description: '',
                status: 'draft',
                owner: 'user',
                parameters: {},
                tags: [],
              });
            }}
          >
            + New Scenario
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <SearchIcon className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search scenarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          {statusFilters.map((filter) => (
            <button
              key={filter.label}
              className={`${styles.filterButton} ${statusFilter === filter.value ? styles.active : ''}`}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Scenarios List */}
        <div className={styles.listSection}>
          {filteredScenarios.length === 0 ? (
            <EmptyState hasScenarios={scenarios.length > 0} />
          ) : (
            <div className={styles.scenariosGrid}>
              {filteredScenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isSelected={selectedScenarioId === scenario.id}
                  onClick={() => handleCardClick(scenario.id)}
                  onDuplicate={() => duplicateScenario(scenario.id)}
                  onDelete={() => deleteScenario(scenario.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Inspector Panel */}
        <div className={styles.inspectorSection}>
          {selectedScenario ? (
            <ScenarioInspector 
              scenario={selectedScenario} 
              onUpdate={(updates) => updateScenario(selectedScenario.id, updates)}
            />
          ) : (
            <NoSelection />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

interface ScenarioCardProps {
  scenario: Scenario;
  isSelected: boolean;
  onClick: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ScenarioCard({ scenario, isSelected, onClick, onDuplicate, onDelete }: ScenarioCardProps) {
  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div 
      className={`${styles.scenarioCard} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
    >
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{scenario.name}</h3>
        <span className={`${styles.statusBadge} ${styles[scenario.status]}`}>
          {scenario.status}
        </span>
      </div>
      
      {scenario.description && (
        <p className={styles.cardDescription}>{scenario.description}</p>
      )}
      
      {scenario.tags.length > 0 && (
        <div className={styles.cardTags}>
          {scenario.tags.map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      )}
      
      <div className={styles.cardMeta}>
        <span>
          {scenario.lastRunAt 
            ? `Last run: ${scenario.lastRunAt.toLocaleDateString()}`
            : 'Never run'
          }
        </span>
        <div className={styles.cardActions}>
          <button 
            className={styles.cardAction}
            onClick={(e) => handleAction(e, onDuplicate)}
            title="Duplicate"
          >
            <DuplicateIcon />
          </button>
          <button 
            className={styles.cardAction}
            onClick={(e) => handleAction(e, onDelete)}
            title="Delete"
          >
            <DeleteIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ScenarioInspectorProps {
  scenario: Scenario;
  onUpdate: (updates: Partial<Scenario>) => void;
}

function ScenarioInspector({ scenario, onUpdate }: ScenarioInspectorProps) {
  const parameters = Object.entries(scenario.parameters);

  return (
    <div className={styles.inspector}>
      <div className={styles.inspectorHeader}>
        <span className={styles.inspectorTitle}>{scenario.name}</span>
        <span className={`${styles.statusBadge} ${styles[scenario.status]}`}>
          {scenario.status}
        </span>
      </div>
      
      <div className={styles.inspectorContent}>
        {/* Description */}
        <div className={styles.inspectorSection}>
          <div className={styles.sectionTitle}>Description</div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            {scenario.description || 'No description'}
          </p>
        </div>

        {/* Parameters */}
        <div className={styles.inspectorSection}>
          <div className={styles.sectionTitle}>Parameters</div>
          {parameters.length > 0 ? (
            <div className={styles.parametersList}>
              {parameters.map(([key, value]) => (
                <div key={key} className={styles.parameter}>
                  <span className={styles.parameterLabel}>{formatParameterName(key)}</span>
                  <span className={styles.parameterValue}>{String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              No parameters configured
            </p>
          )}
        </div>

        {/* Tags */}
        <div className={styles.inspectorSection}>
          <div className={styles.sectionTitle}>Tags</div>
          {scenario.tags.length > 0 ? (
            <div className={styles.cardTags}>
              {scenario.tags.map((tag) => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              No tags
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className={styles.inspectorSection}>
          <div className={styles.sectionTitle}>Details</div>
          <div className={styles.parametersList}>
            <div className={styles.parameter}>
              <span className={styles.parameterLabel}>Owner</span>
              <span className={styles.parameterValue}>{scenario.owner}</span>
            </div>
            <div className={styles.parameter}>
              <span className={styles.parameterLabel}>Created</span>
              <span className={styles.parameterValue}>
                {scenario.createdAt.toLocaleDateString()}
              </span>
            </div>
            <div className={styles.parameter}>
              <span className={styles.parameterLabel}>Updated</span>
              <span className={styles.parameterValue}>
                {scenario.updatedAt.toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.inspectorActions}>
        <button className="btn btn-primary">
          Run Projection
        </button>
        {scenario.status === 'draft' && (
          <button 
            className="btn btn-secondary"
            onClick={() => onUpdate({ status: 'published' })}
          >
            Publish Scenario
          </button>
        )}
        {scenario.status === 'published' && (
          <button 
            className="btn btn-secondary"
            onClick={() => onUpdate({ status: 'archived' })}
          >
            Archive Scenario
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ hasScenarios }: { hasScenarios: boolean }) {
  return (
    <div className={styles.emptyState}>
      <ScenarioEmptyIcon className={styles.emptyIcon} />
      <h2 className={styles.emptyTitle}>
        {hasScenarios ? 'No matching scenarios' : 'No scenarios yet'}
      </h2>
      <p className={styles.emptyDescription}>
        {hasScenarios 
          ? 'Try adjusting your search or filters to find what you\'re looking for.'
          : 'Create your first demographic projection scenario to get started.'
        }
      </p>
    </div>
  );
}

function NoSelection() {
  return (
    <div className={styles.noSelection}>
      <SelectIcon className={styles.noSelectionIcon} />
      <p>Select a scenario to view details</p>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatParameterName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// ============================================================
// Icons
// ============================================================

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="5" />
      <path d="M11 11l3 3" strokeLinecap="round" />
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5" y="5" width="8" height="8" rx="1" />
      <path d="M3 11V3a1 1 0 011-1h8" strokeLinecap="round" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScenarioEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="12" y="8" width="40" height="48" rx="2" />
      <path d="M20 20h24M20 28h24M20 36h16" strokeLinecap="round" />
      <circle cx="48" cy="48" r="12" fill="var(--color-bg-secondary)" />
      <path d="M44 48h8M48 44v8" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function SelectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="8" y="8" width="32" height="32" rx="2" />
      <path d="M16 20h16M16 28h8" strokeLinecap="round" />
      <path d="M32 36l4-4-4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Scenario Editor Page (for /scenarios/:id route)
export function ScenarioEditorPlaceholder() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Scenario Editor</h1>
      </div>
      <div className={styles.content}>
        <div className={styles.emptyState}>
          <ScenarioEmptyIcon className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>Scenario Editor</h2>
          <p className={styles.emptyDescription}>
            Individual scenario editing view coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}

// Export for routing
export { Scenarios as ScenariosPlaceholder };
