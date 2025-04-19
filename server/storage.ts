import { 
  users, 
  type User, 
  type InsertUser, 
  type ReadingSession, 
  type InsertReadingSession,
  type UserProfile,
  type InsertUserProfile,
  type GameLevel,
  type InsertGameLevel,
  type Exercise,
  type InsertExercise,
  type UserExercise,
  type InsertUserExercise
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // User profile methods
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: number, updates: Partial<UserProfile>): Promise<UserProfile | undefined>;
  
  // Reading session methods
  createReadingSession(session: InsertReadingSession): Promise<ReadingSession>;
  getReadingSession(id: number): Promise<ReadingSession | undefined>;
  getUserReadingSessions(userId: number): Promise<ReadingSession[]>;
  
  // Game level methods
  getGameLevel(id: number): Promise<GameLevel | undefined>;
  getGameLevelByNumber(levelNumber: number): Promise<GameLevel | undefined>;
  getAllGameLevels(): Promise<GameLevel[]>;
  createGameLevel(level: InsertGameLevel): Promise<GameLevel>;
  
  // Exercise methods
  getExercise(id: number): Promise<Exercise | undefined>;
  getExercisesByLevel(levelId: number): Promise<Exercise[]>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  
  // User exercise methods
  getUserExercise(userId: number, exerciseId: number): Promise<UserExercise | undefined>;
  getUserExercisesByLevel(userId: number, levelId: number): Promise<UserExercise[]>;
  createUserExercise(userExercise: InsertUserExercise): Promise<UserExercise>;
  updateUserExercise(id: number, updates: Partial<UserExercise>): Promise<UserExercise | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private userProfiles: Map<number, UserProfile>;
  private readingSessions: Map<number, ReadingSession>;
  private gameLevels: Map<number, GameLevel>;
  private exercises: Map<number, Exercise>;
  private userExercises: Map<number, UserExercise>;
  
  currentId: number;
  currentSessionId: number;
  currentProfileId: number;
  currentLevelId: number;
  currentExerciseId: number;
  currentUserExerciseId: number;

  constructor() {
    this.users = new Map();
    this.userProfiles = new Map();
    this.readingSessions = new Map();
    this.gameLevels = new Map();
    this.exercises = new Map();
    this.userExercises = new Map();
    
    this.currentId = 1;
    this.currentSessionId = 1;
    this.currentProfileId = 1;
    this.currentLevelId = 1;
    this.currentExerciseId = 1;
    this.currentUserExerciseId = 1;
    
    // Set up initial levels and exercises
    this.initializeGameLevels();
  }
  
  private async initializeGameLevels() {
    // Create basic levels for testing
    const level1 = await this.createGameLevel({
      levelNumber: 1,
      name: "Beginner Words",
      description: "Practice simple words to build your pronunciation skills",
      requiredXP: 0,
      unlockableRewards: { hat: "baseball_cap" },
      difficulty: "easy"
    });
    
    const level2 = await this.createGameLevel({
      levelNumber: 2,
      name: "Simple Phrases",
      description: "Practice short phrases to improve your fluency",
      requiredXP: 100,
      unlockableRewards: { accessory: "headphones" },
      difficulty: "easy"
    });
    
    const level3 = await this.createGameLevel({
      levelNumber: 3,
      name: "Complete Sentences",
      description: "Practice complete sentences for better speech rhythm",
      requiredXP: 250,
      unlockableRewards: { outfit: "casual_tshirt" },
      difficulty: "medium"
    });
    
    // Add some exercises to level 1 (simple words)
    const level1Words = ["Hello", "World", "Cat", "Dog", "Book", "Water", "Apple", "Sun", "Moon", "Star", "Tree", "House"];
    
    for (let i = 0; i < level1Words.length; i++) {
      await this.createExercise({
        levelId: level1.id,
        type: "word",
        content: level1Words[i],
        difficulty: "easy",
        xpReward: 10,
        order: i + 1
      });
    }
    
    // Add some exercises to level 2 (phrases)
    const level2Phrases = [
      "Good morning",
      "How are you",
      "Thank you very much",
      "Nice to meet you",
      "What time is it",
      "I like reading",
      "The blue sky",
      "A beautiful day"
    ];
    
    for (let i = 0; i < level2Phrases.length; i++) {
      await this.createExercise({
        levelId: level2.id,
        type: "phrase",
        content: level2Phrases[i],
        difficulty: "easy",
        xpReward: 15,
        order: i + 1
      });
    }
    
    // Add some exercises to level 3 (sentences)
    const level3Sentences = [
      "Today is a beautiful day for a walk in the park.",
      "I enjoy reading books about science and history.",
      "The quick brown fox jumps over the lazy dog.",
      "Learning to speak clearly is an important skill.",
      "Practice makes perfect when you're learning something new."
    ];
    
    for (let i = 0; i < level3Sentences.length; i++) {
      await this.createExercise({
        levelId: level3.id,
        type: "sentence",
        content: level3Sentences[i],
        difficulty: "medium",
        xpReward: 25,
        order: i + 1
      });
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = {
      ...insertUser,
      id,
      level: 1,
      xp: 0,
      totalExercisesCompleted: 0,
      streakDays: 0,
      unlockedRewards: {},
      createdAt: new Date()
    };
    this.users.set(id, user);
    
    // Create default profile for user
    await this.createUserProfile({
      userId: id,
      displayName: insertUser.username,
      avatarStyle: {
        skinTone: "medium",
        hairStyle: "short",
        hairColor: "brown",
        faceShape: "oval",
        eyeColor: "brown",
        eyebrowStyle: "natural",
        noseStyle: "medium",
        mouthStyle: "neutral"
      },
      selectedRewards: {}
    });
    
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // User profile methods
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    return Array.from(this.userProfiles.values()).find(
      (profile) => profile.userId === userId
    );
  }
  
  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const id = this.currentProfileId++;
    const now = new Date();
    const userProfile: UserProfile = {
      ...profile,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.userProfiles.set(id, userProfile);
    return userProfile;
  }
  
  async updateUserProfile(userId: number, updates: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return undefined;
    
    const updatedProfile = { 
      ...profile, 
      ...updates,
      updatedAt: new Date()
    };
    this.userProfiles.set(profile.id, updatedProfile);
    return updatedProfile;
  }

  // Reading session methods
  async createReadingSession(insertSession: InsertReadingSession): Promise<ReadingSession> {
    const id = this.currentSessionId++;
    const session: ReadingSession = { 
      ...insertSession, 
      id,
      createdAt: new Date(),
      completedAt: null
    };
    this.readingSessions.set(id, session);
    return session;
  }

  async getReadingSession(id: number): Promise<ReadingSession | undefined> {
    return this.readingSessions.get(id);
  }

  async getUserReadingSessions(userId: number): Promise<ReadingSession[]> {
    return Array.from(this.readingSessions.values()).filter(
      (session) => session.userId === userId
    );
  }
  
  // Game level methods
  async getGameLevel(id: number): Promise<GameLevel | undefined> {
    return this.gameLevels.get(id);
  }
  
  async getGameLevelByNumber(levelNumber: number): Promise<GameLevel | undefined> {
    return Array.from(this.gameLevels.values()).find(
      (level) => level.levelNumber === levelNumber
    );
  }
  
  async getAllGameLevels(): Promise<GameLevel[]> {
    return Array.from(this.gameLevels.values())
      .sort((a, b) => a.levelNumber - b.levelNumber);
  }
  
  async createGameLevel(level: InsertGameLevel): Promise<GameLevel> {
    const id = this.currentLevelId++;
    const gameLevel: GameLevel = {
      ...level,
      id,
      createdAt: new Date()
    };
    this.gameLevels.set(id, gameLevel);
    return gameLevel;
  }
  
  // Exercise methods
  async getExercise(id: number): Promise<Exercise | undefined> {
    return this.exercises.get(id);
  }
  
  async getExercisesByLevel(levelId: number): Promise<Exercise[]> {
    return Array.from(this.exercises.values())
      .filter((exercise) => exercise.levelId === levelId)
      .sort((a, b) => a.order - b.order);
  }
  
  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const id = this.currentExerciseId++;
    const newExercise: Exercise = {
      ...exercise,
      id,
      createdAt: new Date()
    };
    this.exercises.set(id, newExercise);
    return newExercise;
  }
  
  // User exercise methods
  async getUserExercise(userId: number, exerciseId: number): Promise<UserExercise | undefined> {
    return Array.from(this.userExercises.values()).find(
      (userExercise) => userExercise.userId === userId && userExercise.exerciseId === exerciseId
    );
  }
  
  async getUserExercisesByLevel(userId: number, levelId: number): Promise<UserExercise[]> {
    // Get all exercises for this level
    const levelExercises = await this.getExercisesByLevel(levelId);
    const exerciseIds = levelExercises.map(exercise => exercise.id);
    
    return Array.from(this.userExercises.values()).filter(
      (userExercise) => userExercise.userId === userId && exerciseIds.includes(userExercise.exerciseId)
    );
  }
  
  async createUserExercise(userExercise: InsertUserExercise): Promise<UserExercise> {
    const id = this.currentUserExerciseId++;
    const newUserExercise: UserExercise = {
      ...userExercise,
      id,
      createdAt: new Date()
    };
    this.userExercises.set(id, newUserExercise);
    return newUserExercise;
  }
  
  async updateUserExercise(id: number, updates: Partial<UserExercise>): Promise<UserExercise | undefined> {
    const userExercise = this.userExercises.get(id);
    if (!userExercise) return undefined;
    
    const updatedUserExercise = {
      ...userExercise,
      ...updates,
      lastAttemptAt: new Date()
    };
    this.userExercises.set(id, updatedUserExercise);
    return updatedUserExercise;
  }
}

export const storage = new MemStorage();
