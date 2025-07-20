import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ActivityData {
  date: string;
  wordScore?: number;
  phraseScore?: number;
  readingScore?: number;
  x?: number; // Add x to ActivityData for timeRange === '10' or daily averages
}

interface CombinedLineChartProps {
  wordActivities: { score: number | null; createdAt: string }[];
  phraseActivities: { score: number | null; createdAt: string }[];
  readingActivities: { score: number | null; createdAt: string }[];
}

export function CombinedLineChart({ wordActivities, phraseActivities, readingActivities }: CombinedLineChartProps) {
  const [timeRange, setTimeRange] = useState<'10' | '30' | '90'>('10');

  const maxScore = 100; // Assuming scores are out of 100

  // Helper function to generate SVG path points for cubic bezier smoothing
  const generateSmoothPath = (items: ActivityData[], scoreKey: keyof ActivityData, maxXValue: number, maxScore: number) => {
    const validItems = items.filter(d => d[scoreKey] !== undefined && d[scoreKey] !== null);
    if (validItems.length < 1) return ''; // Need at least 1 point for a path (though line needs 2)

    // Clamp scores and calculate SVG coordinates
    const points = validItems.map(d => {
      const xValue = d.x || 1;
      // Distribute points evenly from 0% to 100%
      const xPercentage = maxXValue > 1 ? ((xValue - 1) / (maxXValue - 1)) * 100 : 50;

      // Clamp score between 0 and maxScore
      const score = Math.max(0, Math.min(maxScore, d[scoreKey] as number));
      const yPercentage = 100 - (score / maxScore) * 100; // Y-axis is inverted in SVG (0=top, 100=bottom)

      return { x: xPercentage, y: yPercentage };
    });

    if (points.length < 2) {
      if (points.length === 1) {
        // For a single point, render a small circle or a very short line
        return `M ${points[0].x},${points[0].y} L ${points[0].x + 0.01},${points[0].y}`; // Draw a tiny line for visibility
      }
      return '';
    }

    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      // Simple cubic bezier control points
      // Control point 1: closer to p1, horizontally centered with p1, vertically at p1's y
      const cp1x = p1.x + (p2.x - p1.x) / 2;
      const cp1y = p1.y;

      // Control point 2: closer to p2, horizontally centered with p2, vertically at p2's y
      const cp2x = p1.x + (p2.x - p1.x) / 2;
      const cp2y = p2.y;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return path;
  };


  // Process and combine data based on selected time range
  const processData = () => {
    const now = new Date();
    let startDate: Date;
    let data: ActivityData[] = [];
    let maxXValue: number;

    if (timeRange === '10') {
      // Get last 10 activities for each type, sorted by most recent
      // Assign an 'x' value from 1 to 10 for consistent spacing
      const recentWords = wordActivities
        .filter(a => a.score !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .reverse() // Reverse to put oldest first for proper x-axis mapping
        .map((a, i) => ({ score: a.score, createdAt: a.createdAt, x: i + 1 }));

      const recentPhrases = phraseActivities
        .filter(a => a.score !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .reverse()
        .map((a, i) => ({ score: a.score, createdAt: a.createdAt, x: i + 1 }));

      const recentReadings = readingActivities
        .filter(a => a.score !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .reverse()
        .map((a, i) => ({ score: a.score, createdAt: a.createdAt, x: i + 1 }));

      // Combine all recent activities by their x-index (time slot)
      // This creates 10 data points, even if some don't have all activity types
      for (let i = 0; i < 10; i++) {
        const word = recentWords[i];
        const phrase = recentPhrases[i];
        const reading = recentReadings[i];

        data.push({
          date: `Activity ${i + 1}`,
          wordScore: word?.score || undefined,
          phraseScore: phrase?.score || undefined,
          readingScore: reading?.score || undefined,
          x: i + 1, // Assign x from 1 to 10 for consistent spacing
        });
      }
      maxXValue = 10; // Max X value for '10' range is always 10
    } else { // '30' or '90' days
      if (timeRange === '30') {
        startDate = new Date(now.setDate(now.getDate() - 29)); // Last 30 days including today
      } else { // '90' days
        startDate = new Date(now.setDate(now.getDate() - 89)); // Last 90 days including today
      }

      const dailyDataMap = new Map<string, {
        date: string;
        wordScores: number[];
        phraseScores: number[];
        readingScores: number[];
      }>();

      // Aggregate data by day for words, phrases, and readings
      [wordActivities, phraseActivities, readingActivities].forEach((activities, index) => {
        activities.forEach(activity => {
          if (activity.score === null) return;

          const date = new Date(activity.createdAt);
          if (date < startDate) return; // Filter out activities older than the range

          const dateString = date.toISOString().split('T')[0]; //yyyy-MM-DD
          let entry = dailyDataMap.get(dateString);

          if (!entry) {
            entry = { 
              date: dateString,
              wordScores: [],
              phraseScores: [],
              readingScores: []
            };
            dailyDataMap.set(dateString, entry);
          }

          // Add score to appropriate array
          if (index === 0) entry.wordScores.push(activity.score);
          else if (index === 1) entry.phraseScores.push(activity.score);
          else if (index === 2) entry.readingScores.push(activity.score);
        });
      });

      // Convert to array and calculate averages
      data = Array.from(dailyDataMap.values()).map(entry => {
        const newEntry: ActivityData = { date: entry.date };
        if (entry.wordScores.length > 0) {
          newEntry.wordScore = entry.wordScores.reduce((sum, score) => sum + score, 0) / entry.wordScores.length;
        }
        if (entry.phraseScores.length > 0) {
          newEntry.phraseScore = entry.phraseScores.reduce((sum, score) => sum + score, 0) / entry.phraseScores.length;
        }
        if (entry.readingScores.length > 0) {
          newEntry.readingScore = entry.readingScores.reduce((sum, score) => sum + score, 0) / entry.readingScores.length;
        }
        return newEntry;
      });

      // Sort data by date and assign x values
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      data = data.map((d, i) => ({ ...d, x: i + 1 })); // Assign x from 1 to data.length for daily range
      maxXValue = data.length > 0 ? data.length : 1; // Max X for daily ranges is number of days with data
    }

    const wordLinePath = generateSmoothPath(data, 'wordScore', maxXValue, maxScore);
    const phraseLinePath = generateSmoothPath(data, 'phraseScore', maxXValue, maxScore);
    const readingLinePath = generateSmoothPath(data, 'readingScore', maxXValue, maxScore);

    return { data, wordLinePath, phraseLinePath, readingLinePath, maxXValue };
  };

  const { data, wordLinePath, phraseLinePath, readingLinePath, maxXValue } = processData();

  // Check if there's any data to display
  const hasData = wordActivities.some(a => a.score !== null) || 
                  phraseActivities.some(a => a.score !== null) || 
                  readingActivities.some(a => a.score !== null);


  // Determine the Y-axis label intervals
  const yAxisLabels = [100, 75, 50, 25, 0];

  const squareSide = 5; // Side length of the square data point

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Performance Over Time</h3>
        <Select value={timeRange} onValueChange={setTimeRange as (value: string) => void}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">Last 10 Activities</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!hasData ? (
        <div className="relative h-64 w-full flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-lg font-medium mb-2">No Performance Data Yet</div>
            <div className="text-sm">Complete practice sessions with pronunciation assessment to see your progress chart.</div>
            <div className="text-xs mt-2 text-gray-400">
              {wordActivities.length + phraseActivities.length + readingActivities.length === 0 
                ? "No practice activities found." 
                : "Practice activities found, but none with completed assessments."}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative h-64 w-full">
        {/* Y-axis labels */}
        <div className="absolute inset-y-0 left-0 flex flex-col justify-between py-2 pr-4 text-gray-500 text-sm">
          {yAxisLabels.map(label => (
            <div key={label} className="text-right">{label}%</div>
          ))}
        </div>
        {/* Main Chart Area */}
        <div className="absolute inset-0 pl-10 pt-2 pb-10"> {/* Increased pb to make space for X-axis labels */}
          <div className="relative w-full h-full">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-hidden">
              {/* Y-axis grid lines */}
              {yAxisLabels.slice(1, -1).map(label => ( // Exclude 100 and 0 for grid lines
                <line
                  key={`y-grid-${label}`}
                  x1="0"
                  y1={`${100 - (label / maxScore) * 100}`}
                  x2="100"
                  y2={`${100 - (label / maxScore) * 100}`}
                  stroke="#e0e0e0"
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {/* X-axis grid lines for '10 Activities' or daily average */}
              {timeRange === '10' && maxXValue > 1 && Array.from({ length: maxXValue }).map((_, i) => (
                <line
                  key={`x-grid-${i}`}
                  x1={`${(i / (maxXValue - 1)) * 100}`} // Aligned with the new point distribution
                  y1="0"
                  x2={`${(i / (maxXValue - 1)) * 100}`}
                  y2="100"
                  stroke="#e0e0e0"
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {/* For 30/90 days, consider showing fewer grid lines or adapting based on data density */}
              {timeRange !== '10' && data.length > 0 && Array.from({ length: data.length }).map((_, i) => {
                // Only show grid lines for significant intervals (e.g., every 5th or 10th day)
                if (data.length > 10 && i % (Math.ceil(data.length / 5)) !== 0) return null;
                const xPercentage = (i / (maxXValue - 1)) * 100;
                return (
                  <line
                    key={`x-grid-${i}`}
                    x1={`${xPercentage}`}
                    y1="0"
                    x2={`${xPercentage}`}
                    y2="100"
                    stroke="#e0e0e0"
                    strokeDasharray="2 2"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}


              {/* Explicit X-axis line (bottom border) */}
              <line x1="0" y1="100" x2="100" y2="100" stroke="#a0a0a0" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
              {/* Explicit Y-axis line (left border) */}
              <line x1="0" y1="0" x2="0" y2="100" stroke="#a0a0a0" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />

              {/* Path for Words (smoothed) */}
              {wordLinePath && (
                <path
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  d={wordLinePath}
                  strokeLinecap="round" // Add round caps for better aesthetics
                  strokeLinejoin="round" // Add round joins for better aesthetics
                />
              )}
              {/* Path for Phrases (smoothed) */}
              {phraseLinePath && (
                <path
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  d={phraseLinePath}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {/* Path for Reading (smoothed) */}
              {readingLinePath && (
                <path
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  d={readingLinePath}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points (squares) */}
              {data.map((d, i) => {
                const xValue = d.x || 1;
                const cxPercentage = maxXValue > 1 ? ((xValue - 1) / (maxXValue - 1)) * 100 : 50;

                return (
                  <g key={d.date || `item-${i}`}>
                    {d.wordScore !== undefined && d.wordScore !== null && (
                      <rect
                        x={`${cxPercentage - squareSide / 2}%`} // Center the square
                        y={`${100 - (Math.max(0, Math.min(maxScore, d.wordScore)) / maxScore) * 100 - squareSide / 2}%`} // Center the square
                        width={`${squareSide}%`} // Use percentage for width/height relative to viewBox
                        height={`${squareSide}%`}
                        fill="#3b82f6"
                        // Removed transform for square shape
                        className="hover:scale-150 transition-transform duration-150 cursor-pointer" // Use Tailwind scale for hover
                      >
                        <title>Words: {Math.round(d.wordScore)}%</title>
                      </rect>
                    )}
                    {d.phraseScore !== undefined && d.phraseScore !== null && (
                      <rect
                        x={`${cxPercentage - squareSide / 2}%`}
                        y={`${100 - (Math.max(0, Math.min(maxScore, d.phraseScore)) / maxScore) * 100 - squareSide / 2}%`}
                        width={`${squareSide}%`}
                        height={`${squareSide}%`}
                        fill="#8b5cf6"
                        // Removed transform for square shape
                        className="hover:scale-150 transition-transform duration-150 cursor-pointer"
                      >
                        <title>Phrases: {Math.round(d.phraseScore)}%</title>
                      </rect>
                    )}
                    {d.readingScore !== undefined && d.readingScore !== null && (
                      <rect
                        x={`${cxPercentage - squareSide / 2}%`}
                        y={`${100 - (Math.max(0, Math.min(maxScore, d.readingScore)) / maxScore) * 100 - squareSide / 2}%`}
                        width={`${squareSide}%`}
                        height={`${squareSide}%`}
                        fill="#10b981"
                        // Removed transform for square shape
                        className="hover:scale-150 transition-transform duration-150 cursor-pointer"
                      >
                        <title>Reading: {Math.round(d.readingScore)}%</title>
                      </rect>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* X-axis labels (Dates/Activities) - Completely hidden */}
        {/*
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-gray-500 text-xs pl-10 pr-0"
             style={{ height: timeRange !== '10' ? '60px' : 'auto', alignItems: 'flex-start', overflow: 'visible' }}>
          {data.map((d, i) => {
            const labelText = timeRange === '10' ? `Activity ${d.x}` : new Date(d.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
            // Calculate left position for each label to align with the data point's x-coordinate
            const xPosition = maxXValue > 1 ? ((d.x || 1) - 1) / (maxXValue - 1) * 100 : 50;

            return (
              <div
                key={`x-label-${d.date}-${i}`}
                className="absolute text-center"
                style={{
                  left: `${xPosition}%`,
                  transform: `translateX(-50%) ${timeRange !== '10' ? 'rotate(-45deg)' : 'none'}`,
                  transformOrigin: 'center top',
                  whiteSpace: 'nowrap',
                  minWidth: 'auto',
                  paddingTop: '5px',
                }}
              >
                {labelText}
              </div>
            );
          })}
        </div>
        */}

        </div>
      )}

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
  );
}