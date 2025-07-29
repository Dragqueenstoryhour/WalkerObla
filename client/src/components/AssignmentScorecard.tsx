import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiUrl } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  Award, 
  BarChart3,
  PieChart,
  Activity,
  CheckCircle,
  AlertCircle,
  Star,
  Mic,
  MessageSquare
} from 'lucide-react';

interface AssignmentResult {
  itemId: number;
  word: string;
  syllabication?: string;
  wordPractice: PracticeAttempt[];
  phrasePractice: PracticeAttempt[];
  overallScores: {
    pronunciation: number;
    accuracy: number;
    fluency: number;
    completeness: number;
    attemptCount: number;
  };
}

interface PracticeAttempt {
  id: number;
  attemptNumber: number;
  pronunciationScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  practiceDate: string;
  phrase?: string;
  phraseIndex?: number;
}

interface ScorecardData {
  assignmentId: number;
  totalResults: number;
  itemCount: number;
  results: AssignmentResult[];
}

interface AssignmentScorecardProps {
  assignmentId: number;
  assignmentTitle: string;
  isTherapistView?: boolean;
}

export function AssignmentScorecard({ 
  assignmentId, 
  assignmentTitle, 
  isTherapistView = false 
}: AssignmentScorecardProps) {
  const [scorecardData, setScorecardData] = useState<ScorecardData | null>(null);
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await fetch(getApiUrl(`/api/assignments/${assignmentId}/comprehensive-results`));
        
        if (!response.ok) {
          throw new Error('Failed to fetch assignment results');
        }
        
        const data = await response.json();
        setScorecardData(data.data || data);
      } catch (err) {
        console.error('Error fetching scorecard data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [assignmentId]);

  useEffect(() => {
    const fetchInsights = async () => {
      if (!isTherapistView) return;
      try {
        const response = await fetch(getApiUrl(`/api/assignments/${assignmentId}/insights`));
        if (!response.ok) {
          throw new Error('Failed to fetch insights');
        }
        const data = await response.json();
        setInsights(data.data?.insights || data.insights);
      } catch (err) {
        console.error('Error fetching insights:', err);
      }
    };

    fetchInsights();
  }, [assignmentId, isTherapistView]);

  // Calculate overall assignment statistics
  const getOverallStats = () => {
    if (!scorecardData?.results?.length) return null;

    let totalPronunciation = 0;
    let totalAccuracy = 0;
    let totalFluency = 0;
    let totalCompleteness = 0;
    let totalAttempts = 0;
    let strongWords = 0;
    let improvementWords = 0;

    scorecardData.results.forEach(result => {
      totalPronunciation += result.overallScores.pronunciation;
      totalAccuracy += result.overallScores.accuracy;
      totalFluency += result.overallScores.fluency;
      totalCompleteness += result.overallScores.completeness;
      totalAttempts += result.overallScores.attemptCount;

      // Count strong performance (>=80%) vs needs improvement (<70%)
      if (result.overallScores.pronunciation >= 80) strongWords++;
      else if (result.overallScores.pronunciation < 70) improvementWords++;
    });

    const wordCount = scorecardData.results.length;
    return {
      overallPronunciation: Math.round(totalPronunciation / wordCount),
      overallAccuracy: Math.round(totalAccuracy / wordCount),
      overallFluency: Math.round(totalFluency / wordCount),
      overallCompleteness: Math.round(totalCompleteness / wordCount),
      totalAttempts,
      strongWords,
      improvementWords,
      wordCount
    };
  };

  // Get score color and level
  const getScoreLevel = (score: number) => {
    if (score >= 90) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (score >= 80) return { level: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    if (score >= 70) return { level: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { level: 'Needs Practice', color: 'text-red-600', bgColor: 'bg-red-50' };
  };

  // Identify key themes and patterns
  const getKeyInsights = () => {
    if (!scorecardData?.results?.length) return [];

    const insights = [];
    const stats = getOverallStats();
    if (!stats) return [];

    // Performance insights
    if (stats.overallPronunciation >= 85) {
      insights.push({
        type: 'success',
        icon: <Award className="h-4 w-4" />,
        title: 'Strong Overall Performance',
        description: `Excellent pronunciation across ${stats.wordCount} practice words`
      });
    }

    if (stats.strongWords >= stats.wordCount * 0.7) {
      insights.push({
        type: 'success',
        icon: <Target className="h-4 w-4" />,
        title: 'Consistent Excellence',
        description: `${stats.strongWords} out of ${stats.wordCount} words scored 80% or higher`
      });
    }

    if (stats.improvementWords > 0) {
      insights.push({
        type: 'attention',
        icon: <TrendingUp className="h-4 w-4" />,
        title: 'Growth Opportunities',
        description: `${stats.improvementWords} words could benefit from additional practice`
      });
    }

    // Practice pattern insights
    const avgAttemptsPerWord = stats.totalAttempts / stats.wordCount;
    if (avgAttemptsPerWord > 4) {
      insights.push({
        type: 'info',
        icon: <Activity className="h-4 w-4" />,
        title: 'Thorough Practice',
        description: `High engagement with ${Math.round(avgAttemptsPerWord)} attempts per word on average`
      });
    }

    return insights;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !scorecardData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Available</h3>
          <p className="text-gray-600">
            {error || "This assignment hasn't been completed yet or results are not available."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = getOverallStats();
  const calculatedInsights = getKeyInsights();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{assignmentTitle}</h2>
          <p className="text-gray-600">
            {isTherapistView ? 'Detailed Performance Report' : 'Your Assignment Results'}
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <CheckCircle className="h-4 w-4" />
          Completed
        </Badge>
      </div>

      {/* Overall Performance Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overall Score</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {stats.overallPronunciation}%
                    </span>
                    <Badge 
                      variant="secondary" 
                      className={`${getScoreLevel(stats.overallPronunciation).color} ${getScoreLevel(stats.overallPronunciation).bgColor}`}
                    >
                      {getScoreLevel(stats.overallPronunciation).level}
                    </Badge>
                  </div>
                </div>
                <Award className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Words Practiced</p>
                  <span className="text-2xl font-bold text-gray-900">{stats.wordCount}</span>
                  <p className="text-xs text-gray-500">{stats.totalAttempts} total attempts</p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Strong Performance</p>
                  <span className="text-2xl font-bold text-gray-900">{stats.strongWords}</span>
                  <p className="text-xs text-gray-500">words ≥80% score</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Accuracy</p>
                  <span className="text-2xl font-bold text-gray-900">{stats.overallAccuracy}%</span>
                  <Progress value={stats.overallAccuracy} className="w-16 h-2 mt-1" />
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Key Insights */}
      {calculatedInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calculatedInsights.map((insight, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border ${
                    insight.type === 'success' ? 'bg-green-50 border-green-200' :
                    insight.type === 'attention' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded ${
                      insight.type === 'success' ? 'text-green-600' :
                      insight.type === 'attention' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {insight.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{insight.title}</h4>
                      <p className="text-sm text-gray-600">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Results */}
      <Tabs defaultValue="words" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="words" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Word Practice
          </TabsTrigger>
          <TabsTrigger value="phrases" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Phrase Practice
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Analysis &amp; Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="words" className="space-y-4">
          {scorecardData.results.map((result) => (
            <Card key={result.itemId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">"{result.word}"</CardTitle>
                    {result.syllabication && (
                      <p className="text-sm text-gray-600">/{result.syllabication}/</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {result.overallScores.pronunciation}%
                    </div>
                    <Badge 
                      variant="secondary"
                      className={`${getScoreLevel(result.overallScores.pronunciation).color} ${getScoreLevel(result.overallScores.pronunciation).bgColor}`}
                    >
                      {getScoreLevel(result.overallScores.pronunciation).level}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Score Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Pronunciation</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{result.overallScores.pronunciation}%</span>
                        <Progress value={result.overallScores.pronunciation} className="flex-1 h-2" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Accuracy</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{result.overallScores.accuracy}%</span>
                        <Progress value={result.overallScores.accuracy} className="flex-1 h-2" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Fluency</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{result.overallScores.fluency}%</span>
                        <Progress value={result.overallScores.fluency} className="flex-1 h-2" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Completeness</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{result.overallScores.completeness}%</span>
                        <Progress value={result.overallScores.completeness} className="flex-1 h-2" />
                      </div>
                    </div>
                  </div>

                  {/* Individual Attempts */}
                  {isTherapistView && result.wordPractice.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Individual Attempts</h5>
                      <div className="space-y-2">
                        {result.wordPractice.map((attempt, index) => (
                          <div key={attempt.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-600">
                              Attempt {attempt.attemptNumber}
                            </span>
                            <div className="flex items-center gap-4 text-xs">
                              <span>P: {attempt.pronunciationScore}%</span>
                              <span>A: {attempt.accuracyScore}%</span>
                              <span>F: {attempt.fluencyScore}%</span>
                              <span>C: {attempt.completenessScore}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="phrases" className="space-y-4">
          {scorecardData.results.map((result) => (
            result.phrasePractice.length > 0 && (
              <Card key={`phrases-${result.itemId}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Phrases with "{result.word}"</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.phrasePractice.map((attempt) => (
                      <div key={attempt.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">"{attempt.phrase}"</p>
                          <Badge variant="outline">{attempt.pronunciationScore}%</Badge>
                        </div>
                        {isTherapistView && (
                          <div className="grid grid-cols-4 gap-2 text-xs text-gray-600">
                            <span>Pronunciation: {attempt.pronunciationScore}%</span>
                            <span>Accuracy: {attempt.accuracyScore}%</span>
                            <span>Fluency: {attempt.fluencyScore}%</span>
                            <span>Completeness: {attempt.completenessScore}%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          ))}
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Pronunciation Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {insights ? (
                <div className="prose max-w-none">{insights}</div>
              ) : (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-gray-600">Generating insights...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
