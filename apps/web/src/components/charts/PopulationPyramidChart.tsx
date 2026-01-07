/**
 * Population Pyramid Chart
 * 
 * Displays age-sex distribution as a horizontal bar chart (pyramid style)
 * using Vega visualization.
 */

import { useMemo } from 'react';
import { VegaEmbed } from 'react-vega';
import type { YearPopulationSnapshot } from '@popula/shared-types';
import type { VisualizationSpec } from 'vega-embed';

interface PopulationPyramidChartProps {
  data: YearPopulationSnapshot;
  width?: number;
  height?: number;
}

export function PopulationPyramidChart({ 
  data, 
  width = 800, 
  height = 600 
}: PopulationPyramidChartProps) {
  const spec = useMemo(() => createSpec(data, width, height), [data, width, height]);
  
  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <VegaEmbed spec={spec as VisualizationSpec} options={{ actions: false }} />
    </div>
  );
}

function createSpec(data: YearPopulationSnapshot, width: number, height: number) {
  // Transform data for pyramid - male values become negative for left side
  const pyramidData = data.cohorts.map(c => ({
    age: c.age,
    male: -c.male,  // Negative for left side
    female: c.female,
    maleAbs: c.male,
    femaleAbs: c.female
  }));
  
  // Find max value for symmetric scale
  const maxPop = Math.max(
    ...data.cohorts.map(c => Math.max(c.male, c.female))
  );

  return {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    width: width - 60,
    height: height - 60,
    padding: { left: 30, right: 30, top: 40, bottom: 40 },
    background: 'transparent',
    
    title: {
      text: `Population Pyramid - ${data.year}`,
      color: '#e2e8f0',
      fontSize: 16,
      anchor: 'start',
      offset: 10
    },
    
    data: [
      {
        name: 'pyramid',
        values: pyramidData
      }
    ],
    
    scales: [
      {
        name: 'y',
        type: 'band',
        domain: { data: 'pyramid', field: 'age', sort: { order: 'descending' } },
        range: 'height',
        padding: 0.1
      },
      {
        name: 'x',
        type: 'linear',
        domain: [-maxPop * 1.1, maxPop * 1.1],
        range: 'width',
        nice: true
      }
    ],
    
    axes: [
      {
        orient: 'bottom',
        scale: 'x',
        title: 'Population',
        labelColor: '#94a3b8',
        titleColor: '#94a3b8',
        tickColor: '#334155',
        domainColor: '#334155',
        gridColor: '#1e293b',
        grid: true,
        format: '~s',
        encode: {
          labels: {
            update: {
              text: { signal: "abs(datum.value) >= 1000000 ? format(abs(datum.value), '~s') : format(abs(datum.value), ',')" }
            }
          }
        }
      },
      {
        orient: 'left',
        scale: 'y',
        title: 'Age',
        labelColor: '#94a3b8',
        titleColor: '#94a3b8',
        tickColor: '#334155',
        domainColor: '#334155',
        values: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
      }
    ],
    
    marks: [
      // Male bars (left side, negative values)
      {
        type: 'rect',
        from: { data: 'pyramid' },
        encode: {
          enter: {
            y: { scale: 'y', field: 'age' },
            height: { scale: 'y', band: 1 },
            x: { scale: 'x', field: 'male' },
            x2: { scale: 'x', value: 0 },
            fill: { value: '#3b82f6' },
            cornerRadiusTopLeft: { value: 2 },
            cornerRadiusBottomLeft: { value: 2 }
          },
          update: {
            fillOpacity: { value: 0.8 }
          },
          hover: {
            fillOpacity: { value: 1 }
          }
        }
      },
      // Female bars (right side, positive values)
      {
        type: 'rect',
        from: { data: 'pyramid' },
        encode: {
          enter: {
            y: { scale: 'y', field: 'age' },
            height: { scale: 'y', band: 1 },
            x: { scale: 'x', value: 0 },
            x2: { scale: 'x', field: 'female' },
            fill: { value: '#ec4899' },
            cornerRadiusTopRight: { value: 2 },
            cornerRadiusBottomRight: { value: 2 }
          },
          update: {
            fillOpacity: { value: 0.8 }
          },
          hover: {
            fillOpacity: { value: 1 }
          }
        }
      },
      // Center line
      {
        type: 'rule',
        encode: {
          enter: {
            x: { scale: 'x', value: 0 },
            y: { value: 0 },
            y2: { signal: 'height' },
            stroke: { value: '#475569' },
            strokeWidth: { value: 1 }
          }
        }
      },
      // Legend labels
      {
        type: 'text',
        encode: {
          enter: {
            x: { signal: 'width * 0.25' },
            y: { value: -15 },
            text: { value: '← Male' },
            fill: { value: '#3b82f6' },
            fontSize: { value: 12 },
            fontWeight: { value: 'bold' },
            align: { value: 'center' }
          }
        }
      },
      {
        type: 'text',
        encode: {
          enter: {
            x: { signal: 'width * 0.75' },
            y: { value: -15 },
            text: { value: 'Female →' },
            fill: { value: '#ec4899' },
            fontSize: { value: 12 },
            fontWeight: { value: 'bold' },
            align: { value: 'center' }
          }
        }
      }
    ]
  };
}

