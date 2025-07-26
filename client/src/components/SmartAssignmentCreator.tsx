import React, { useState, useEffect } from 'react';
import { User, Assignment } from '@shared/schema';
import { 
  Sparkles, 
  Brain, 
  TrendingUp, 
  Target, 
  Clock, 
  Users, 
  Award,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  BarChart3
} from 'lucide-react';

interface SmartSuggestion {
  id: string;
  type: 'difficulty' | 'content' | 'frequency' | 'focus_area';
  title: string;
  description: string;
  reasoning: string;
  confidence: number; // 0-100
  impact: 'high' | 'medium' | 'low';
  data?: any;
}

interface PatientInsights {
  strengths: string[];
  challenges: string[];
  improvementAreas: string[];
  recommendedSounds: string[];
  optimalDifficulty: number;
  sessionFrequency: string;
  engagementPattern: string;
  progressTrend: 'improving' | 'stable' | 'declining';
}

interface SmartAssignmentCreatorProps {
  selectedClient: User | null;
  clientAssignments: Assignment[];
  onCreateAssignment: (data: any) => void;
  isLoading?: boolean;
}

const SmartAssignmentCreator: React.FC<SmartAssignmentCreatorProps> = ({
  selectedClient,
  clientAssignments,
  onCreateAssignment,
  isLoading = false
}) => {
  const [insights, setInsights] = useState<PatientInsights | null>(null);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assignmentData, setAssignmentData] = useState({
    title: '',
    description: '',
    difficulty: 3,
    targetSounds: [] as string[],
    contentType: 'words' as 'words' | 'phrases',
    estimatedDuration: 15,
    frequency: 'daily' as 'daily' | 'weekly' | 'biweekly'
  });

  // Analyze patient data and generate insights
  useEffect(() => {
    if (selectedClient && clientAssignments.length > 0) {
      analyzePatientData();
    }
  }, [selectedClient, clientAssignments]);

  const analyzePatientData = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis - in real implementation, this would call an AI service
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate mock insights based on assignment history
    const mockInsights: PatientInsights = {
      strengths: ['Clear /s/ sounds', 'Good rhythm', 'Consistent practice'],
      challenges: ['R-controlled vowels', 'Multi-syllable words', 'Complex consonant clusters'],
      improvementAreas: ['/r/ sound production', 'Word endings', 'Speech clarity'],
      recommendedSounds: ['r', 'th', 'ch'],
      optimalDifficulty: calculateOptimalDifficulty(),
      sessionFrequency: 'daily',
      engagementPattern: 'morning_focused',
      progressTrend: 'improving'
    };
    
    setInsights(mockInsights);
    generateSmartSuggestions(mockInsights);
    setIsAnalyzing(false);
  };

  const calculateOptimalDifficulty = (): number => {
    if (clientAssignments.length === 0) return 3;
    
    // Calculate average performance from recent assignments
    const recentAssignments = clientAssignments.slice(-5);
    const avgCompletion = recentAssignments.reduce((sum, assignment) => 
      sum + (assignment.isCompleted ? 1 : 0), 0) / recentAssignments.length;
    
    if (avgCompletion > 0.8) return Math.min(5, 4); // Increase difficulty
    if (avgCompletion < 0.5) return Math.max(1, 2); // Decrease difficulty
    return 3; // Maintain current level
  };

  const generateSmartSuggestions = (patientInsights: PatientInsights) => {
    const suggestions: SmartSuggestion[] = [
      {
        id: 'difficulty',
        type: 'difficulty',
        title: `Recommended Difficulty: Level ${patientInsights.optimalDifficulty}`,
        description: `Based on recent performance, this difficulty level will provide optimal challenge`,
        reasoning: patientInsights.progressTrend === 'improving' 
          ? 'Patient is showing consistent improvement' 
          : 'Patient needs consolidation at current level',
        confidence: 85,
        impact: 'high',
        data: { difficulty: patientInsights.optimalDifficulty }
      },
      {
        id: 'focus_sounds',
        type: 'focus_area',
        title: 'Focus on R-controlled vowels',
        description: 'Patient shows difficulty with /r/ sounds - this is a key area for improvement',
        reasoning: 'Analysis shows 60% lower accuracy on R-controlled vowel words',
        confidence: 92,
        impact: 'high',
        data: { sounds: ['r', 'er', 'or', 'ar'] }
      },
      {
        id: 'session_timing',
        type: 'frequency',
        title: 'Daily 15-minute sessions',
        description: 'Short, frequent sessions work best for this patient\'s engagement pattern',
        reasoning: 'Patient shows 40% better retention with daily practice vs. longer weekly sessions',
        confidence: 78,
        impact: 'medium',
        data: { frequency: 'daily', duration: 15 }
      },
      {
        id: 'content_type',
        type: 'content',
        title: 'Multi-syllable word practice',
        description: 'Focus on 2-3 syllable words to build complexity gradually',
        reasoning: 'Patient has mastered single syllables and is ready for the next challenge',
        confidence: 81,
        impact: 'medium',
        data: { syllables: [2, 3], wordTypes: ['compound', 'multisyllabic'] }
      }
    ];

    setSuggestions(suggestions);
    
    // Auto-select high-confidence suggestions
    const autoSelected = suggestions
      .filter(s => s.confidence > 85)
      .map(s => s.id);
    setSelectedSuggestions(autoSelected);
  };

  const toggleSuggestion = (suggestionId: string) => {
    setSelectedSuggestions(prev => 
      prev.includes(suggestionId)
        ? prev.filter(id => id !== suggestionId)
        : [...prev, suggestionId]
    );
  };

  const applySuggestions = () => {
    const appliedSuggestions = suggestions.filter(s => 
      selectedSuggestions.includes(s.id)
    );

    let updatedData = { ...assignmentData };

    appliedSuggestions.forEach(suggestion => {
      switch (suggestion.type) {
        case 'difficulty':
          updatedData.difficulty = suggestion.data.difficulty;
          break;
        case 'frequency':
          updatedData.frequency = suggestion.data.frequency;
          updatedData.estimatedDuration = suggestion.data.duration;
          break;
        case 'focus_area':
          updatedData.targetSounds = suggestion.data.sounds;
          updatedData.title = `${suggestion.data.sounds[0].toUpperCase()}-Sound Practice`;
          updatedData.description = `Focused practice on ${suggestion.data.sounds.join(', ')} sounds`;
          break;
        case 'content':
          if (suggestion.data.syllables) {
            updatedData.description += ` Targeting ${suggestion.data.syllables.join('-')} syllable words.`;
          }
          break;
      }
    });

    setAssignmentData(updatedData);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 75) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-orange-600 bg-orange-50 border-orange-200';
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <Target className="h-4 w-4 text-red-500" />;
      case 'medium': return <TrendingUp className="h-4 w-4 text-orange-500" />;
      default: return <Lightbulb className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!selectedClient) {
    return (
      <div className="enhanced-card">
        <div className="enhanced-card-content text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Select a patient to create smart assignments</p>
          <p className="text-sm text-gray-500 mt-2">AI-powered suggestions require patient data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Analysis Header */}
      <div className="enhanced-card">
        <div className="enhanced-card-header">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">AI-Powered Assignment Creator</h3>
              <p className="text-sm text-gray-600">
                Intelligent suggestions based on {selectedClient.firstName}'s progress
              </p>
            </div>
            {isAnalyzing && (
              <div className="flex items-center gap-2 text-purple-600">
                <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                <span className="text-sm">Analyzing...</span>
              </div>
            )}
          </div>
        </div>

        {insights && (
          <div className="enhanced-card-content">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Progress Trend */}
              <div className="analytics-card" style={{background: 'linear-gradient(135deg, var(--apple-green) 0%, #28CD41 100%)'}}>
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-xs opacity-80">Trend</span>
                </div>
                <div className="analytics-value text-lg">{insights.progressTrend.charAt(0).toUpperCase() + insights.progressTrend.slice(1)}</div>
                <div className="analytics-label text-sm">Overall Progress</div>
              </div>

              {/* Optimal Difficulty */}
              <div className="analytics-card" style={{background: 'linear-gradient(135deg, var(--apple-blue) 0%, var(--apple-blue-light) 100%)'}}>
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-5 w-5" />
                  <span className="text-xs opacity-80">Level</span>
                </div>
                <div className="analytics-value text-lg">{insights.optimalDifficulty}/5</div>
                <div className="analytics-label text-sm">Recommended Difficulty</div>
              </div>

              {/* Session Frequency */}
              <div className="analytics-card" style={{background: 'linear-gradient(135deg, var(--apple-orange) 0%, var(--apple-yellow) 100%)'}}>
                <div className="flex items-center justify-between mb-2">
                  <Clock className="h-5 w-5" />
                  <span className="text-xs opacity-80">Schedule</span>
                </div>
                <div className="analytics-value text-lg capitalize">{insights.sessionFrequency}</div>
                <div className="analytics-label text-sm">Optimal Frequency</div>
              </div>
            </div>

            {/* Quick Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4 text-green-600" />
                  Strengths
                </h4>
                <div className="space-y-1">
                  {insights.strengths.map((strength, index) => (
                    <div key={index} className="text-sm bg-green-50 text-green-800 px-2 py-1 rounded">
                      {strength}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-orange-600" />
                  Focus Areas
                </h4>
                <div className="space-y-1">
                  {insights.improvementAreas.map((area, index) => (
                    <div key={index} className="text-sm bg-orange-50 text-orange-800 px-2 py-1 rounded">
                      {area}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="enhanced-card">
          <div className="enhanced-card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold">Smart Suggestions</h3>
              </div>
              <button
                className="btn-primary"
                onClick={applySuggestions}
                disabled={selectedSuggestions.length === 0}
              >
                Apply Selected ({selectedSuggestions.length})
              </button>
            </div>
          </div>

          <div className="enhanced-card-content">
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedSuggestions.includes(suggestion.id)
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleSuggestion(suggestion.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getImpactIcon(suggestion.impact)}
                      <div>
                        <h4 className="font-medium">{suggestion.title}</h4>
                        <p className="text-sm text-gray-600">{suggestion.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-1 rounded text-xs font-medium border ${getConfidenceColor(suggestion.confidence)}`}>
                        {suggestion.confidence}% confidence
                      </div>
                      {selectedSuggestions.includes(suggestion.id) ? (
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                      ) : (
                        <div className="h-5 w-5 border-2 border-gray-300 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 italic">
                    💡 {suggestion.reasoning}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assignment Preview */}
      <div className="enhanced-card">
        <div className="enhanced-card-header">
          <h3 className="font-semibold">Assignment Preview</h3>
        </div>
        <div className="enhanced-card-content">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                className="enhanced-search-input"
                value={assignmentData.title}
                onChange={(e) => setAssignmentData({...assignmentData, title: e.target.value})}
                placeholder="Assignment title..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                className="enhanced-search-input"
                value={assignmentData.description}
                onChange={(e) => setAssignmentData({...assignmentData, description: e.target.value})}
                placeholder="Assignment description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Difficulty</label>
                <select 
                  className="enhanced-search-input"
                  value={assignmentData.difficulty}
                  onChange={(e) => setAssignmentData({...assignmentData, difficulty: parseInt(e.target.value)})}
                >
                  {[1,2,3,4,5].map(level => (
                    <option key={level} value={level}>Level {level}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duration</label>
                <select 
                  className="enhanced-search-input"
                  value={assignmentData.estimatedDuration}
                  onChange={(e) => setAssignmentData({...assignmentData, estimatedDuration: parseInt(e.target.value)})}
                >
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Frequency</label>
                <select 
                  className="enhanced-search-input"
                  value={assignmentData.frequency}
                  onChange={(e) => setAssignmentData({...assignmentData, frequency: e.target.value as any})}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button className="btn-secondary">Cancel</button>
              <button 
                className="btn-primary"
                onClick={() => onCreateAssignment(assignmentData)}
                disabled={!assignmentData.title || isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Smart Assignment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartAssignmentCreator;