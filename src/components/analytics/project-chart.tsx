import { useEffect, useState, useRef } from 'react';
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
} from 'chart.js';

// Register ChartJS components
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
  const [isReady, setIsReady] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const chartRef = useRef(null);

  // Flag for client-side rendering
  useEffect(() => {
    setIsClient(true);
    
    // Add a delay to ensure DOM is fully ready before chart rendering
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Validate data and check if we have meaningful data to display
  useEffect(() => {
    try {
      // Check if data is valid
      if (!data || !data.labels || !data.datasets) {
        console.log("Chart data is missing required properties:", data);
        setChartError("Invalid chart data structure");
        return;
      }

      // Check if we have any non-zero values in any dataset
      const hasNonZeroValues = data.datasets.some(dataset => 
        dataset.data.some(value => value > 0)
      );
      
      setHasData(hasNonZeroValues);
      
      if (!hasNonZeroValues) {
        console.log("All chart datasets contain only zero values");
      }
    } catch (err) {
      console.error("Error validating chart data:", err);
      setChartError(`Error processing chart data: ${err.message}`);
    }
  }, [data]);

  // Prepare chart options with animations disabled initially
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: isReady ? {
      duration: 1000
    } : false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} hours`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Hours'
        }
      }
    }
  };

  // Create a modified version of data where we ensure there's at least some visible data
  const getVisibleData = () => {
    // If we don't have real data, add a tiny value to make the chart visible
    if (!hasData && data && data.datasets && data.datasets.length > 0) {
      return {
        ...data,
        datasets: data.datasets.map(dataset => ({
          ...dataset,
          data: dataset.data.map((val, i) => val || 0.1), // Add tiny value to make lines visible
          borderDash: [5, 5], // Make lines dashed to indicate they're placeholder
          pointRadius: 0 // Hide points for placeholder data
        }))
      };
    }
    return data;
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-gray-500">Preparing chart...</p>
      </div>
    );
  }

  if (chartError) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">{chartError}</p>
      </div>
    );
  }

  try {
    return (
      <>
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 z-10">
            <p className="text-gray-500">Loading chart...</p>
          </div>
        )}
        <Line
          ref={chartRef}
          options={options}
          data={getVisibleData()}
        />
        {!hasData && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 dark:text-gray-600 bg-white/80 dark:bg-gray-800/80 p-2 rounded">
              No data recorded this week
            </p>
          </div>
        )}
      </>
    );
  } catch (error) {
    console.error("Error rendering chart:", error);
    return (
      <div className="flex items-center justify-center h-full w-full bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">
          Error rendering chart: {error.message || "Unknown error"}. Please try refreshing the page.
        </p>
      </div>
    );
  }
}