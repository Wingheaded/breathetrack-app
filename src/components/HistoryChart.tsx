// src/components/HistoryChart.tsx - NO PLUGINS/ANNOTATIONS
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, TimeScale, ChartOptions, Filler, Chart
} from 'chart.js';
import 'chartjs-adapter-date-fns';
// --- NO annotationPlugin import ---
import { LogEntry } from '../db/db';

// --- NO annotationPlugin/custom plugin from registration ---
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, TimeScale, Filler
);

interface HistoryChartProps {
  logData: LogEntry[];
}

const getSpo2PointColor = (value: number | undefined): string => { if (value === undefined || value === null) return '#cccccc'; if (value < 88) return 'rgba(255, 99, 132, 1)'; if (value <= 91) return 'rgba(255, 205, 86, 1)'; return 'rgba(75, 192, 192, 1)'; };

const HistoryChart: React.FC<HistoryChartProps> = ({ logData }) => {
  if (!Array.isArray(logData) || logData.length === 0) { return null; }

  // --- Prepare Chart Data ---
  let chartData;
  try {
      const spo2Data = logData.map(entry => ({ x: entry.timestamp, y: entry.spo2 }));
      const pulseData = logData.map(entry => ({ x: entry.timestamp, y: entry.pulse }));
      const spo2PointColors = logData.map(entry => getSpo2PointColor(entry.spo2));
      chartData = {
        datasets: [
          { label: 'SpO₂ (%)', data: spo2Data, borderColor: 'rgba(54, 162, 235, 1)', backgroundColor: 'rgba(54, 162, 235, 0.2)', yAxisID: 'ySpo2', tension: 0.1, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: spo2PointColors, pointBorderColor: '#fff', pointBorderWidth: 1, },
          { label: 'Pulse (bpm)', data: pulseData, borderColor: 'rgba(255, 99, 132, 1)', backgroundColor: 'rgba(255, 99, 132, 0.2)', yAxisID: 'yPulse', tension: 0.1, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: 'rgba(255, 99, 132, 1)', pointBorderColor: '#fff', pointBorderWidth: 1, },
        ],
      };
  } catch(mapError) {
       console.error("!!! Error during data mapping:", mapError);
       return <p style={{color: 'red'}}>Error preparing chart data. Check console.</p>;
  }

   // --- Configure Chart Options ---
   let options: ChartOptions<'line'>;
   try {
       options = {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top' as const },
                tooltip: { // Tooltip config kept
                     backgroundColor: 'rgba(0, 0, 0, 0.8)', titleFont: { size: 14 }, bodyFont: { size: 12 }, padding: 10, boxPadding: 4,
                     callbacks: {
                          title: function(tooltipItems) { const timestamp = tooltipItems[0]?.parsed?.x; return timestamp ? new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short'}) : ''; },
                          label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null && context.parsed.y !== undefined) { label += context.parsed.y; if (context.dataset.label?.includes('SpO₂')) label += '%'; if (context.dataset.label?.includes('Pulse')) label += ' bpm'; const currentTimestamp = context.parsed.x; const logEntry = Array.isArray(logData) ? logData.find(entry => entry.timestamp === currentTimestamp) : undefined; if (logEntry?.oxygenOn) { label += ` (O₂: ${logEntry.oxygenFlow ?? '?'} L/min)`; } if (logEntry?.borg !== undefined && context.dataset.label?.includes('SpO₂')) { label += ` (Borg: ${logEntry.borg})`; } } else { label += 'No data'; } return label; }
                     }
                },
                title: { display: false },
                // --- NO annotation plugin section ---
            },
            scales: { // Scales config kept
                x: { type: 'time', time: { unit: 'day', displayFormats: { hour: 'ha', day: 'MMM d', month: 'MMM yyyy', year: 'yyyy' } }, title: { display: true, text: 'Date / Time' }, grid: { color: 'rgba(200, 200, 200, 0.1)' } },
                ySpo2: { type: 'linear', position: 'left', min: 75, max: 100, title: { display: true, text: 'SpO₂ (%)', color: 'rgba(54, 162, 235, 1)' }, ticks: { stepSize: 2, color: 'rgba(54, 162, 235, 1)' }, grid: { color: 'rgba(54, 162, 235, 0.1)' } },
                yPulse: { type: 'linear', position: 'right', min: 40, max: 160, title: { display: true, text: 'Pulse (bpm)', color: 'rgba(255, 99, 132, 1)' }, ticks: { stepSize: 10, color: 'rgba(255, 99, 132, 1)' }, grid: { drawOnChartArea: false }, },
             },
        };
    } catch(optionsError) {
        console.error("!!! Error defining chart options:", optionsError);
         return <p style={{color: 'red'}}>Error configuring chart options. Check console.</p>;
    }

  // --- Render Chart ---
  try {
      if (!chartData || !options) { return <p style={{color: 'red'}}>Chart data/options missing.</p>; }
      // Render the actual Line component without plugins prop
      return <Line options={options} data={chartData} />;
  } catch (renderError) {
       console.error("!!! Error rendering Line component:", renderError);
       return <p style={{color: 'red'}}>Failed to render chart. Check console.</p>;
   }
};

export default HistoryChart;