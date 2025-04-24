import { Exercise, UserExercise, PronunciationAssessmentResult } from '@/lib/types';
import { ExerciseItem } from './ExerciseItem';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import { Save } from 'lucide-react';

interface ExerciseListProps {
  exercises: Exercise[];
  userExercises: UserExercise[];
  activeExerciseId: number | null;
  onStartExercise: (exerciseId: number) => void;
  onCompleteExercise: (exerciseId: number, result: PronunciationAssessmentResult) => void;
}

export function ExerciseList({ 
  exercises, 
  userExercises, 
  activeExerciseId,
  onStartExercise,
  onCompleteExercise
}: ExerciseListProps) {
  // Get authentication status
  const { isAuthenticated, isLoading } = useAuth();
  
  // Sort exercises by order
  const sortedExercises = [...exercises].sort((a, b) => a.order - b.order);

  // Function to get user exercise data for a specific exercise
  const getUserExercise = (exerciseId: number) => {
    return userExercises.find(ue => ue.exerciseId === exerciseId);
  };

  // Function to check if an exercise is active - now all exercises are active
  // allowing users to skip around and practice any word
  const isExerciseActive = (exerciseId: number) => {
    // All exercises are now active to allow skipping around
    return true;
  };

  // Function to calculate progress percentage
  const getProgressPercentage = () => {
    const completedCount = userExercises.filter(ue => ue.completed).length;
    return Math.floor((completedCount / exercises.length) * 100);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 space-y-4">
      {!isAuthenticated && !isLoading && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-center">
          <div className="font-medium text-amber-800 mb-2">Want to save your progress?</div>
          <p className="text-amber-700 text-sm mb-3">
            Sign in to track your pronunciation scores and unlock rewards!
          </p>
          <Button 
            variant="outline"
            size="sm"
            className="bg-white border-amber-500 text-amber-700 hover:bg-amber-100 flex items-center gap-2"
            onClick={() => window.location.href = "/api/login"}
          >
            <Save className="h-4 w-4" />
            Sign in to save progress
          </Button>
        </div>
      )}
      
      {sortedExercises.map((exercise) => {
        const userExercise = getUserExercise(exercise.id);

        return (
          <ExerciseItem 
            key={exercise.id}
            exercise={exercise}
            isActive={isExerciseActive(exercise.id)}
            isCompleted={!!userExercise?.completed}
            onStart={() => onStartExercise(exercise.id)}
            onComplete={(result) => onCompleteExercise(exercise.id, result)}
            pronunciationResults={userExercise?.pronunciationScore ? {
              pronunciationScore: userExercise.pronunciationScore,
              // Placeholder values for missing fields in UserExercise
              fluencyScore: Math.max(50, userExercise.pronunciationScore - 10),
              completenessScore: Math.max(60, userExercise.pronunciationScore - 5),
              accuracyScore: userExercise.pronunciationScore,
              wordLevelResults: []
            } : undefined}
          />
        );
      })}
    </div>
  );
}