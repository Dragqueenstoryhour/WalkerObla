import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';  
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Star, 
  TrendingUp, 
  Target, 
  Mic,
  MessageSquare,
  Award,
  CheckCircle2,
  Sparkles,
  ThumbsUp,
  BarChart3,
  ArrowRight,
  Calendar,
  Clock
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

interface UserCompletionReportProps {
  assignmentId: number;
  assignmentTitle: string;
  onContinue?: () => void;
}

export function UserCompletionReport({ 
  assignmentId, 
  assignmentTitle,
  onContinue 
}: UserCompletionReportProps) {
  const [scorecardData, setScorecardData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/assignments/${assignmentId}/comprehensive-results`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch assignment results');
        }
        
        const data = await response.json();
        setScorecardData(data.data || data);
      } catch (err) {
        console.error('Error fetching completion report:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [assignmentId]);

  // Calculate overall assignment statistics
  const getOverallStats = () => {
    if (!scorecardData?.results?.length) return null;

    let totalPronunciation = 0;
    let totalAccuracy = 0;
    let totalFluency = 0;
    let totalCompleteness = 0;
    let totalAttempts = 0;
    let perfectWords = 0;
    let strongWords = 0;

    scorecardData.results.forEach(result => {
      totalPronunciation += result.overallScores.pronunciation;
      totalAccuracy += result.overallScores.accuracy;
      totalFluency += result.overallScores.fluency;
      totalCompleteness += result.overallScores.completeness;
      totalAttempts += result.overallScores.attemptCount;

      // Count perfect (>=95%) and strong (>=80%) performance
      if (result.overallScores.pronunciation >= 95) perfectWords++;
      else if (result.overallScores.pronunciation >= 80) strongWords++;
    });

    const wordCount = scorecardData.results.length;
    const improvementWords = scorecardData.results.filter(result => result.overallScores.pronunciation < 80).length;
    
    return {
      overallPronunciation: Math.round(totalPronunciation / wordCount),
      overallAccuracy: Math.round(totalAccuracy / wordCount),
      overallFluency: Math.round(totalFluency / wordCount),
      overallCompleteness: Math.round(totalCompleteness / wordCount),
      totalAttempts,
      perfectWords,
      strongWords,
      wordCount,
      averageAttempts: Math.round(totalAttempts / wordCount),
      improvementWords
    };
  };

  // Get encouraging message based on performance
  const getEncouragementMessage = (overallScore: number) => {
    if (overallScore >= 95) return {
      message: "Outstanding work! Your pronunciation is excellent!",
      icon: <Trophy className="h-5 w-5 text-yellow-500" />,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 border-yellow-200"
    };
    if (overallScore >= 85) return {
      message: "Great job! You're making excellent progress!",
      icon: <Star className="h-5 w-5 text-blue-500" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50 border-blue-200"
    };
    if (overallScore >= 75) return {
      message: "Nice work! Keep practicing to improve even more!",
      icon: <ThumbsUp className="h-5 w-5 text-green-500" />,
      color: "text-green-600",
      bgColor: "bg-green-50 border-green-200"
    };
    return {
      message: "Good effort! Every practice session helps you improve!",
      icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50 border-purple-200"
    };
  };

  // Get achievement badges
  const getAchievements = (stats: any) => {
    const achievements = [];

    if (stats.perfectWords > 0) {
      achievements.push({
        title: "Perfect Pronunciation",
        description: `${stats.perfectWords} word${stats.perfectWords > 1 ? 's' : ''} scored 95%+`,
        icon: <Trophy className="h-4 w-4" />,
        color: "bg-yellow-50 text-yellow-700 border-yellow-200"
      });
    }

    if (stats.strongWords >= stats.wordCount * 0.7) {
      achievements.push({
        title: "Consistent Excellence",
        description: `Strong performance across most words`,
        icon: <Target className="h-4 w-4" />,
        color: "bg-blue-50 text-blue-700 border-blue-200"
      });
    }

    if (stats.averageAttempts >= 3) {
      achievements.push({
        title: "Persistent Learner",
        description: `${stats.averageAttempts} attempts per word shows dedication`,
        icon: <Sparkles className="h-4 w-4" />,
        color: "bg-purple-50 text-purple-700 border-purple-200"
      });
    }

    if (stats.overallFluency >= 85) {
      achievements.push({
        title: "Fluency Master",
        description: `Excellent speaking fluency`,
        icon: <MessageSquare className="h-4 w-4" />,
        color: "bg-green-50 text-green-700 border-green-200"
      });
    }

    return achievements;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
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
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              <CheckCircle2 className="mx-auto h-16 w-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Assignment Completed!</h3>
            <p className="text-gray-600 mb-6">
              Your results are being processed. Check back in a moment or contact your therapist if you need help.
            </p>
            {onContinue && (
              <Button onClick={onContinue} className="flex items-center gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = getOverallStats();
  if (!stats) return null;

  const encouragement = getEncouragementMessage(stats.overallPronunciation);
  const achievements = getAchievements(stats);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header with celebration */}
      <div className="text-center">
        <div className="mb-4">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Assignment Complete!</h1>
        <h2 className="text-xl text-gray-700 mb-4">{assignmentTitle}</h2>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${encouragement.bgColor} ${encouragement.color}`}>
          {encouragement.icon}
          <span className="font-medium">{encouragement.message}</span>
        </div>
      </div>

      {/* Overall Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6 text-center">
            <Award className="mx-auto h-8 w-8 text-blue-600 mb-3" />
            <div className="text-3xl font-bold text-blue-900 mb-1">
              {stats.overallPronunciation}%
            </div>
            <p className="text-blue-700 font-medium">Overall Score</p>
            <Progress value={stats.overallPronunciation} className="mt-3 h-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Target className="mx-auto h-8 w-8 text-green-600 mb-3" />
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stats.wordCount}
            </div>
            <p className="text-gray-600 font-medium">Words Practiced</p>
            <p className="text-sm text-gray-500 mt-1">{stats.totalAttempts} total attempts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-purple-600 mb-3" />
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stats.perfectWords + stats.strongWords}
            </div>
            <p className="text-gray-600 font-medium">Strong Performance</p>
            <p className="text-sm text-gray-500 mt-1">Words scored 80%+</p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Your Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border ${achievement.color}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded">
                      {achievement.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold">{achievement.title}</h4>
                      <p className="text-sm opacity-80">{achievement.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Progress Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Your Progress Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Skill Breakdown</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Pronunciation</span>
                    <span className="text-sm text-gray-600">{stats.overallPronunciation}%</span>
                  </div>
                  <Progress value={stats.overallPronunciation} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Accuracy</span>
                    <span className="text-sm text-gray-600">{stats.overallAccuracy}%</span>
                  </div>
                  <Progress value={stats.overallAccuracy} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Fluency</span>
                    <span className="text-sm text-gray-600">{stats.overallFluency}%</span>
                  </div>
                  <Progress value={stats.overallFluency} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Completeness</span>
                    <span className="text-sm text-gray-600">{stats.overallCompleteness}%</span>
                  </div>
                  <Progress value={stats.overallCompleteness} className="h-2" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Practice Summary</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Perfect Words (95%+)</span>
                  </div>
                  <Badge variant="secondary">{stats.perfectWords}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Strong Words (80%+)</span>
                  </div>
                  <Badge variant="secondary">{stats.strongWords}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Average Attempts</span>
                  </div>
                  <Badge variant="secondary">{stats.averageAttempts}</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Word Performance Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Word Practice Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scorecardData.results.map((result) => (
              <div key={result.itemId} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">"{result.word}"</h4>
                  <Badge 
                    variant={result.overallScores.pronunciation >= 80 ? "default" : "secondary"}
                    className={
                      result.overallScores.pronunciation >= 95 ? "bg-yellow-100 text-yellow-800" :
                      result.overallScores.pronunciation >= 80 ? "bg-green-100 text-green-800" :
                      "bg-gray-100 text-gray-800"
                    }
                  >
                    {result.overallScores.pronunciation}%
                  </Badge>
                </div>
                {result.syllabication && (
                  <p className="text-sm text-gray-600 mb-2">/{result.syllabication}/</p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{result.overallScores.attemptCount} attempts</span>
                  {result.phrasePractice.length > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {result.phrasePractice.length} phrases
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Improvement Tips */}
      {stats.improvementWords > 0 && (
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-orange-900 mb-3 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Areas for Growth
            </h3>
            <p className="text-orange-700 mb-4">
              {stats.improvementWords} word{stats.improvementWords > 1 ? 's' : ''} could benefit from additional practice. 
              Focus on these during your next session for even better results!
            </p>
            <div className="flex flex-wrap gap-2">
              {scorecardData.results
                .filter(result => result.overallScores.pronunciation < 80)
                .slice(0, 5)
                .map((result) => (
                  <Badge key={result.itemId} variant="outline" className="text-orange-700 border-orange-300">
                    "{result.word}" ({result.overallScores.pronunciation}%)
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold text-green-900 mb-3">What's Next?</h3>
          <p className="text-green-700 mb-4">
            Great progress! Your therapist will review your results and may provide additional feedback or assign new practice exercises.
          </p>
          {onContinue && (
            <Button onClick={onContinue} className="bg-green-600 hover:bg-green-700 text-white">
              Continue Learning <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
