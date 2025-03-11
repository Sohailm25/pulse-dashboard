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
  Filler,
  type ChartOptions
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
  const [hasNonZeroData, setHasNonZeroData] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const timer = setTimeout(() => {
      setChartReady(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      if (!data || !data.datasets || !Array.isArray(data.datasets)) {
        console.warn('Chart data is missing or invalid');
        setChartError('Invalid chart data structure');
        return;
      }
      
      const hasData = data.datasets.some(dataset => 
        dataset.data && Array.isArray(dataset.data) && 
        dataset.data.some(value => value !== 0)
      );
      
      setHasNonZeroData(hasData);
      
      if (!hasData && data.datasets.length > 0) {
        console.log('All chart data values are zero');
      }
    } catch (err) {
      console.error('Error validating chart data:', err);
      setChartError(`Error processing chart data: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [data]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: chartReady ? 1000 : 0
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          padding: 10
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} hours`;
          }
        }
      }
    },
    transitions: {
      active: {
        animation: {
          duration: chartReady ? 400 : 0
        }
      }
    }
  };

  const getVisibleData = () => {
    if (!data || !data.datasets || !Array.isArray(data.datasets) || data.datasets.length === 0) {
      return {
        labels: data?.labels || [],
        datasets: []
      };
    }
    
    if (!hasNonZeroData) {
      return {
        labels: data.labels,
        datasets: data.datasets.map(dataset => ({
          ...dataset,
          data: dataset.data.map(() => 0.05),
          borderWidth: 1,
          borderDash: [5, 5]
        }))
      };
    }
    
    return data;
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-50 dark:bg-gray-800/50 rounded-md">
        <p className="text-gray-500 dark:text-gray-400">Loading chart...</p>
      </div>
    );
  }

  if (chartError) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-red-50 dark:bg-red-900/20 rounded-md">
        <p className="text-red-500 dark:text-red-400">
          Unable to display chart: {chartError}
        </p>
      </div>
    );
  }

  if (!data.datasets || data.datasets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-50 dark:bg-gray-800/50 rounded-md">
        <p className="text-gray-500 dark:text-gray-400">
          No project data available for this period
        </p>
      </div>
    );
  }

  if (!hasNonZeroData) {
    return (
      <div className="relative h-full w-full">
        <div className="absolute inset-0 opacity-30">
          <Line options={options} data={getVisibleData()} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-md shadow-sm">
            <p className="text-gray-600 dark:text-gray-300">
              No hours tracked during this period
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!chartReady) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-50 dark:bg-gray-800/50 rounded-md">
        <p className="text-gray-500 dark:text-gray-400">Preparing chart...</p>
      </div>
    );
  }

  try {
    return <Line options={options} data={getVisibleData()} />;
  } catch (err) {
    console.error('Error rendering chart:', err);
    return (
      <div className="flex items-center justify-center h-full w-full bg-red-50 dark:bg-red-900/20 rounded-md">
        <p className="text-red-500 dark:text-red-400">
          Chart rendering failed. Please try refreshing the page.
        </p>
      </div>
    );
  }
}