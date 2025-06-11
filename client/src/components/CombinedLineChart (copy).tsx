import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ActivityData {
  date: string;
  wordScore?: number;
  phraseScore?: number;
  readingScore?: number;
}

interface CombinedLineChartProps {
  wordActivities: { score: number | null; createdAt: string }[];
  phraseActivities: { score: number | null; createdAt: string }[];
  readingActivities: { score: number | null; createdAt: string }[];
}

export function CombinedLineChart({ wordActivities, phraseActivities, readingActivities }: CombinedLineChartProps) {
  const [timeRange, setTimeRange] = useState<'10' | '30' | '90'>('10');

  // Process and combine data based on selected time range
  const processData = () => {
    const now = new Date();
    let startDate: Date;
    
    if (timeRange === '10') {
      // Get last 10 activities for each type, sorted by most recent
      const recentWords = wordActivities
        .filter(a => a.score !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .reverse(); // Reverse to put oldest first for proper x-axis mapping
        
      const recentPhrases = phraseActivities
        .filter(a => a.score !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .reverse();
        
      const recentReadings = readingActivities
        .filter(a => a.score !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .reverse();
      
      // Create data points for x=1 through x=10
      const dataPoints = [];
      for (let i = 1; i <= 10; i++) {
        dataPoints.push({
          x: i,
          wordScore: recentWords[i-1]?.score || undefined,
          phraseScore: recentPhrases[i-1]?.score || undefined,
          readingScore: recentReadings[i-1]?.score || undefined,
          label: `Position ${i}`
        });
      }
      
      return dataPoints;
    } else {
      // Last X days with daily averages
      const days = timeRange === '30' ? 30 : 90;
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      const dailyData: { [key: string]: { word: number[], phrase: number[], reading: number[] } } = {};
      
      // Process word activities
      wordActivities.forEach(activity => {
        const date = new Date(activity.createdAt);
        if (date >= startDate && activity.score !== null) {
          const dateKey = date.toISOString().split('T')[0];
          if (!dailyData[dateKey]) dailyData[dateKey] = { word: [], phrase: [], reading: [] };
          dailyData[dateKey].word.push(activity.score);
        }
      });
      
      // Process phrase activities
      phraseActivities.forEach(activity => {
        const date = new Date(activity.createdAt);
        if (date >= startDate && activity.score !== null) {
          const dateKey = date.toISOString().split('T')[0];
          if (!dailyData[dateKey]) dailyData[dateKey] = { word: [], phrase: [], reading: [] };
          dailyData[dateKey].phrase.push(activity.score);
        }
      });
      
      // Process reading activities
      readingActivities.forEach(activity => {
        const date = new Date(activity.createdAt);
        if (date >= startDate && activity.score !== null) {
          const dateKey = date.toISOString().split('T')[0];
          if (!dailyData[dateKey]) dailyData[dateKey] = { word: [], phrase: [], reading: [] };
          dailyData[dateKey].reading.push(activity.score);
        }
      });
      
      // Convert to chart data with averages
      return Object.entries(dailyData)
        .sort()
        .map(([date, scores], index) => ({
          x: index + 1,
          wordScore: scores.word.length > 0 ? scores.word.reduce((a, b) => a + b, 0) / scores.word.length : undefined,
          phraseScore: scores.phrase.length > 0 ? scores.phrase.reduce((a, b) => a + b, 0) / scores.phrase.length : undefined,
          readingScore: scores.reading.length > 0 ? scores.reading.reduce((a, b) => a + b, 0) / scores.reading.length : undefined,
          label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }));
    }
  };

  const data = processData();
  const maxScore = 100;
  const yAxisLabels = [100, 75, 50, 25, 0];

  if (data.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Progress Overview</h3>
          <Select value={timeRange} onValueChange={(value: '10' | '30' | '90') => setTimeRange(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Last 10 Activities</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
          No activity data available yet
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Progress Overview</h3>
        <Select value={timeRange} onValueChange={(value: '10' | '30' | '90') => setTimeRange(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">Last 10 Activities</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="bg-white rounded-lg border p-4">
        <div className="flex h-64">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-between text-xs text-gray-400 pr-3 py-2">
            {yAxisLabels.map(label => (
              <span key={label}>{label}%</span>
            ))}
          </div>
          
          {/* Chart area */}
          <div className="flex-1 relative">
            <svg width="100%" height="100%" className="overflow-visible">
              {/* Grid lines */}
              {yAxisLabels.map((label, index) => (
                <line
                  key={label}
                  x1="0"
                  y1={`${(index / (yAxisLabels.length - 1)) * 100}%`}
                  x2="100%"
                  y2={`${(index / (yAxisLabels.length - 1)) * 100}%`}
                  stroke="#f3f4f6"
                  strokeWidth="1"
                />
              ))}
              
              {/* Word line */}
              {data.filter(d => d.wordScore !== undefined).length > 1 && (
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  points={data
                    .map((d, i) => d.wordScore !== undefined ? `${(i / (data.length - 1)) * 100},${100 - (d.wordScore / maxScore) * 100}` : '')
                    .filter(Boolean)
                    .join(' ')}
                />
              )}
              
              {/* Phrase line */}
              {data.filter(d => d.phraseScore !== undefined).length > 1 && (
                <polyline
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  points={data
                    .map((d, i) => d.phraseScore !== undefined ? `${(i / (data.length - 1)) * 100},${100 - (d.phraseScore / maxScore) * 100}` : '')
                    .filter(Boolean)
                    .join(' ')}
                />
              )}
              
              {/* Reading line */}
              {data.filter(d => d.readingScore !== undefined).length > 1 && (
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  points={data
                    .map((d, i) => d.readingScore !== undefined ? `${(i / (data.length - 1)) * 100},${100 - (d.readingScore / maxScore) * 100}` : '')
                    .filter(Boolean)
                    .join(' ')}
                />
              )}
              
              {/* Data points */}
              {data.map((d, i) => (
                <g key={i}>
                  {d.wordScore !== undefined && (
                    <circle
                      cx={`${(i / (data.length - 1)) * 100}%`}
                      cy={`${100 - (d.wordScore / maxScore) * 100}%`}
                      r="4"
                      fill="#3b82f6"
                      className="hover:r-6 transition-all cursor-pointer"
                    >
                      <title>Words: {Math.round(d.wordScore)}%</title>
                    </circle>
                  )}
                  {d.phraseScore !== undefined && (
                    <circle
                      cx={`${(i / (data.length - 1)) * 100}%`}
                      cy={`${100 - (d.phraseScore / maxScore) * 100}%`}
                      r="4"
                      fill="#8b5cf6"
                      className="hover:r-6 transition-all cursor-pointer"
                    >
                      <title>Phrases: {Math.round(d.phraseScore)}%</title>
                    </circle>
                  )}
                  {d.readingScore !== undefined && (
                    <circle
                      cx={`${(i / (data.length - 1)) * 100}%`}
                      cy={`${100 - (d.readingScore / maxScore) * 100}%`}
                      r="4"
                      fill="#10b981"
                      className="hover:r-6 transition-all cursor-pointer"
                    >
                      <title>Reading: {Math.round(d.readingScore)}%</title>
                    </circle>
                  )}
                </g>
              ))}
            </svg>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Words</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span>Phrases</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Reading</span>
          </div>
        </div>
      </div>
    </div>
  );
}