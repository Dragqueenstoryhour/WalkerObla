import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, X, Play, Pause, Star } from 'lucide-react';

interface PracticeCardProps {
  items: Array<{
    id: string;
    originalId: number;
    text: string;
    phonetic?: string;
    difficulty?: string;
    assessmentResult?: { pronunciationScore: number };
  }>;
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
  onDelete: (originalId: number) => void;
  onPlayAudio: (text: string) => void;
  isPlaying: boolean;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  emptyMessage: string;
}

function StarRating({ score }: { score: number }) {
  const stars = Math.round(score / 20); // Convert 0-100 to 0-5 stars
  
  return (
    <div className="flex justify-center items-center mb-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 ${
            star <= stars
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

export function PracticeCard({ 
  items, 
  currentIndex, 
  onNext, 
  onPrevious, 
  onShuffle, 
  onDelete, 
  onPlayAudio, 
  isPlaying, 
  title, 
  icon: Icon, 
  color, 
  emptyMessage 
}: PracticeCardProps) {
  if (items.length === 0) {
    return (
      <Card className="shadow-lg bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-8 text-center">
          <Icon className="h-16 w-16 mx-auto text-purple-300 mb-4" />
          <h3 className="text-xl font-semibold text-purple-800 mb-2">{emptyMessage}</h3>
          <p className="text-gray-600 mb-4">
            Start practicing to build your personal collection.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <Card className="shadow-lg bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader className={`${color} text-white rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">{title}</CardTitle>
              <CardDescription className="text-white/80">
                Practice with pronunciation feedback
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={onShuffle}
            variant="secondary"
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            Shuffle
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <h3 className="text-4xl font-bold text-purple-800 mb-2">
              {currentItem.text}
            </h3>
            {currentItem.phonetic && (
              <p className="text-lg text-gray-600 font-mono bg-white/70 px-4 py-2 rounded-lg">
                {currentItem.phonetic}
              </p>
            )}
            {currentItem.difficulty && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                {currentItem.difficulty}
              </Badge>
            )}
            
            {/* Assessment Score with Stars */}
            {currentItem.assessmentResult && (
              <div className="bg-white/70 px-4 py-3 rounded-lg">
                <StarRating score={currentItem.assessmentResult.pronunciationScore} />
                <p className="text-lg font-semibold text-purple-800">
                  Score: {Math.round(currentItem.assessmentResult.pronunciationScore)}%
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-3">
            <Button
              onClick={() => onPlayAudio(currentItem.text)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
              disabled={isPlaying}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isPlaying ? 'Playing...' : 'Listen'}
            </Button>
            
            <Button
              onClick={() => onDelete(currentItem.originalId)}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button
              onClick={onPrevious}
              disabled={currentIndex === 0}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <span className="text-sm text-gray-500">
              {currentIndex + 1} / {items.length}
            </span>
            
            <Button
              onClick={onNext}
              disabled={currentIndex === items.length - 1}
              variant="outline"
              size="sm"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}