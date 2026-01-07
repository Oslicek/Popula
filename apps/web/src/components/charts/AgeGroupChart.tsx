import { useMemo } from 'react';
import { VegaEmbed } from 'react-vega';
import type { VisualizationSpec } from 'vega-embed';

interface AgeGroupData {
  group: string;
  label: string;
  male: number;
  female: number;
  total: number;
  percentage: number;
}

interface YearAgeGroupData {
  year: number;
  groups: AgeGroupData[];
}

interface AgeGroupChartProps {
  data: YearAgeGroupData[];
  selectedYear?: number;
}

export function AgeGroupChart({ data, selectedYear }: AgeGroupChartProps) {
  const spec: VisualizationSpec = useMemo(() => {
    // Transform data for stacked bar chart - show all years
    const chartData: { year: number; group: string; sex: string; population: number }[] = [];
    
    for (const yearData of data) {
      for (const group of yearData.groups) {
        chartData.push({
          year: yearData.year,
          group: group.label,
          sex: 'Male',
          population: group.male,
        });
        chartData.push({
          year: yearData.year,
          group: group.label,
          sex: 'Female',
          population: group.female,
        });
      }
    }

    const years = data.map(d => d.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    return {
      $schema: 'https://vega.github.io/schema/vega/v5.json',
      width: 700,
      height: 400,
      padding: { left: 60, right: 150, top: 30, bottom: 60 },
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
          name: 'stacked',
          source: 'table',
          transform: [
            {
              type: 'stack',
              groupby: ['year'],
              sort: { field: 'group' },
              field: 'population',
            },
          ],
        },
      ],

      scales: [
        {
          name: 'x',
          type: 'band',
          domain: { data: 'table', field: 'year' },
          range: 'width',
          padding: 0.2,
        },
        {
          name: 'y',
          type: 'linear',
          domain: { data: 'stacked', field: 'y1' },
          range: 'height',
          nice: true,
        },
        {
          name: 'color',
          type: 'ordinal',
          domain: [
            'Children (0-14)',
            'Youth (15-24)',
            'Young Adults (25-44)',
            'Middle Adults (45-64)',
            'Elderly (65-79)',
            'Very Elderly (80+)',
          ],
          range: ['#22d3ee', '#a78bfa', '#4ade80', '#facc15', '#f97316', '#ef4444'],
        },
      ],

      axes: [
        {
          orient: 'bottom',
          scale: 'x',
          title: 'Year',
          labelAngle: -45,
          labelAlign: 'right',
          values: years.filter((_, i) => i % Math.ceil(years.length / 10) === 0 || i === years.length - 1),
        },
        {
          orient: 'left',
          scale: 'y',
          title: 'Population',
          format: '~s',
          grid: true,
          gridOpacity: 0.3,
        },
      ],

      marks: [
        {
          type: 'rect',
          from: { data: 'stacked' },
          encode: {
            enter: {
              x: { scale: 'x', field: 'year' },
              width: { scale: 'x', band: 1 },
              y: { scale: 'y', field: 'y0' },
              y2: { scale: 'y', field: 'y1' },
              fill: { scale: 'color', field: 'group' },
              strokeWidth: { value: 0.5 },
              stroke: { value: '#1a1a2e' },
            },
            update: {
              fillOpacity: selectedYear 
                ? [{ test: `datum.year === ${selectedYear}`, value: 1 }, { value: 0.5 }]
                : { value: 0.85 },
            },
            hover: {
              fillOpacity: { value: 1 },
            },
          },
        },
      ],

      legends: [
        {
          fill: 'color',
          title: 'Age Groups',
          orient: 'right',
          direction: 'vertical',
          titleFontSize: 12,
          labelFontSize: 11,
          symbolSize: 120,
        },
      ],
    };
  }, [data, selectedYear]);

  return <VegaEmbed spec={spec} actions={false} />;
}

