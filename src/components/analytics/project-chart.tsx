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
  const [chartError, setChartError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!data || !data.datasets || data.datasets.length === 0) {
      console.warn('ProjectChart received invalid data:', data);
      setChartError('Invalid chart data');
      return;
    }

    if (!data.labels || data.labels.length === 0) {
      console.warn('ProjectChart received invalid labels:', data.labels);
      setChartError('Invalid chart labels');
      return;
    }

    setChartError(null);
  }, [data]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y}h`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 15,
        ticks: {
          stepSize: 1.5,
          callback: (value: number) => `${value}h`
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      line: {
        fill: true
      }
    }
  };

  if (chartError) {
    return (
      <div className="h-[300px] flex items-center justify-center text-red-500">
        <p>Error rendering chart: {chartError}</p>
      </div>
    );
  }

  if (!isClient) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-gray-400">Loading chart...</p>
      </div>
    );
  }

  try {
    return (
      <div className="h-[300px]">
        <Line options={options} data={data} />
      </div>
    );
  } catch (error) {
    console.error('Error rendering chart:', error);
    return (
      <div className="h-[300px] flex items-center justify-center text-red-500">
        <p>Failed to render chart. Please try refreshing the page.</p>
      </div>
    );
  }
}