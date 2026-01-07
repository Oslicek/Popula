import { useMemo } from 'react';
import { VegaEmbed } from 'react-vega';
import type { VisualizationSpec } from 'vega-embed';

interface DependencyRatioData {
  year: number;
  youthRatio: number;
  oldAgeRatio: number;
  totalRatio: number;
  workingAgePop: number;
  youthPop: number;
  elderlyPop: number;
}

interface DependencyRatioChartProps {
  data: DependencyRatioData[];
}

export function DependencyRatioChart({ data }: DependencyRatioChartProps) {
  const spec: VisualizationSpec = useMemo(() => {
    // Transform data for multi-line chart
    const chartData: { year: number; ratio: string; value: number }[] = [];
    
    for (const d of data) {
      chartData.push({ year: d.year, ratio: 'Youth Dependency', value: d.youthRatio });
      chartData.push({ year: d.year, ratio: 'Old-Age Dependency', value: d.oldAgeRatio });
      chartData.push({ year: d.year, ratio: 'Total Dependency', value: d.totalRatio });
    }

    const years = data.map(d => d.year);

    return {
      $schema: 'https://vega.github.io/schema/vega/v5.json',
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
        title: {
          color: '#e2e8f0',
        },
      },

      data: [
        {
          name: 'table',
          values: chartData,
        },
        {
          name: 'series',
          source: 'table',
          transform: [
            {
              type: 'collect',
              sort: { field: 'year' },
            },
          ],
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
          domain: { data: 'table', field: 'value' },
          range: 'height',
          nice: true,
          zero: true,
        },
        {
          name: 'color',
          type: 'ordinal',
          domain: ['Youth Dependency', 'Old-Age Dependency', 'Total Dependency'],
          range: ['#22d3ee', '#f97316', '#a855f7'],
        },
      ],

      axes: [
        {
          orient: 'bottom',
          scale: 'x',
          title: 'Year',
          labelAngle: 0,
          values: years.filter((_, i) => i % Math.ceil(years.length / 10) === 0 || i === years.length - 1),
        },
        {
          orient: 'left',
          scale: 'y',
          title: 'Dependency Ratio (%)',
          grid: true,
          gridOpacity: 0.3,
        },
      ],

      marks: [
        {
          type: 'group',
          from: {
            facet: {
              name: 'faceted',
              data: 'series',
              groupby: 'ratio',
            },
          },
          marks: [
            {
              type: 'line',
              from: { data: 'faceted' },
              encode: {
                enter: {
                  x: { scale: 'x', field: 'year' },
                  y: { scale: 'y', field: 'value' },
                  stroke: { scale: 'color', field: 'ratio' },
                  strokeWidth: { value: 3 },
                },
              },
            },
            {
              type: 'symbol',
              from: { data: 'faceted' },
              encode: {
                enter: {
                  x: { scale: 'x', field: 'year' },
                  y: { scale: 'y', field: 'value' },
                  fill: { scale: 'color', field: 'ratio' },
                  size: { value: 40 },
                },
                hover: {
                  size: { value: 120 },
                },
              },
            },
          ],
        },
      ],

      legends: [
        {
          stroke: 'color',
          title: 'Dependency Ratio',
          orient: 'right',
          direction: 'vertical',
          titleFontSize: 12,
          labelFontSize: 11,
          symbolStrokeWidth: 3,
        },
      ],
    };
  }, [data]);

  return <VegaEmbed spec={spec} actions={false} />;
}

