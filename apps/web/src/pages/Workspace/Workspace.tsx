import { useEffect, useRef, useState, lazy, Suspense } from 'react';
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
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  calculateSexRatios,
  calculateCohortTracking,
  calculateMedianAgeProgression,
  calculateLifeTable,
} from '@/utils/demographicCalculations';
import styles from './Workspace.module.css';

// Lazy load chart components to avoid issues with Vega initialization
const YearlyChangeChart = lazy(() => import('@/components/charts/YearlyChangeChart').then(m => ({ default: m.YearlyChangeChart })));
const PopulationPyramidChart = lazy(() => import('@/components/charts/PopulationPyramidChart').then(m => ({ default: m.PopulationPyramidChart })));
const AgeGroupChart = lazy(() => import('@/components/charts/AgeGroupChart').then(m => ({ default: m.AgeGroupChart })));
const DependencyRatioChart = lazy(() => import('@/components/charts/DependencyRatioChart').then(m => ({ default: m.DependencyRatioChart })));
const SexRatioChart = lazy(() => import('@/components/charts/SexRatioChart').then(m => ({ default: m.SexRatioChart })));
const MedianAgeChart = lazy(() => import('@/components/charts/MedianAgeChart').then(m => ({ default: m.MedianAgeChart })));

type DataType = 'population' | 'mortality' | 'fertility' | 'migration';

type ResultView = 
  | 'yearly-change' 
  | 'population-pyramid' 
  | 'age-groups' 
  | 'dependency-ratios'
  | 'sex-ratios'
  | 'cohort-tracking'
  | 'median-age'
  | 'life-table';

type YearlyChartType = 'line-chart';
type PyramidChartType = 'pyramid-chart';
type AgeGroupChartType = 'stacked-bar-chart';
type DependencyChartType = 'ratio-line-chart';
type SexRatioChartType = 'sex-ratio-chart';
type MedianAgeChartType = 'median-age-chart';

type ChartType = 
  | YearlyChartType 
  | PyramidChartType 
  | AgeGroupChartType 
  | DependencyChartType 
  | SexRatioChartType
  | MedianAgeChartType
  | 'table';

// Age group definitions for policy analysis
interface AgeGroupData {
  group: string;
  label: string;
  minAge: number;
  maxAge: number;
  male: number;
  female: number;
  total: number;
  percentage: number;
}

// Dependency ratio data
interface DependencyRatioData {
  year: number;
  youthRatio: number;      // (0-14) / (15-64) * 100
  oldAgeRatio: number;     // (65+) / (15-64) * 100
  totalRatio: number;      // (0-14 + 65+) / (15-64) * 100
  workingAgePop: number;   // 15-64
  youthPop: number;        // 0-14
  elderlyPop: number;      // 65+
}

function calculateAgeGroups(cohorts: { age: number; male: number; female: number }[]): AgeGroupData[] {
  const groups = [
    { group: 'children', label: 'Children (0-14)', minAge: 0, maxAge: 14 },
    { group: 'youth', label: 'Youth (15-24)', minAge: 15, maxAge: 24 },
    { group: 'working_young', label: 'Young Adults (25-44)', minAge: 25, maxAge: 44 },
    { group: 'working_mid', label: 'Middle Adults (45-64)', minAge: 45, maxAge: 64 },
    { group: 'elderly', label: 'Elderly (65-79)', minAge: 65, maxAge: 79 },
    { group: 'very_elderly', label: 'Very Elderly (80+)', minAge: 80, maxAge: 999 },
  ];

  const totalPop = cohorts.reduce((sum, c) => sum + c.male + c.female, 0);

  return groups.map(g => {
    const groupCohorts = cohorts.filter(c => c.age >= g.minAge && c.age <= g.maxAge);
    const male = groupCohorts.reduce((sum, c) => sum + c.male, 0);
    const female = groupCohorts.reduce((sum, c) => sum + c.female, 0);
    const total = male + female;
    return {
      ...g,
      male,
      female,
      total,
      percentage: totalPop > 0 ? (total / totalPop) * 100 : 0,
    };
  });
}

