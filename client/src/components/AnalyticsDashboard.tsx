import React, { useState, useEffect } from 'react';
import { User, Assignment } from '@shared/schema';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  Users, 
  Award,
  Calendar,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Star,
  Timer,
  BookOpen
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalPatients: number;
    activeAssignments: number;
    completionRate: number;
    avgSessionDuration: number;
  };
  patientProgress: {
    improving: number;
    stable: number;
    needsAttention: number;
  };
  weeklyStats: {
    day: string;
    completions: number;
    newAssignments: number;
    avgScore: number;
  }[];
  topPerformers: {
    id: string;
    name: string;
    email: string;
    progressScore: number;
    streak: number;
  }[];
  challengeAreas: {
    sound: string;
    difficulty: number;
    patientsAffected: number;
    avgScore: number;
  }[];
}

interface AnalyticsDashboardProps {
  clients: User[];
  assignments: Assignment[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  clients,
  assignments
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('week');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateAnalytics();
  }, [clients, assignments, selectedTimeframe]);

  const generateAnalytics = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockData: AnalyticsData = {
      overview: {
        totalPatients: clients.length,
        activeAssignments: assignments.filter(a => !a.isCompleted).length,
        completionRate: calculateCompletionRate(),
        avgSessionDuration: 18.5
      },
      patientProgress: {
        improving: Math.floor(clients.length * 0.6),
        stable: Math.floor(clients.length * 0.3),
        needsAttention: Math.floor(clients.length * 0.1)
      },
      weeklyStats: generateWeeklyStats(),
      topPerformers: generateTopPerformers(),
      challengeAreas: generateChallengeAreas()
    };

    setAnalyticsData(mockData);
    setIsLoading(false);
  };

  const calculateCompletionRate = (): number => {
    if (assignments.length === 0) return 0;
    const completed = assignments.filter(a => a.isCompleted).length;
    return Math.round((completed / assignments.length) * 100);
  };

  const generateWeeklyStats = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      completions: Math.floor(Math.random() * 20) + 5,
      newAssignments: Math.floor(Math.random() * 10) + 2,
      avgScore: Math.floor(Math.random() * 30) + 70
    }));
  };

  const generateTopPerformers = () => {
    return clients.slice(0, 5).map((client, index) => ({
      id: client.id,
      name: client.firstName && client.lastName 
        ? `${client.firstName} ${client.lastName}`
        : client.username || 'Unknown',
      email: client.email || '',
      progressScore: Math.floor(Math.random() * 30) + 70,
      streak: Math.floor(Math.random() * 14) + 1
    }));
  };

  const generateChallengeAreas = () => {
    const sounds = ['R-sounds', 'TH-sounds', 'L-sounds', 'CH-sounds', 'S-sounds'];
    return sounds.map(sound => ({
      sound,
      difficulty: Math.floor(Math.random() * 5) + 1,
      patientsAffected: Math.floor(Math.random() * clients.length) + 1,
      avgScore: Math.floor(Math.random() * 40) + 40
    }));
  };

  const getProgressColor = (type: 'improving' | 'stable' | 'needsAttention') => {
    switch (type) {
      case 'improving': return 'from-green-500 to-emerald-600';
      case 'stable': return 'from-blue-500 to-blue-600';
      case 'needsAttention': return 'from-orange-500 to-red-600';
    }
  };

  const getProgressIcon = (type: 'improving' | 'stable' | 'needsAttention') => {
    switch (type) {
      case 'improving': return <TrendingUp className="h-5 w-5" />;
      case 'stable': return <Activity className="h-5 w-5" />;
      case 'needsAttention': return <AlertTriangle className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="enhanced-card">
        <div className="enhanced-card-content flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Generating analytics insights...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="enhanced-card">
        <div className="enhanced-card-content text-center py-12">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="enhanced-card">
        <div className="enhanced-card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Real-Time Analytics Dashboard</h3>
                <p className="text-sm text-gray-600">
                  Comprehensive insights into patient progress and engagement
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {(['week', 'month', 'quarter'] as const).map((period) => (
                <button
                  key={period}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    selectedTimeframe === period
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setSelectedTimeframe(period)}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stats-card">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5" />
            <span className="text-xs opacity-80">Total</span>
          </div>
          <div className="stats-number">{analyticsData.overview.totalPatients}</div>
          <div className="stats-label">Active Patients</div>
        </div>

        <div className="stats-card" style={{background: 'linear-gradient(135deg, var(--apple-orange) 0%, var(--apple-yellow) 100%)'}}>
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs opacity-80">Active</span>
          </div>
          <div className="stats-number">{analyticsData.overview.activeAssignments}</div>
          <div className="stats-label">Assignments</div>
        </div>

        <div className="stats-card" style={{background: 'linear-gradient(135deg, var(--apple-green) 0%, #28CD41 100%)'}}>
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs opacity-80">Rate</span>
          </div>
          <div className="stats-number">{analyticsData.overview.completionRate}%</div>
          <div className="stats-label">Completion Rate</div>
        </div>

        <div className="stats-card" style={{background: 'linear-gradient(135deg, var(--apple-purple) 0%, var(--apple-pink) 100%)'}}>
          <div className="flex items-center justify-between mb-2">
            <Timer className="h-5 w-5" />
            <span className="text-xs opacity-80">Avg</span>
          </div>
          <div className="stats-number">{analyticsData.overview.avgSessionDuration}m</div>
          <div className="stats-label">Session Duration</div>
        </div>
      </div>

      {/* Patient Progress Overview */}
      <div className="enhanced-card">
        <div className="enhanced-card-header">
          <h3 className="font-semibold">Patient Progress Overview</h3>
        </div>
        <div className="enhanced-card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['improving', 'stable', 'needsAttention'] as const).map((type) => (
              <div
                key={type}
                className={`analytics-card bg-gradient-to-br ${getProgressColor(type)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  {getProgressIcon(type)}
                  <span className="text-xs opacity-80 uppercase">
                    {type === 'needsAttention' ? 'Needs Attention' : type}
                  </span>
                </div>
                <div className="analytics-value">{analyticsData.patientProgress[type]}</div>
                <div className="analytics-label">
                  {type === 'improving' ? 'Improving Patients' : 
                   type === 'stable' ? 'Stable Progress' : 'Need Support'}
                </div>
                <div className="analytics-trend">
                  <TrendingUp className="h-4 w-4" />
                  {type === 'improving' ? '+12%' : type === 'stable' ? '0%' : '-5%'} this week
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="enhanced-card">
        <div className="enhanced-card-header">
          <h3 className="font-semibold">Weekly Activity</h3>
        </div>
        <div className="enhanced-card-content">
          <div className="space-y-4">
            {analyticsData.weeklyStats.map((stat, index) => (
              <div key={stat.day} className="flex items-center gap-4">
                <div className="w-12 text-sm font-medium text-gray-600">{stat.day}</div>
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">{stat.completions} completions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">{stat.newAssignments} new</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">{stat.avgScore}% avg score</span>
                  </div>
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(stat.completions / 25) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="enhanced-card">
          <div className="enhanced-card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Top Performers
            </h3>
          </div>
          <div className="enhanced-card-content">
            <div className="space-y-3">
              {analyticsData.topPerformers.map((performer, index) => (
                <div key={performer.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="patient-avatar">
                    {performer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{performer.name}</div>
                    <div className="text-sm text-gray-600">{performer.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">{performer.progressScore}%</div>
                    <div className="text-xs text-gray-500">{performer.streak} day streak</div>
                  </div>
                  <div className="text-2xl">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Challenge Areas */}
        <div className="enhanced-card">
          <div className="enhanced-card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-red-500" />
              Challenge Areas
            </h3>
          </div>
          <div className="enhanced-card-content">
            <div className="space-y-3">
              {analyticsData.challengeAreas.map((area, index) => (
                <div key={area.sound} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{area.sound}</div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      area.avgScore < 60 
                        ? 'bg-red-100 text-red-800' 
                        : area.avgScore < 75 
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {area.avgScore}% avg
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{area.patientsAffected} patients affected</span>
                    <span>Difficulty: {area.difficulty}/5</span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        area.avgScore < 60 ? 'bg-red-500' : 
                        area.avgScore < 75 ? 'bg-orange-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${area.avgScore}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="enhanced-card">
        <div className="enhanced-card-header">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold">AI-Generated Insights</h3>
          </div>
        </div>
        <div className="enhanced-card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">Key Opportunity</span>
              </div>
              <p className="text-sm text-blue-700">
                Patients practicing in the morning show 23% better retention. 
                Consider recommending morning sessions for struggling patients.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Success Pattern</span>
              </div>
              <p className="text-sm text-green-700">
                Short, frequent sessions (15 min daily) are showing 35% higher 
                completion rates than longer weekly sessions.
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-800">Attention Needed</span>
              </div>
              <p className="text-sm text-orange-700">
                3 patients haven't completed assignments in 5 days. 
                Consider sending motivational check-ins.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-800">Recommendation</span>
              </div>
              <p className="text-sm text-purple-700">
                R-sound difficulties are trending up. Consider creating a 
                specialized R-sound workshop for affected patients.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;