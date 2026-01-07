import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useNatsStore } from '@/stores/natsStore';
import {
  parsePopulationCSV,
  parseMortalityCSV,
  parseFertilityCSV,
  parseMigrationCSV,
  CSVParseError,
} from '@/services/csvParser';
import type { 
  DataImportState,
  ProjectionRunRequest,
} from '@popula/shared-types';
import { isReadyForProjection, getWorkspaceValidationErrors } from '@popula/shared-types';
import styles from './Workspace.module.css';

type DataType = 'population' | 'mortality' | 'fertility' | 'migration';

interface FileUploadProps {
  dataType: DataType;
  importState: DataImportState;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  icon: string;
  title: string;
  description: React.ReactNode;
  optional?: boolean;
}

function FileUpload({
  importState,
  onFileSelect,
  onClear,
  icon,
  title,
  description,
  optional,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className={`${styles.uploadCard} ${styles[importState.status]}`}>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      
      <div className={styles.uploadHeader}>
        <div className={styles.uploadIcon}>{icon}</div>
        <div className={styles.uploadTitle}>
          <h4>{title}</h4>
          {optional && <span className={styles.optionalBadge}>Optional</span>}
        </div>
      </div>
      
      <p className={styles.uploadDescription}>{description}</p>
      
      {importState.status === 'empty' && (
        <div className={styles.uploadActions}>
          <button className="btn btn-secondary" onClick={handleClick}>
            Choose File
          </button>
        </div>
      )}
      
      {importState.status === 'loaded' && (
        <div className={styles.loadedState}>
          <div className={styles.fileInfo}>
            <span className={styles.fileName}>{importState.fileName}</span>
            <span className={styles.rowCount}>{importState.rowCount} ages</span>
          </div>
          <div className={styles.loadedActions}>
            <button className="btn btn-secondary btn-sm" onClick={handleClick}>
              Replace
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClear}>
              Clear
            </button>
          </div>
        </div>
      )}
      
      {importState.status === 'error' && (
        <div className={styles.errorState}>
          <span className={styles.errorMessage}>{importState.error}</span>
          <button className="btn btn-secondary btn-sm" onClick={handleClick}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

export function Workspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { status: natsStatus } = useNatsStore();
  
  const {
    getWorkspace,
    setPopulationData,
    setMortalityData,
    setFertilityData,
    setMigrationData,
    setImportError,
    clearData,
    setProjectionParameters,
    setProjectionState,
  } = useWorkspaceStore();
  
  const workspace = id ? getWorkspace(id) : undefined;
  
  // Local state for parameters form
  const [baseYear, setBaseYear] = useState(2024);
  const [endYear, setEndYear] = useState(2050);
  const [sexRatio, setSexRatio] = useState(105.0);
  
  // Sync local state with workspace
  useEffect(() => {
    if (workspace) {
      setBaseYear(workspace.parameters.baseYear);
      setEndYear(workspace.parameters.endYear);
      setSexRatio(workspace.parameters.sexRatioAtBirth);
    }
  }, [workspace?.id]);

  if (!id || !workspace) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h2>Workspace Not Found</h2>
          <p>The workspace you're looking for doesn't exist.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const handleFileUpload = async (dataType: DataType, file: File) => {
    try {
      const text = await file.text();
      
      switch (dataType) {
        case 'population': {
          const data = parsePopulationCSV(text);
          setPopulationData(id, data, file.name);
          break;
        }
        case 'mortality': {
          const data = parseMortalityCSV(text);
          setMortalityData(id, data, file.name);
          break;
        }
        case 'fertility': {
          const data = parseFertilityCSV(text);
          setFertilityData(id, data, file.name);
          break;
        }
        case 'migration': {
          const data = parseMigrationCSV(text);
          setMigrationData(id, data, file.name);
          break;
        }
      }
    } catch (error) {
      const message = error instanceof CSVParseError 
        ? error.message 
        : 'Failed to parse file';
      setImportError(id, dataType, message);
    }
  };

  const handleLoadSample = async () => {
    try {
      // Fetch all sample files
      const [popRes, mortRes, fertRes, migRes] = await Promise.all([
        fetch('/sample-data/population.csv'),
        fetch('/sample-data/mortality.csv'),
        fetch('/sample-data/fertility.csv'),
        fetch('/sample-data/migration.csv'),
      ]);
      
      const [popText, mortText, fertText, migText] = await Promise.all([
        popRes.text(),
        mortRes.text(),
        fertRes.text(),
        migRes.text(),
      ]);
      
      // Parse and load each dataset
      const popData = parsePopulationCSV(popText);
      setPopulationData(id, popData, 'population.csv (Humania)');
      setMortalityData(id, parseMortalityCSV(mortText), 'mortality.csv (Humania)');
      setFertilityData(id, parseFertilityCSV(fertText), 'fertility.csv (Humania)');
      setMigrationData(id, parseMigrationCSV(migText), 'migration.csv (Humania)');
    } catch (error) {
      console.error('Failed to load sample data:', error);
    }
  };

  const handleParametersSave = () => {
    setProjectionParameters(id, {
      baseYear,
      endYear,
      sexRatioAtBirth: sexRatio,
    });
  };

  const handleRunProjection = async () => {
    if (!isReadyForProjection(workspace) || !workspace.population || !workspace.mortality || !workspace.fertility) {
      return;
    }
    
    const { runProjection } = useNatsStore.getState();
    
    // Set running state
    setProjectionState(id, {
      status: 'running',
      progress: 0,
      currentYear: baseYear,
      error: undefined,
    });
    
    try {
      // Build the request payload
      const request: ProjectionRunRequest = {
        workspaceId: id,
        baseYear,
        endYear,
        sexRatioAtBirth: sexRatio,
        population: workspace.population.rows.map(row => ({
          age: row.age,
          male: row.male,
          female: row.female,
        })),
        mortality: workspace.mortality.rows.map(row => ({
          age: row.age,
          male: row.male,
          female: row.female,
        })),
        fertility: workspace.fertility.rows.map(row => ({
          age: row.age,
          rate: row.rate,
        })),
        migration: workspace.migration?.rows.map(row => ({
          age: row.age,
          male: row.male,
          female: row.female,
        })),
      };
      
      // Send to Rust worker via NATS
      const response = await runProjection(request);
      
      if (response.success) {
        // Convert response to our format
        const results = response.years.map(year => ({
          year: year.year,
          totalPopulation: year.totalPopulation,
          births: year.births,
          deaths: year.deaths,
          netMigration: year.netMigration,
          naturalChange: year.naturalChange,
          growthRate: year.growthRate,
        }));
        
        setProjectionState(id, {
          status: 'completed',
          progress: 100,
          results,
          processingTimeMs: response.processingTimeMs,
          inputStats: response.inputStats,
          completedAt: new Date().toISOString(),
        });
        
        console.log(`✅ Projection completed in ${response.processingTimeMs}ms`);
        if (response.inputStats) {
          console.log('📊 Input stats:', response.inputStats);
        }
      } else {
        setProjectionState(id, {
          status: 'error',
          error: response.error || 'Unknown error',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Projection failed';
      setProjectionState(id, {
        status: 'error',
        error: errorMessage,
      });
      console.error('Projection error:', err);
    }
  };

  const validationErrors = getWorkspaceValidationErrors(workspace);
  const canRun = isReadyForProjection(workspace) && natsStatus === 'connected';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            ← Back
          </button>
          <h1>{workspace.name}</h1>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.lastUpdated}>
            Updated {new Date(workspace.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </header>

      {/* Data Import Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Import Data</h2>
          <button 
            className={styles.sampleButton}
            onClick={handleLoadSample}
          >
            <span>🌍</span> Load Humania Sample
          </button>
        </div>
        
        <div className={styles.uploadGrid}>
          <FileUpload
            dataType="population"
            importState={workspace.populationImport}
            onFileSelect={(file) => handleFileUpload('population', file)}
            onClear={() => clearData(id, 'population')}
            icon="👥"
            title="Population"
            description={<>Initial age-sex distribution. Format: <code>age, male, female</code></>}
          />
          
          <FileUpload
            dataType="mortality"
            importState={workspace.mortalityImport}
            onFileSelect={(file) => handleFileUpload('mortality', file)}
            onClear={() => clearData(id, 'mortality')}
            icon="💀"
            title="Mortality"
            description={<>Death probability by age (0-1). Format: <code>age, male, female</code></>}
          />
          
          <FileUpload
            dataType="fertility"
            importState={workspace.fertilityImport}
            onFileSelect={(file) => handleFileUpload('fertility', file)}
            onClear={() => clearData(id, 'fertility')}
            icon="👶"
            title="Fertility"
            description={<>Annual birth rate per woman. Format: <code>age, rate</code></>}
          />
          
          <FileUpload
            dataType="migration"
            importState={workspace.migrationImport}
            onFileSelect={(file) => handleFileUpload('migration', file)}
            onClear={() => clearData(id, 'migration')}
            icon="✈️"
            title="Migration"
            description={<>Net annual migrants (± values). Format: <code>age, male, female</code></>}
            optional
          />
        </div>
      </section>

      {/* Projection Parameters */}
      <section className={styles.section}>
        <h2>⚙️ Projection Parameters</h2>
        
        <div className={styles.parametersGrid}>
          <div className={styles.paramField}>
            <label htmlFor="baseYear">Base Year</label>
            <input
              id="baseYear"
              type="number"
              value={baseYear}
              onChange={(e) => setBaseYear(parseInt(e.target.value) || 2024)}
              onBlur={handleParametersSave}
              min={1900}
              max={2100}
            />
          </div>
          
          <div className={styles.paramField}>
            <label htmlFor="endYear">End Year</label>
            <input
              id="endYear"
              type="number"
              value={endYear}
              onChange={(e) => setEndYear(parseInt(e.target.value) || 2050)}
              onBlur={handleParametersSave}
              min={baseYear + 1}
              max={2200}
            />
          </div>
          
          <div className={styles.paramField}>
            <label htmlFor="sexRatio">Sex Ratio at Birth</label>
            <input
              id="sexRatio"
              type="number"
              value={sexRatio}
              onChange={(e) => setSexRatio(parseFloat(e.target.value) || 105)}
              onBlur={handleParametersSave}
              step="0.1"
              min={100}
              max={110}
            />
            <span className={styles.paramHint}>Males per 100 females</span>
          </div>
        </div>
        
        {validationErrors.length > 0 && (
          <div className={styles.validationErrors}>
            {validationErrors.map((error, i) => (
              <div key={i} className={styles.validationError}>⚠️ {error}</div>
            ))}
          </div>
        )}
        
        <div className={styles.runSection}>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleRunProjection}
            disabled={!canRun || workspace.projection.status === 'running'}
          >
            {workspace.projection.status === 'running' 
              ? `Running... ${workspace.projection.progress?.toFixed(0)}%` 
              : '🚀 Run Projection'
            }
          </button>
          
          {!canRun && validationErrors.length === 0 && natsStatus !== 'connected' && (
            <span className={styles.runHint}>Waiting for NATS connection...</span>
          )}
        </div>
      </section>

      {/* Projection Results */}
      {workspace.projection.results && workspace.projection.results.length > 0 && (
        <section className={styles.section}>
          <h2>📊 Projection Results</h2>
          
          <div className={styles.resultsTable}>
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Population</th>
                  <th>Births</th>
                  <th>Deaths</th>
                  <th>Migration</th>
                  <th>Natural Change</th>
                  <th>Growth Rate</th>
                </tr>
              </thead>
              <tbody>
                {workspace.projection.results.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td>{row.totalPopulation.toLocaleString()}</td>
                    <td>{row.births.toLocaleString()}</td>
                    <td>{row.deaths.toLocaleString()}</td>
                    <td>{row.netMigration.toLocaleString()}</td>
                    <td className={row.naturalChange >= 0 ? styles.positive : styles.negative}>
                      {row.naturalChange >= 0 ? '+' : ''}{row.naturalChange.toLocaleString()}
                    </td>
                    <td className={row.growthRate >= 0 ? styles.positive : styles.negative}>
                      {row.growthRate >= 0 ? '+' : ''}{row.growthRate.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Worker Run Info */}
      {workspace.projection.inputStats && (
        <section className={styles.section}>
          <h2>🔧 Last Worker Run</h2>
          
          <div className={styles.workerInfo}>
            <div className={styles.workerInfoGrid}>
              <div className={styles.workerInfoItem}>
                <span className={styles.workerInfoLabel}>Processing Time</span>
                <span className={styles.workerInfoValue}>
                  {workspace.projection.processingTimeMs?.toLocaleString() ?? 0} ms
                </span>
              </div>
              
              <div className={styles.workerInfoItem}>
                <span className={styles.workerInfoLabel}>Years Projected</span>
                <span className={styles.workerInfoValue}>
                  {workspace.projection.inputStats.yearsProjected} years
                  <span className={styles.workerInfoDetail}>
                    ({workspace.projection.inputStats.baseYear} → {workspace.projection.inputStats.endYear})
                  </span>
                </span>
              </div>
              
              <div className={styles.workerInfoItem}>
                <span className={styles.workerInfoLabel}>Completed At</span>
                <span className={styles.workerInfoValue}>
                  {workspace.projection.completedAt 
                    ? new Date(workspace.projection.completedAt).toLocaleString()
                    : 'N/A'}
                </span>
              </div>
            </div>
            
            <h4>Input Data Received</h4>
            <div className={styles.inputStatsGrid}>
              <div className={styles.inputStatItem}>
                <span className={styles.inputStatLabel}>Population Rows</span>
                <span className={styles.inputStatValue}>{workspace.projection.inputStats.populationRows}</span>
              </div>
              <div className={styles.inputStatItem}>
                <span className={styles.inputStatLabel}>Mortality Rows</span>
                <span className={styles.inputStatValue}>{workspace.projection.inputStats.mortalityRows}</span>
              </div>
              <div className={styles.inputStatItem}>
                <span className={styles.inputStatLabel}>Fertility Rows</span>
                <span className={styles.inputStatValue}>{workspace.projection.inputStats.fertilityRows}</span>
              </div>
              <div className={styles.inputStatItem}>
                <span className={styles.inputStatLabel}>Migration Rows</span>
                <span className={styles.inputStatValue}>{workspace.projection.inputStats.migrationRows}</span>
              </div>
            </div>
            
            <h4>Initial Population (from Input)</h4>
            <div className={styles.inputStatsGrid}>
              <div className={styles.inputStatItem}>
                <span className={styles.inputStatLabel}>Total</span>
                <span className={styles.inputStatValue}>
                  {workspace.projection.inputStats.totalInitialPopulation.toLocaleString()}
                </span>
              </div>
              <div className={styles.inputStatItem}>
                <span className={styles.inputStatLabel}>Male</span>
                <span className={styles.inputStatValue}>
                  {workspace.projection.inputStats.malePopulation.toLocaleString()}
                </span>
              </div>
              <div className={styles.inputStatItem}>
                <span className={styles.inputStatLabel}>Female</span>
                <span className={styles.inputStatValue}>
                  {workspace.projection.inputStats.femalePopulation.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

