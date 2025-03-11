import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useEffect, useState } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ProjectChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      fill: boolean;
      tension: number;
      borderWidth: number;
    }[];
  };
}

export function ProjectChart({ data }: ProjectChartProps) {
  const [isClient, setIsClient] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Validate data
    if (!data || !data.datasets || !data.labels) {
      console.warn('ProjectChart: Invalid data structure', data);
      setChartError('Invalid chart data structure');
      return;
    }

    // Check if any dataset has non-zero values
    const hasNonZeroValues = data.datasets.some(dataset => 
      dataset.data.some(value => value > 0)
    );
    
    setHasData(hasNonZeroValues);
    
    if (!hasNonZeroValues) {
      console.log('ProjectChart: All datasets contain only zero values');
    }
  }, [data]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(var(--foreground-rgb))',
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += `${context.parsed.y}h`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: 'rgb(var(--foreground-rgb))',
          callback: function(value: any) {
            return value + 'h';
          }
        },
        grid: {
          color: 'rgba(var(--foreground-rgb), 0.1)',
        }
      },
      x: {
        ticks: {
          color: 'rgb(var(--foreground-rgb))',
        },
        grid: {
          color: 'rgba(var(--foreground-rgb), 0.1)',
        }
      }
    },
  };

  // Create a modified version of data with minimum values for zero data
  const getVisibleData = () => {
    if (hasData) return data;
    
    // If no data, create a version with a tiny value to ensure the chart renders
    return {
      ...data,
      datasets: data.datasets.map((dataset, index) => ({
        ...dataset,
        data: dataset.data.map(() => 0.01), // Tiny value to make lines visible
        borderDash: [5, 5], // Dashed lines for placeholder data
      }))
    };
  };

  if (chartError) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">Error loading chart: {chartError}</p>
      </div>
    );
  }

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading chart...</p>
      </div>
    );
  }

  try {
    if (!hasData) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-gray-500 mb-4">No time data recorded yet</p>
          <div className="text-sm text-gray-400">
            Complete sessions in your projects to see data here
          </div>
        </div>
      );
    }
    
    return <Line options={options} data={data} />;
  } catch (error) {
    console.error('Error rendering chart:', error);
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">Error rendering chart: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
}