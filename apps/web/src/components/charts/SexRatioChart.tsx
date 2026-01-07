import { useMemo } from 'react';
import { VegaEmbed } from 'react-vega';
import type { VisualizationSpec } from 'vega-embed';

interface SexRatioData {
  year: number;
  overallRatio: number;
  atBirthRatio: number;
  childrenRatio: number;
  workingAgeRatio: number;
  elderlyRatio: number;
}

interface SexRatioChartProps {
  data: SexRatioData[];
}

export function SexRatioChart({ data }: SexRatioChartProps) {
  const spec: VisualizationSpec = useMemo(() => {
    // Transform data for multi-line chart
    const chartData: { year: number; category: string; ratio: number }[] = [];
    
    for (const d of data) {
      chartData.push({ year: d.year, category: 'Overall', ratio: d.overallRatio });
      chartData.push({ year: d.year, category: 'At Birth', ratio: d.atBirthRatio });
      chartData.push({ year: d.year, category: 'Children (0-14)', ratio: d.childrenRatio });
      chartData.push({ year: d.year, category: 'Working Age (15-64)', ratio: d.workingAgeRatio });
      chartData.push({ year: d.year, category: 'Elderly (65+)', ratio: d.elderlyRatio });
    }

    const years = data.map(d => d.year);

    return {
      $schema: 'https://vega.github.io/schema/vega/v6.json',
      width: 700,
      height: 400,
      padding: { left: 60, right: 180, top: 30, bottom: 50 },
      background: 'transparent',
      
      config: {
        axis: {
          labelColor: '#e2e8f0',
          titleColor: '#e2e8f0',
          gridColor: '#475569',
          domainColor: '#64748b',
          tickColor: '#64748b',
        },
        legend: {
          labelColor: '#e2e8f0',
          titleColor: '#e2e8f0',
        },
      },

      data: [
        {
          name: 'table',
          values: chartData,
        },
        {
          name: 'baseline',
          values: [{ ratio: 100 }],
        },
      ],

      scales: [
        {
          name: 'x',
          type: 'point',
          domain: years,
          range: 'width',
        },
        {
          name: 'y',
          type: 'linear',
          domain: { data: 'table', field: 'ratio' },
          range: 'height',
          nice: true,
          zero: false,
          padding: 20,
        },
        {
          name: 'color',
          type: 'ordinal',
          domain: ['Overall', 'At Birth', 'Children (0-14)', 'Working Age (15-64)', 'Elderly (65+)'],
          range: ['#a855f7', '#22d3ee', '#4ade80', '#facc15', '#f97316'],
        },
      ],

      axes: [
        {
          orient: 'bottom',
          scale: 'x',
          title: 'Year',
          values: years.filter((_, i) => i % Math.ceil(years.length / 10) === 0 || i === years.length - 1),
        },
        {
          orient: 'left',
          scale: 'y',
          title: 'Sex Ratio (males per 100 females)',
          grid: true,
          gridOpacity: 0.3,
        },
      ],

      marks: [
        // Reference line at 100
        {
          type: 'rule',
          encode: {
            enter: {
              y: { scale: 'y', value: 100 },
              x: { value: 0 },
              x2: { signal: 'width' },
              stroke: { value: '#64748b' },
              strokeDash: { value: [4, 4] },
              strokeWidth: { value: 1 },
            },
          },
        },
        {
          type: 'group',
          from: {
            facet: {
              name: 'faceted',
              data: 'table',
              groupby: 'category',
            },
          },
          marks: [
            {
              type: 'line',
              from: { data: 'faceted' },
              encode: {
                enter: {
                  x: { scale: 'x', field: 'year' },
                  y: { scale: 'y', field: 'ratio' },
                  stroke: { scale: 'color', field: 'category' },
                  strokeWidth: { value: 2.5 },
                },
              },
            },
            {
              type: 'symbol',
              from: { data: 'faceted' },
              encode: {
                enter: {
                  x: { scale: 'x', field: 'year' },
                  y: { scale: 'y', field: 'ratio' },
                  fill: { scale: 'color', field: 'category' },
                  size: { value: 30 },
                },
                hover: {
                  size: { value: 100 },
                },
              },
            },
          ],
        },
      ],

      legends: [
        {
          stroke: 'color',
          title: 'Age Group',
          orient: 'right',
          direction: 'vertical',
          titleFontSize: 12,
          labelFontSize: 11,
          symbolStrokeWidth: 2.5,
        },
      ],
    };
  }, [data]);

  return <VegaEmbed spec={spec} options={{ actions: false }} />;
}

