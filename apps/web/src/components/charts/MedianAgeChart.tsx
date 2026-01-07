import { useMemo } from 'react';
import { VegaEmbed } from 'react-vega';
import type { VisualizationSpec } from 'vega-embed';

interface MedianAgeData {
  year: number;
  medianAge: number;
  medianAgeMale: number;
  medianAgeFemale: number;
}

interface MedianAgeChartProps {
  data: MedianAgeData[];
}

export function MedianAgeChart({ data }: MedianAgeChartProps) {
  const spec: VisualizationSpec = useMemo(() => {
    // Transform data for multi-line chart
    const chartData: { year: number; category: string; age: number }[] = [];
    
    for (const d of data) {
      chartData.push({ year: d.year, category: 'Overall', age: d.medianAge });
      chartData.push({ year: d.year, category: 'Male', age: d.medianAgeMale });
      chartData.push({ year: d.year, category: 'Female', age: d.medianAgeFemale });
    }

    const years = data.map(d => d.year);

    return {
      $schema: 'https://vega.github.io/schema/vega/v5.json',
      width: 700,
      height: 400,
      padding: { left: 60, right: 150, top: 30, bottom: 50 },
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
          domain: { data: 'table', field: 'age' },
          range: 'height',
          nice: true,
          zero: false,
        },
        {
          name: 'color',
          type: 'ordinal',
          domain: ['Overall', 'Male', 'Female'],
          range: ['#a855f7', '#3b82f6', '#ec4899'],
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
          title: 'Median Age (years)',
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
                  y: { scale: 'y', field: 'age' },
                  stroke: { scale: 'color', field: 'category' },
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
                  y: { scale: 'y', field: 'age' },
                  fill: { scale: 'color', field: 'category' },
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
          title: 'Category',
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

