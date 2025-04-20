import { Exercise, UserExercise, PronunciationAssessmentResult } from '@/lib/types';
import { ExerciseItem } from './ExerciseItem';

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
    <div className="space-y-4">
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