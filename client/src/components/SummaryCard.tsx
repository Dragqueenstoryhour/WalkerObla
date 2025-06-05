import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SaveWordButton } from "@/components/SaveWordButton";
import {
  Trophy,
  Star,
  Target,
  TrendingUp,
  Award,
  Lightbulb,
  BookOpen,
  CheckCircle,
} from "lucide-react";

interface WordResult {
  word: string;
  score: number;
}

interface SummaryCardProps {
  assessmentResults: any[];
  type: "words" | "phrases";
  onRestart?: () => void;
}

export function SummaryCard({ assessmentResults, type, onRestart }: SummaryCardProps) {
  const { toast } = useToast();
  const [tips, setTips] = useState<string>("");
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);
  const [troubleWords, setTroubleWords] = useState<WordResult[]>([]);

  // Calculate overall score
  const overallScore = assessmentResults.length > 0 
    ? Math.round(assessmentResults.reduce((sum, result) => sum + (result?.pronunciationScore || 0), 0) / assessmentResults.length)
    : 0;

  // Extract trouble words
  useEffect(() => {
    const extractTroubleWords = () => {
      const wordScores: WordResult[] = [];

      assessmentResults.forEach((result) => {
        if (result?.wordLevelResults) {
          result.wordLevelResults.forEach((wordResult: any) => {
            if (wordResult.accuracyScore < 75) {
              wordScores.push({
                word: wordResult.word,
                score: wordResult.accuracyScore,
              });
            }
          });
        }
      });

      // Sort by score and take worst 6
      const sortedWords = wordScores.sort((a, b) => a.score - b.score).slice(0, 6);
      setTroubleWords(sortedWords);
    };

    if (assessmentResults.length > 0) {
      extractTroubleWords();
    }
  }, [assessmentResults]);

  // Generate AI tips
  useEffect(() => {
    const generateTips = async () => {
      if (assessmentResults.length === 0) return;

      setIsGeneratingTips(true);
      try {
        const response = await fetch("/api/content/generate-tips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentResults,
            troubleWords: troubleWords.map(w => w.word),
            type,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate tips");
        }

        const data = await response.json();
        setTips(data.tips);
      } catch (error) {
        console.error("Error generating tips:", error);
        setTips("Great work on your practice session! Keep practicing regularly to improve your pronunciation skills.");
      } finally {
        setIsGeneratingTips(false);
      }
    };

    if (troubleWords.length >= 0) {
      generateTips();
    }
  }, [troubleWords, assessmentResults, type]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Needs Practice";
    return "Keep Trying";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 85) return "default";
    if (score >= 70) return "secondary";
    return "destructive";
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-2 border-purple-200 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Trophy className="h-16 w-16 text-yellow-500" />
            <Award className="h-8 w-8 text-purple-600 absolute -top-2 -right-2" />
          </div>
        </div>
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Practice Complete!
        </CardTitle>
        <div className={`text-6xl font-bold my-4 ${getScoreColor(overallScore)}`}>
          {overallScore}%
        </div>
        <Badge variant={getScoreBadgeVariant(overallScore)} className="text-lg px-4 py-2">
          {getScoreBadge(overallScore)}
        </Badge>
        <div className="flex justify-center mt-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-6 w-6 ${
                star <= Math.round(overallScore / 20)
                  ? "text-yellow-500 fill-current"
                  : "text-gray-300"
              }`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Tips Section */}
        <div className="bg-white rounded-lg p-4 border border-purple-100">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-800">Tips for Improvement</h3>
          </div>
          {isGeneratingTips ? (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              <span>Generating personalized tips...</span>
            </div>
          ) : (
            <p className="text-gray-700 leading-relaxed">{tips}</p>
          )}
        </div>

        {/* Trouble Words Section */}
        {troubleWords.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-800">Words to Practice</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {troubleWords.map((wordResult, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span 
                      className={`font-semibold ${
                        wordResult.score < 50 ? "text-red-600" : "text-orange-600"
                      }`}
                    >
                      {wordResult.word}
                    </span>
                    <Badge 
                      variant={wordResult.score < 50 ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {Math.round(wordResult.score)}%
                    </Badge>
                  </div>
                  <SaveWordButton 
                    word={wordResult.word}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          {onRestart && (
            <Button
              onClick={onRestart}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Practice Again
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50 font-semibold py-3"
            onClick={() => {
              window.location.href = "/my-words";
            }}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Review Saved Words
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}