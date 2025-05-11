// Dictionary of 10 simple words for each letter from A to X
// Each level focuses on words that start with that specific letter

export const levelWords: Record<string, string[]> = {
  // A words
  'A': [
    'apple', 'ant', 'arrow', 'airplane', 'animal',
    'alive', 'away', 'about', 'answer', 'around'
  ],
  
  // B words
  'B': [
    'ball', 'book', 'boy', 'boat', 'bird',
    'blue', 'big', 'basket', 'butter', 'banana'
  ],
  
  // C words
  'C': [
    'cat', 'car', 'cup', 'cake', 'cookie',
    'cold', 'cut', 'chair', 'color', 'candy'
  ],
  
  // D words
  'D': [
    'dog', 'door', 'desk', 'dark', 'day',
    'duck', 'deep', 'dinner', 'dance', 'down'
  ],
  
  // E words
  'E': [
    'egg', 'elephant', 'exit', 'early', 'eat',
    'end', 'eye', 'each', 'easy', 'empty'
  ],
  
  // F words
  'F': [
    'fish', 'frog', 'flower', 'fan', 'fast',
    'food', 'family', 'feet', 'friend', 'fall'
  ],
  
  // G words
  'G': [
    'game', 'girl', 'go', 'green', 'garden',
    'gift', 'grass', 'grand', 'good', 'grow'
  ],
  
  // H words
  'H': [
    'house', 'hand', 'hat', 'happy', 'hot',
    'home', 'hill', 'help', 'heart', 'head'
  ],
  
  // I words
  'I': [
    'ice', 'idea', 'in', 'insect', 'important',
    'inside', 'iron', 'island', 'inch', 'igloo'
  ],
  
  // J words
  'J': [
    'jump', 'jacket', 'job', 'juice', 'jar',
    'jelly', 'join', 'joy', 'jungle', 'jam'
  ],
  
  // K words
  'K': [
    'king', 'key', 'kid', 'kite', 'kitchen',
    'kind', 'keep', 'kick', 'know', 'kangaroo'
  ],
  
  // L words
  'L': [
    'lamp', 'lake', 'lion', 'leg', 'light',
    'love', 'laugh', 'leaf', 'lost', 'letter'
  ],
  
  // M words
  'M': [
    'mom', 'man', 'milk', 'mouse', 'moon',
    'mop', 'make', 'music', 'mail', 'more'
  ],
  
  // N words
  'N': [
    'nose', 'nest', 'nine', 'night', 'name',
    'new', 'next', 'need', 'nut', 'nature'
  ],
  
  // O words
  'O': [
    'open', 'on', 'owl', 'off', 'over',
    'orange', 'outside', 'ocean', 'old', 'one'
  ],
  
  // P words
  'P': [
    'pen', 'paper', 'pet', 'park', 'play',
    'purple', 'pink', 'people', 'pie', 'page'
  ],
  
  // Q words
  'Q': [
    'quick', 'quiet', 'queen', 'question', 'quilt',
    'quack', 'quarter', 'quiz', 'quote', 'quill'
  ],
  
  // R words
  'R': [
    'red', 'run', 'rain', 'robot', 'rabbit',
    'read', 'room', 'rainbow', 'rock', 'right'
  ],
  
  // S words
  'S': [
    'sun', 'star', 'sand', 'sea', 'smile',
    'sit', 'see', 'small', 'sing', 'sleep'
  ],
  
  // T words
  'T': [
    'table', 'toy', 'tiger', 'time', 'tall',
    'tree', 'think', 'thank', 'talk', 'ten'
  ],
  
  // U words
  'U': [
    'up', 'under', 'umbrella', 'use', 'uncle',
    'united', 'until', 'us', 'upon', 'understand'
  ],
  
  // V words
  'V': [
    'van', 'very', 'visit', 'voice', 'vacation',
    'village', 'valley', 'vegetable', 'vest', 'view'
  ],
  
  // W words
  'W': [
    'water', 'walk', 'window', 'wish', 'welcome',
    'warm', 'work', 'who', 'white', 'way'
  ],
  
  // X words
  'X': [
    'x-ray', 'xylophone', 'extra', 'box', 'fox',
    'exit', 'excel', 'mix', 'next', 'fix'
  ]
};

// Function to get 10 words for a specific level
export function getWordsForLevel(levelNumber: number): string[] {
  // Convert level number to letter (1 = A, 2 = B, etc.)
  const letter = String.fromCharCode(64 + levelNumber);
  
  // Return words for this letter, or empty array if not found
  return levelWords[letter] || [];
}