function calculateDependencyRatios(populationByYear: { year: number; cohorts: { age: number; male: number; female: number }[] }[]): DependencyRatioData[] {
  return populationByYear.map(yearData => {
    let youthPop = 0;
    let workingAgePop = 0;
    let elderlyPop = 0;

    for (const c of yearData.cohorts) {
      const pop = c.male + c.female;
      if (c.age <= 14) {
        youthPop += pop;
      } else if (c.age <= 64) {
        workingAgePop += pop;
      } else {
        elderlyPop += pop;
      }
    }

    const youthRatio = workingAgePop > 0 ? (youthPop / workingAgePop) * 100 : 0;
    const oldAgeRatio = workingAgePop > 0 ? (elderlyPop / workingAgePop) * 100 : 0;
    const totalRatio = youthRatio + oldAgeRatio;

    return {
      year: yearData.year,
      youthRatio,
      oldAgeRatio,
      totalRatio,
      workingAgePop,
      youthPop,
      elderlyPop,
    };
  });
}

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
  
  // Results view state
  const [resultView, setResultView] = useState<ResultView>('yearly-change');
  const [selectedPyramidYear, setSelectedPyramidYear] = useState<number | null>(null);
  const [chartType, setChartType] = useState<ChartType>('table');
  
  // Animation state for pyramid year slider
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(500); // ms per year
  
  // Sync local state with workspace
  useEffect(() => {
    if (workspace) {
      setBaseYear(workspace.parameters.baseYear);
      setEndYear(workspace.parameters.endYear);
      setSexRatio(workspace.parameters.sexRatioAtBirth);
    }
  }, [workspace?.id]);

  // Animation effect for pyramid year slider
  useEffect(() => {
    if (!isPlaying || !workspace?.projection.populationByYear) return;
    
    const years = workspace.projection.populationByYear;
    const minYear = years[0]?.year ?? 0;
    const maxYear = years[years.length - 1]?.year ?? 0;
    const currentYear = selectedPyramidYear ?? minYear;
    
    // If we're at the end, stop playing
    if (currentYear >= maxYear) {
      setIsPlaying(false);
      return;
    }
    
    const timer = setTimeout(() => {
      setSelectedPyramidYear(currentYear + 1);
    }, animationSpeed);
    
    return () => clearTimeout(timer);
  }, [isPlaying, selectedPyramidYear, animationSpeed, workspace?.projection.populationByYear]);

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
          populationByYear: response.populationByYear,
        });
        
        console.log(`✅ Projection completed in ${response.processingTimeMs}ms`);
        if (response.inputStats) {
          console.log('📊 Input stats:', response.inputStats);
        }
        if (response.populationByYear) {
          console.log(`📊 Population snapshots: ${response.populationByYear.length} years`);
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
          <div className={styles.resultsHeader}>
            <h2>📊 Projection Results</h2>
            <div className={styles.viewSwitcher}>
              <select 
                value={resultView} 
                onChange={(e) => {
                  setResultView(e.target.value as ResultView);
                  setChartType('table'); // Reset to table when switching views
                }}
                className={styles.viewSelect}
              >
                <option value="yearly-change">Year-over-Year Change</option>
                <option value="population-pyramid">Population Pyramid</option>
                <option value="age-groups">Age Group Summary</option>
                <option value="dependency-ratios">Dependency Ratios</option>
                <option value="sex-ratios">Sex Ratio Analysis</option>
                <option value="cohort-tracking">Cohort Tracking</option>
                <option value="median-age">Median Age Progression</option>
                <option value="life-table">Life Table</option>
              </select>
              
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as ChartType)}
                className={styles.viewSelect}
              >
                <option value="table">📋 Table</option>
                {resultView === 'yearly-change' && (
                  <option value="line-chart">📈 Line Chart</option>
                )}
                {resultView === 'population-pyramid' && (
                  <option value="pyramid-chart">📊 Pyramid Chart</option>
                )}
                {resultView === 'age-groups' && (
                  <option value="stacked-bar-chart">📊 Stacked Bar Chart</option>
                )}
                {resultView === 'dependency-ratios' && (
                  <option value="ratio-line-chart">📈 Ratio Line Chart</option>
                )}
                {resultView === 'sex-ratios' && (
                  <option value="sex-ratio-chart">📈 Sex Ratio Chart</option>
                )}
                {resultView === 'median-age' && (
                  <option value="median-age-chart">📈 Median Age Chart</option>
                )}
              </select>
            </div>
          </div>
          
          {/* Year-over-Year Change View */}
          {resultView === 'yearly-change' && chartType === 'table' && (
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
          )}
          
          {/* Year-over-Year Line Chart */}
          {resultView === 'yearly-change' && chartType === 'line-chart' && (
            <div className={styles.chartContainer}>
              <Suspense fallback={<div className={styles.chartLoading}>Loading chart...</div>}>
                <YearlyChangeChart data={workspace.projection.results} />
              </Suspense>
            </div>
          )}
          
          {/* Population Pyramid View */}
          {resultView === 'population-pyramid' && workspace.projection.populationByYear && (
            <div className={styles.pyramidView}>
              {(() => {
                const years = workspace.projection.populationByYear!;
                const minYear = years[0]?.year ?? 0;
                const maxYear = years[years.length - 1]?.year ?? 0;
                const currentYear = selectedPyramidYear ?? minYear;
                const currentData = years.find(y => y.year === currentYear);
                
                return (
                  <div className={styles.yearSliderContainer}>
                    <div className={styles.yearSliderHeader}>
                      <span className={styles.yearSliderLabel}>Year: <strong>{currentYear}</strong></span>
                      {currentData && (
                        <span className={styles.yearSliderPop}>
                          Population: {currentData.total.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className={styles.yearSliderRow}>
                      <button
                        className={styles.playButton}
                        onClick={() => {
                          if (isPlaying) {
                            setIsPlaying(false);
                          } else {
                            // If at the end, restart from beginning
                            if (currentYear >= maxYear) {
                              setSelectedPyramidYear(minYear);
                            }
                            setIsPlaying(true);
                          }
                        }}
                        title={isPlaying ? 'Pause' : 'Play animation'}
                      >
                        {isPlaying ? '⏸' : '▶'}
                      </button>
                      <span className={styles.yearSliderMin}>{minYear}</span>
                      <input
                        type="range"
                        min={minYear}
                        max={maxYear}
                        value={currentYear}
                        onChange={(e) => {
                          setIsPlaying(false);
                          setSelectedPyramidYear(parseInt(e.target.value));
                        }}
                        className={styles.yearSlider}
                      />
                      <span className={styles.yearSliderMax}>{maxYear}</span>
                      <div className={styles.speedControl}>
                        <span className={styles.speedLabel}>Speed:</span>
                        <input
                          type="range"
                          min={50}
                          max={1000}
                          step={50}
                          value={1050 - animationSpeed}
                          onChange={(e) => setAnimationSpeed(1050 - parseInt(e.target.value))}
                          className={styles.speedSlider}
                          title={`${animationSpeed}ms per year`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {(() => {
                const yearData = workspace.projection.populationByYear?.find(
                  s => s.year === (selectedPyramidYear ?? workspace.projection.populationByYear?.[0]?.year)
                );
                if (!yearData) return null;
                
                return (
                  <>
                    <div className={styles.pyramidSummary}>
                      <div className={styles.pyramidStat}>
                        <span className={styles.pyramidStatLabel}>Total Male</span>
                        <span className={styles.pyramidStatValue}>{yearData.totalMale.toLocaleString()}</span>
                      </div>
                      <div className={styles.pyramidStat}>
                        <span className={styles.pyramidStatLabel}>Total Female</span>
                        <span className={styles.pyramidStatValue}>{yearData.totalFemale.toLocaleString()}</span>
                      </div>
                      <div className={styles.pyramidStat}>
                        <span className={styles.pyramidStatLabel}>Total</span>
                        <span className={styles.pyramidStatValue}>{yearData.total.toLocaleString()}</span>
                      </div>
                      <div className={styles.pyramidStat}>
                        <span className={styles.pyramidStatLabel}>Sex Ratio</span>
                        <span className={styles.pyramidStatValue}>
                          {(yearData.totalMale / yearData.totalFemale * 100).toFixed(1)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Pyramid Chart */}
                    {chartType === 'pyramid-chart' && (
                      <div className={styles.chartContainer}>
                        <Suspense fallback={<div className={styles.chartLoading}>Loading chart...</div>}>
                          <PopulationPyramidChart data={yearData} />
                        </Suspense>
                      </div>
                    )}
                    
                    {/* Pyramid Table */}
                    {chartType === 'table' && (
                      <div className={styles.resultsTable}>
                        <table>
                          <thead>
                            <tr>
                              <th>Age</th>
                              <th>Male</th>
                              <th>Female</th>
                              <th>Total</th>
                              <th>% of Pop</th>
                              <th>Sex Ratio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {yearData.cohorts.map((cohort) => {
                              const total = cohort.male + cohort.female;
                              const pctOfPop = (total / yearData.total * 100);
                              const sexRatio = cohort.female > 0 
                                ? (cohort.male / cohort.female * 100).toFixed(1) 
                                : '—';
                              return (
                                <tr key={cohort.age}>
                                  <td>{cohort.age}</td>
                                  <td>{cohort.male.toLocaleString()}</td>
                                  <td>{cohort.female.toLocaleString()}</td>
                                  <td>{total.toLocaleString()}</td>
                                  <td>{pctOfPop.toFixed(2)}%</td>
                                  <td>{sexRatio}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          
          {resultView === 'population-pyramid' && !workspace.projection.populationByYear && (
            <div className={styles.noData}>
              <p>Population data by year is not available. Please run a new projection.</p>
            </div>
          )}

          {/* Age Group Summary View */}
          {resultView === 'age-groups' && workspace.projection.populationByYear && (
            <div className={styles.ageGroupView}>
              {(() => {
                const years = workspace.projection.populationByYear!;
                const minYear = years[0]?.year ?? 0;
                const maxYear = years[years.length - 1]?.year ?? 0;
                const currentYear = selectedPyramidYear ?? minYear;
                const currentData = years.find(y => y.year === currentYear);
                
                if (!currentData) return null;
                
                const ageGroups = calculateAgeGroups(currentData.cohorts);
                
                return (
                  <>
                    <div className={styles.yearSliderContainer}>
                      <div className={styles.yearSliderHeader}>
                        <span className={styles.yearSliderLabel}>Year: <strong>{currentYear}</strong></span>
                        <span className={styles.yearSliderPop}>
                          Population: {currentData.total.toLocaleString()}
                        </span>
                      </div>
                      <div className={styles.yearSliderRow}>
                        <button
                          className={styles.playButton}
                          onClick={() => {
                            if (isPlaying) {
                              setIsPlaying(false);
                            } else {
                              if (currentYear >= maxYear) {
                                setSelectedPyramidYear(minYear);
                              }
                              setIsPlaying(true);
                            }
                          }}
                          title={isPlaying ? 'Pause' : 'Play animation'}
                        >
                          {isPlaying ? '⏸' : '▶'}
                        </button>
                        <span className={styles.yearSliderMin}>{minYear}</span>
                        <input
                          type="range"
                          min={minYear}
                          max={maxYear}
                          value={currentYear}
                          onChange={(e) => {
                            setIsPlaying(false);
                            setSelectedPyramidYear(parseInt(e.target.value));
                          }}
                          className={styles.yearSlider}
                        />
                        <span className={styles.yearSliderMax}>{maxYear}</span>
                        <div className={styles.speedControl}>
                          <span className={styles.speedLabel}>Speed:</span>
                          <input
                            type="range"
                            min={50}
                            max={1000}
                            step={50}
                            value={1050 - animationSpeed}
                            onChange={(e) => setAnimationSpeed(1050 - parseInt(e.target.value))}
                            className={styles.speedSlider}
                            title={`${animationSpeed}ms per year`}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {chartType === 'stacked-bar-chart' ? (
                      <div className={styles.chartContainer}>
                        <ErrorBoundary fallback={<div className={styles.chartError}>Failed to load chart</div>}>
                          <Suspense fallback={<div className={styles.chartLoading}>Loading chart...</div>}>
                            <AgeGroupChart 
                              data={years.map(y => ({
                                year: y.year,
                                groups: calculateAgeGroups(y.cohorts)
                              }))}
                              selectedYear={currentYear}
                            />
                          </Suspense>
                        </ErrorBoundary>
                      </div>
                    ) : (
                      <div className={styles.ageGroupSummary}>
                        {ageGroups.map(g => (
                          <div key={g.group} className={styles.ageGroupCard}>
                            <div className={styles.ageGroupLabel}>{g.label}</div>
                            <div className={styles.ageGroupTotal}>{g.total.toLocaleString()}</div>
                            <div className={styles.ageGroupPct}>{g.percentage.toFixed(1)}%</div>
                            <div className={styles.ageGroupDetails}>
                              <span>♂ {g.male.toLocaleString()}</span>
                              <span>♀ {g.female.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {chartType === 'table' && (
                      <div className={styles.tableWrapper}>
                        <table className={styles.resultsTable}>
                          <thead>
                            <tr>
                              <th>Age Group</th>
                              <th>Male</th>
                              <th>Female</th>
                              <th>Total</th>
                              <th>% of Population</th>
                              <th>Sex Ratio (M/F×100)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ageGroups.map(g => (
                              <tr key={g.group}>
                                <td>{g.label}</td>
                                <td>{g.male.toLocaleString()}</td>
                                <td>{g.female.toLocaleString()}</td>
                                <td>{g.total.toLocaleString()}</td>
                                <td>{g.percentage.toFixed(2)}%</td>
                                <td>{g.female > 0 ? (g.male / g.female * 100).toFixed(1) : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Dependency Ratios View */}
          {resultView === 'dependency-ratios' && workspace.projection.populationByYear && (
            <div className={styles.dependencyView}>
              {(() => {
                const dependencyData = calculateDependencyRatios(workspace.projection.populationByYear!);
                const latestData = dependencyData[dependencyData.length - 1];
                const firstData = dependencyData[0];
                
                return (
                  <>
                    <div className={styles.dependencySummary}>
                      <div className={styles.dependencyCard}>
                        <div className={styles.dependencyCardTitle}>Youth Dependency</div>
                        <div className={styles.dependencyCardValue}>{latestData?.youthRatio.toFixed(1)}%</div>
                        <div className={styles.dependencyCardLabel}>
                          Children (0-14) per 100 working-age adults
                        </div>
                        <div className={styles.dependencyCardChange}>
                          {firstData && latestData && (
                            <span className={latestData.youthRatio > firstData.youthRatio ? styles.up : styles.down}>
                              {latestData.youthRatio > firstData.youthRatio ? '↑' : '↓'}{' '}
                              {Math.abs(latestData.youthRatio - firstData.youthRatio).toFixed(1)} pts since {firstData.year}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className={styles.dependencyCard}>
                        <div className={styles.dependencyCardTitle}>Old-Age Dependency</div>
                        <div className={styles.dependencyCardValue}>{latestData?.oldAgeRatio.toFixed(1)}%</div>
                        <div className={styles.dependencyCardLabel}>
                          Elderly (65+) per 100 working-age adults
                        </div>
                        <div className={styles.dependencyCardChange}>
                          {firstData && latestData && (
                            <span className={latestData.oldAgeRatio > firstData.oldAgeRatio ? styles.up : styles.down}>
                              {latestData.oldAgeRatio > firstData.oldAgeRatio ? '↑' : '↓'}{' '}
                              {Math.abs(latestData.oldAgeRatio - firstData.oldAgeRatio).toFixed(1)} pts since {firstData.year}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className={styles.dependencyCard + ' ' + styles.dependencyCardTotal}>
                        <div className={styles.dependencyCardTitle}>Total Dependency</div>
                        <div className={styles.dependencyCardValue}>{latestData?.totalRatio.toFixed(1)}%</div>
                        <div className={styles.dependencyCardLabel}>
                          Dependents per 100 working-age adults
                        </div>
                        <div className={styles.dependencyCardChange}>
                          {firstData && latestData && (
                            <span className={latestData.totalRatio > firstData.totalRatio ? styles.up : styles.down}>
                              {latestData.totalRatio > firstData.totalRatio ? '↑' : '↓'}{' '}
                              {Math.abs(latestData.totalRatio - firstData.totalRatio).toFixed(1)} pts since {firstData.year}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {chartType === 'ratio-line-chart' ? (
                      <div className={styles.chartContainer}>
                        <ErrorBoundary fallback={<div className={styles.chartError}>Failed to load chart</div>}>
                          <Suspense fallback={<div className={styles.chartLoading}>Loading chart...</div>}>
                            <DependencyRatioChart data={dependencyData} />
                          </Suspense>
                        </ErrorBoundary>
                      </div>
                    ) : (
                      <div className={styles.tableWrapper}>
                        <table className={styles.resultsTable}>
                          <thead>
                            <tr>
                              <th>Year</th>
                              <th>Youth (0-14)</th>
                              <th>Working Age (15-64)</th>
                              <th>Elderly (65+)</th>
                              <th>Youth Ratio</th>
                              <th>Old-Age Ratio</th>
                              <th>Total Ratio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dependencyData.map(d => (
                              <tr key={d.year}>
                                <td>{d.year}</td>
                                <td>{d.youthPop.toLocaleString()}</td>
                                <td>{d.workingAgePop.toLocaleString()}</td>
                                <td>{d.elderlyPop.toLocaleString()}</td>
                                <td>{d.youthRatio.toFixed(1)}%</td>
                                <td>{d.oldAgeRatio.toFixed(1)}%</td>
                                <td><strong>{d.totalRatio.toFixed(1)}%</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Sex Ratio Analysis View */}
          {resultView === 'sex-ratios' && workspace.projection.populationByYear && (
            <div className={styles.sexRatioView}>
              {(() => {
                const sexRatioData = calculateSexRatios(workspace.projection.populationByYear!);
                const latestData = sexRatioData[sexRatioData.length - 1];
                const firstData = sexRatioData[0];
                
                return (
                  <>
                    <div className={styles.sexRatioSummary}>
                      <div className={styles.ratioCard}>
                        <div className={styles.ratioCardTitle}>Overall Sex Ratio</div>
                        <div className={styles.ratioCardValue}>{latestData?.overallRatio.toFixed(1)}</div>
                        <div className={styles.ratioCardLabel}>Males per 100 females</div>
                      </div>
                      <div className={styles.ratioCard}>
                        <div className={styles.ratioCardTitle}>At Birth</div>
                        <div className={styles.ratioCardValue}>{latestData?.atBirthRatio.toFixed(1)}</div>
                        <div className={styles.ratioCardLabel}>Age 0</div>
                      </div>
                      <div className={styles.ratioCard}>
                        <div className={styles.ratioCardTitle}>Children (0-14)</div>
                        <div className={styles.ratioCardValue}>{latestData?.childrenRatio.toFixed(1)}</div>
                        <div className={styles.ratioCardLabel}>Pre-working age</div>
                      </div>
                      <div className={styles.ratioCard}>
                        <div className={styles.ratioCardTitle}>Working Age (15-64)</div>
                        <div className={styles.ratioCardValue}>{latestData?.workingAgeRatio.toFixed(1)}</div>
                        <div className={styles.ratioCardLabel}>Economically active</div>
                      </div>
                      <div className={styles.ratioCard}>
                        <div className={styles.ratioCardTitle}>Elderly (65+)</div>
                        <div className={styles.ratioCardValue}>{latestData?.elderlyRatio.toFixed(1)}</div>
                        <div className={styles.ratioCardLabel}>Higher female longevity</div>
                      </div>
                    </div>
                    
                    {chartType === 'sex-ratio-chart' ? (
                      <div className={styles.chartContainer}>
                        <ErrorBoundary fallback={<div className={styles.chartError}>Failed to load chart</div>}>
                          <Suspense fallback={<div className={styles.chartLoading}>Loading chart...</div>}>
                            <SexRatioChart data={sexRatioData} />
                          </Suspense>
                        </ErrorBoundary>
                      </div>
                    ) : (
                      <div className={styles.tableWrapper}>
                        <table className={styles.resultsTable}>
                          <thead>
                            <tr>
                              <th>Year</th>
                              <th>Overall</th>
                              <th>At Birth</th>
                              <th>Children</th>
                              <th>Working Age</th>
                              <th>Elderly</th>
                              <th>Total Male</th>
                              <th>Total Female</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sexRatioData.map(d => (
                              <tr key={d.year}>
                                <td>{d.year}</td>
                                <td><strong>{d.overallRatio.toFixed(1)}</strong></td>
                                <td>{d.atBirthRatio.toFixed(1)}</td>
                                <td>{d.childrenRatio.toFixed(1)}</td>
                                <td>{d.workingAgeRatio.toFixed(1)}</td>
                                <td>{d.elderlyRatio.toFixed(1)}</td>
                                <td>{d.totalMale.toLocaleString()}</td>
                                <td>{d.totalFemale.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Cohort Tracking View */}
          {resultView === 'cohort-tracking' && workspace.projection.populationByYear && (
            <div className={styles.cohortTrackingView}>
              {(() => {
                const years = workspace.projection.populationByYear!;
                const baseYear = years[0]?.year ?? 2024;
                const [selectedBirthYear, setSelectedBirthYearLocal] = [
                  baseYear,
                  (_: number) => {} // Placeholder - we'll use component state instead
                ];
                
                // Find available birth years (years where age 0 exists)
                const availableBirthYears = years
                  .filter(y => y.cohorts.some(c => c.age === 0))
                  .map(y => y.year);
                
                // Default to first available birth year
                const trackingYear = selectedPyramidYear ?? availableBirthYears[0] ?? baseYear;
                const cohortData = calculateCohortTracking(years, trackingYear);
                
                return (
                  <>
                    <div className={styles.cohortControls}>
                      <label className={styles.cohortLabel}>
                        Track birth cohort from year:
                        <select
                          value={trackingYear}
                          onChange={(e) => setSelectedPyramidYear(parseInt(e.target.value))}
                          className={styles.viewSelect}
                        >
                          {availableBirthYears.map(y => (
                            <option key={y} value={y}>Born in {y}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    
                    {cohortData.length > 0 ? (
                      <div className={styles.tableWrapper}>
                        <table className={styles.resultsTable}>
                          <thead>
                            <tr>
                              <th>Year</th>
                              <th>Age</th>
                              <th>Population</th>
                              <th>Male</th>
                              <th>Female</th>
                              <th>Survival Rate</th>
                              <th>Cumulative Survival</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cohortData.map(d => (
                              <tr key={d.year}>
                                <td>{d.year}</td>
                                <td>{d.age}</td>
                                <td><strong>{d.population.toLocaleString()}</strong></td>
                                <td>{d.male.toLocaleString()}</td>
                                <td>{d.female.toLocaleString()}</td>
                                <td>{d.survivalRate !== undefined ? `${(d.survivalRate * 100).toFixed(2)}%` : '—'}</td>
                                <td>{d.cumulativeSurvival !== undefined ? `${(d.cumulativeSurvival * 100).toFixed(2)}%` : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className={styles.noData}>
                        <p>No cohort data available for the selected birth year.</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Median Age Progression View */}
          {resultView === 'median-age' && workspace.projection.populationByYear && (
            <div className={styles.medianAgeView}>
              {(() => {
                const medianData = calculateMedianAgeProgression(workspace.projection.populationByYear!);
                const latestData = medianData[medianData.length - 1];
                const firstData = medianData[0];
                const totalChange = latestData && firstData 
                  ? latestData.medianAge - firstData.medianAge 
                  : 0;
                
                return (
                  <>
                    <div className={styles.medianAgeSummary}>
                      <div className={styles.medianCard}>
                        <div className={styles.medianCardTitle}>Current Median Age</div>
                        <div className={styles.medianCardValue}>{latestData?.medianAge.toFixed(1)}</div>
                        <div className={styles.medianCardLabel}>Year {latestData?.year}</div>
                      </div>
                      <div className={styles.medianCard}>
                        <div className={styles.medianCardTitle}>Male Median</div>
                        <div className={styles.medianCardValue}>{latestData?.medianAgeMale.toFixed(1)}</div>
                        <div className={styles.medianCardLabel}>years</div>
                      </div>
                      <div className={styles.medianCard}>
                        <div className={styles.medianCardTitle}>Female Median</div>
                        <div className={styles.medianCardValue}>{latestData?.medianAgeFemale.toFixed(1)}</div>
                        <div className={styles.medianCardLabel}>years</div>
                      </div>
                      <div className={styles.medianCard + (totalChange > 0 ? ' ' + styles.aging : '')}>
                        <div className={styles.medianCardTitle}>Total Change</div>
                        <div className={styles.medianCardValue}>
                          {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)}
                        </div>
                        <div className={styles.medianCardLabel}>
                          {firstData?.year} → {latestData?.year}
                        </div>
                      </div>
                    </div>
                    
                    {chartType === 'median-age-chart' ? (
                      <div className={styles.chartContainer}>
                        <ErrorBoundary fallback={<div className={styles.chartError}>Failed to load chart</div>}>
                          <Suspense fallback={<div className={styles.chartLoading}>Loading chart...</div>}>
                            <MedianAgeChart data={medianData} />
                          </Suspense>
                        </ErrorBoundary>
                      </div>
                    ) : (
                      <div className={styles.tableWrapper}>
                        <table className={styles.resultsTable}>
                          <thead>
                            <tr>
                              <th>Year</th>
                              <th>Median Age</th>
                              <th>Male Median</th>
                              <th>Female Median</th>
                              <th>Change</th>
                            </tr>
                          </thead>
                          <tbody>
                            {medianData.map(d => (
                              <tr key={d.year}>
                                <td>{d.year}</td>
                                <td><strong>{d.medianAge.toFixed(1)}</strong></td>
                                <td>{d.medianAgeMale.toFixed(1)}</td>
                                <td>{d.medianAgeFemale.toFixed(1)}</td>
                                <td>
                                  {d.change !== undefined 
                                    ? <span className={d.change > 0 ? styles.aging : styles.younging}>
                                        {d.change > 0 ? '+' : ''}{d.change.toFixed(2)}
                                      </span>
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Life Table View */}
          {resultView === 'life-table' && workspace.mortality && (
            <div className={styles.lifeTableView}>
              {(() => {
                // Convert mortality data to life table format
                const mortalityRates = workspace.mortality!.rows.map(row => ({
                  age: row.age,
                  qx: (row.male + row.female) / 2, // Average of male/female rates
                }));
                
                const lifeTable = calculateLifeTable(mortalityRates);
                const e0 = lifeTable[0]?.ex ?? 0;
                const e65 = lifeTable.find(r => r.age === 65)?.ex ?? 0;
                
                return (
                  <>
                    <div className={styles.lifeTableSummary}>
                      <div className={styles.lifeCard}>
                        <div className={styles.lifeCardTitle}>Life Expectancy at Birth</div>
                        <div className={styles.lifeCardValue}>{e0.toFixed(1)}</div>
                        <div className={styles.lifeCardLabel}>years (e₀)</div>
                      </div>
                      <div className={styles.lifeCard}>
                        <div className={styles.lifeCardTitle}>Life Expectancy at 65</div>
                        <div className={styles.lifeCardValue}>{e65.toFixed(1)}</div>
                        <div className={styles.lifeCardLabel}>years remaining (e₆₅)</div>
                      </div>
                      <div className={styles.lifeCard}>
                        <div className={styles.lifeCardTitle}>Survival to 65</div>
                        <div className={styles.lifeCardValue}>
                          {((lifeTable.find(r => r.age === 65)?.lx ?? 0) / 1000).toFixed(1)}%
                        </div>
                        <div className={styles.lifeCardLabel}>of birth cohort</div>
                      </div>
                    </div>
                    
                    <div className={styles.tableWrapper}>
                      <table className={styles.resultsTable}>
                        <thead>
                          <tr>
                            <th>Age (x)</th>
                            <th>qₓ</th>
                            <th>lₓ</th>
                            <th>dₓ</th>
                            <th>Lₓ</th>
                            <th>Tₓ</th>
                            <th>eₓ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lifeTable.map(row => (
                            <tr key={row.age}>
                              <td>{row.age}</td>
                              <td>{(row.qx * 1000).toFixed(2)}‰</td>
                              <td>{row.lx.toLocaleString()}</td>
                              <td>{row.dx.toLocaleString()}</td>
                              <td>{Math.round(row.Lx).toLocaleString()}</td>
                              <td>{Math.round(row.Tx).toLocaleString()}</td>
                              <td><strong>{row.ex.toFixed(1)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className={styles.lifeTableNote}>
                      <p><strong>Legend:</strong> qₓ = probability of dying, lₓ = survivors, dₓ = deaths, Lₓ = person-years lived, Tₓ = total person-years above age x, eₓ = life expectancy</p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {resultView === 'life-table' && !workspace.mortality && (
            <div className={styles.noData}>
              <p>Mortality data is required to generate a life table. Please import mortality data first.</p>
            </div>
          )}
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

