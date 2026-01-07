/**
 * Year-over-Year Change Line Chart
 * 
 * Displays population, births, deaths, and migration trends over time
 * using Vega visualization with dual Y-axes.
 */

import { useMemo } from 'react';
import { VegaEmbed } from 'react-vega';
import type { ProjectionYear } from '@popula/shared-types';
import type { VisualizationSpec } from 'vega-embed';

interface YearlyChangeChartProps {
  data: ProjectionYear[];
  width?: number;
  height?: number;
}

export function YearlyChangeChart({ 
  data, 
  width = 800, 
  height = 400 
}: YearlyChangeChartProps) {
  const spec = useMemo(() => createSpec(data, width, height), [data, width, height]);
  
  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <VegaEmbed spec={spec as VisualizationSpec} options={{ actions: false }} />
    </div>
  );
}

function createSpec(data: ProjectionYear[], width: number, height: number) {
  // Separate data for different scales
  const populationData = data.map(d => ({ 
    year: d.year, 
    value: d.totalPopulation, 
    series: 'Population' 
  }));
  
  const componentsData = [
    ...data.map(d => ({ year: d.year, value: d.births, series: 'Births' })),
    ...data.map(d => ({ year: d.year, value: d.deaths, series: 'Deaths' })),
    ...data.map(d => ({ year: d.year, value: d.netMigration, series: 'Net Migration' })),
  ];

  return {
    $schema: 'https://vega.github.io/schema/vega/v6.json',
    width: width - 160,
    height: height - 100,
    padding: { left: 80, right: 80, top: 50, bottom: 50 },
    background: 'transparent',
    
    data: [
      {
        name: 'population',
        values: populationData
      },
      {
        name: 'components',
        values: componentsData
      }
    ],
    
    scales: [
      {
        name: 'x',
        type: 'point',
        domain: { data: 'population', field: 'year', sort: true },
        range: 'width'
      },
      {
        name: 'yPop',
        type: 'linear',
        domain: { data: 'population', field: 'value' },
        range: 'height',
        nice: true,
        zero: false
      },
      {
        name: 'yComp',
        type: 'linear',
        domain: { data: 'components', field: 'value' },
        range: 'height',
        nice: true
      },
      {
        name: 'colorPop',
        type: 'ordinal',
        domain: ['Population'],
        range: ['#8b5cf6']
      },
      {
        name: 'colorComp',
        type: 'ordinal',
        domain: ['Births', 'Deaths', 'Net Migration'],
        range: ['#22c55e', '#ef4444', '#3b82f6']
      }
    ],
    
    axes: [
      {
        orient: 'bottom',
        scale: 'x',
        title: 'Year',
        labelColor: '#94a3b8',
        titleColor: '#94a3b8',
        tickColor: '#334155',
        domainColor: '#334155',
        gridColor: '#1e293b',
        grid: true,
        labelAngle: -45,
        labelAlign: 'right'
      },
      {
        orient: 'left',
        scale: 'yPop',
        title: 'Population',
        labelColor: '#8b5cf6',
        titleColor: '#8b5cf6',
        tickColor: '#334155',
        domainColor: '#8b5cf6',
        format: '~s',
        gridColor: '#1e293b',
        grid: true
      },
      {
        orient: 'right',
        scale: 'yComp',
        title: 'Births / Deaths / Migration',
        labelColor: '#94a3b8',
        titleColor: '#94a3b8',
        tickColor: '#334155',
        domainColor: '#334155',
        format: '~s'
      }
    ],
    
    legends: [
      {
        stroke: 'colorPop',
        orient: 'none',
        legendX: 0,
        legendY: -45,
        direction: 'horizontal',
        labelColor: '#e2e8f0',
        symbolType: 'stroke',
        symbolStrokeWidth: 3,
        padding: 4
      },
      {
        stroke: 'colorComp',
        orient: 'none',
        legendX: 150,
        legendY: -45,
        direction: 'horizontal',
        labelColor: '#e2e8f0',
        symbolType: 'stroke',
        symbolStrokeWidth: 3,
        padding: 4
      }
    ],
    
    marks: [
      // Population line (left Y-axis)
      {
        type: 'line',
        from: { data: 'population' },
        encode: {
          enter: {
            x: { scale: 'x', field: 'year' },
            y: { scale: 'yPop', field: 'value' },
            stroke: { value: '#8b5cf6' },
            strokeWidth: { value: 3 }
          }
        }
      },
      {
        type: 'symbol',
        from: { data: 'population' },
        encode: {
          enter: {
            x: { scale: 'x', field: 'year' },
            y: { scale: 'yPop', field: 'value' },
            fill: { value: '#8b5cf6' },
            size: { value: 50 }
          }
        }
      },
      // Component lines (right Y-axis)
      {
        type: 'group',
        from: {
          facet: {
            name: 'series',
            data: 'components',
            groupby: 'series'
          }
        },
        marks: [
          {
            type: 'line',
            from: { data: 'series' },
            encode: {
              enter: {
                x: { scale: 'x', field: 'year' },
                y: { scale: 'yComp', field: 'value' },
                stroke: { scale: 'colorComp', field: 'series' },
                strokeWidth: { value: 2 }
              }
            }
          },
          {
            type: 'symbol',
            from: { data: 'series' },
            encode: {
              enter: {
                x: { scale: 'x', field: 'year' },
                y: { scale: 'yComp', field: 'value' },
                fill: { scale: 'colorComp', field: 'series' },
                size: { value: 30 }
              }
            }
          }
        ]
      }
    ]
  };
}
