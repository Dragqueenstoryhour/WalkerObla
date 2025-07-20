import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Constants for syllable coloring
const ACCURACY_THRESHOLD_GREEN = 70;
const COLOR_GREEN = '#2a9d8f';
const COLOR_RED = '#e76f51';
const COLOR_DEFAULT = '#ffffff';

// Helper function to get syllable color based on accuracy score
export const getSyllableColor = (accuracyScore: number): string => {
  if (accuracyScore >= ACCURACY_THRESHOLD_GREEN) {
    return COLOR_GREEN; // Green for correct pronunciation
  } else {
    return COLOR_RED; // Red for incorrect pronunciation
  }
};

// Helper function to map syllables from assessment results to syllabication display
export const mapSyllablesToDisplay = (syllabication: string, syllables: any[]): Array<{text: string, color: string}> => {
  if (!syllables || syllables.length === 0) {
    // No syllable data available, return default styling
    return syllabication.split('-').map(syllable => ({
      text: syllable,
      color: COLOR_DEFAULT // Default white color
    }));
  }
  
  const displaySyllables = syllabication.split('-');
  const resultSyllables = displaySyllables.map((displaySyllable, index) => {
    // Try to match with assessment syllables
    const matchingSyllable = syllables.find(s => 
      s.syllable && s.grapheme &&
      (s.syllable.toLowerCase().includes(displaySyllable.toLowerCase()) ||
      s.grapheme.toLowerCase().includes(displaySyllable.toLowerCase()))
    );
    
    if (matchingSyllable) {
      return {
        text: displaySyllable,
        color: getSyllableColor(matchingSyllable.accuracyScore)
      };
    } else {
      return {
        text: displaySyllable,
        color: COLOR_DEFAULT // Default white if no match found
      };
    }
  });
  
  return resultSyllables;
};
