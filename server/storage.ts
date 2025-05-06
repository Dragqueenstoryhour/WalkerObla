import { 
  users, 
  userProfiles,
  readingSession,
  gameLevels,
  exercises,
  userExercises,
  sharedPhraseCollections,
  userSavedPhrases,
  type User, 
  type InsertUser, 
  type UpsertUser,
  type ReadingSession, 
  type InsertReadingSession,
  type UserProfile,
  type InsertUserProfile,
  type GameLevel,
  type InsertGameLevel,
  type Exercise,
  type InsertExercise,
  type UserExercise,
  type InsertUserExercise,
  type SharedPhraseCollection,
  type InsertSharedPhraseCollection,
  type UserSavedPhrase,
  type InsertUserSavedPhrase
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { type Json } from "drizzle-orm/pg-core";
import { db } from "./db";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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
  
  // Shared phrase collections methods
  createSharedPhraseCollection(collection: InsertSharedPhraseCollection): Promise<SharedPhraseCollection>;
  getSharedPhraseCollection(shareId: string): Promise<SharedPhraseCollection | undefined>;
  
  // User saved phrases methods
  getUserSavedPhrases(userId: string): Promise<UserSavedPhrase[]>;
  getUserSavedPhraseById(id: number): Promise<UserSavedPhrase | undefined>;
  createUserSavedPhrase(phrase: InsertUserSavedPhrase): Promise<UserSavedPhrase>;
  updateUserSavedPhrase(id: number, updates: Partial<UserSavedPhrase>): Promise<UserSavedPhrase | undefined>;
  deleteUserSavedPhrase(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private userProfiles: Map<number, UserProfile>;
  private readingSessions: Map<number, ReadingSession>;
  private gameLevels: Map<number, GameLevel>;
  private exercises: Map<number, Exercise>;
  private userExercises: Map<number, UserExercise>;
  private sharedPhraseCollections: Map<string, SharedPhraseCollection>;
  private userSavedPhrases: Map<number, UserSavedPhrase>;
  
  currentSessionId: number;
  currentProfileId: number;
  currentLevelId: number;
  currentExerciseId: number;
  currentUserExerciseId: number;
  currentUserSavedPhraseId: number;
  currentSharedCollectionId: number;

  constructor() {
    this.users = new Map();
    this.userProfiles = new Map();
    this.readingSessions = new Map();
    this.gameLevels = new Map();
    this.exercises = new Map();
    this.userExercises = new Map();
    this.sharedPhraseCollections = new Map();
    this.userSavedPhrases = new Map();
    
    this.currentSessionId = 1;
    this.currentProfileId = 1;
    this.currentLevelId = 1;
    this.currentExerciseId = 1;
    this.currentUserExerciseId = 1;
    this.currentUserSavedPhraseId = 1;
    this.currentSharedCollectionId = 1;
    
    // Set up initial levels and exercises
    this.initializeGameLevels();
  }
  
  private async initializeGameLevels() {
    // Level 1 – Mixed Easy Words
    const level1 = await this.createGameLevel({
      levelNumber: 1,
      name: "Mixed Easy Words",
      description: "Practice simple, mixed‑category words",
      requiredXP: 0,
      unlockableRewards: { hat: "baseball_cap" },
      difficulty: "easy"
    });
    const level1Words = ["There", "Phone", "Eat", "Sun", "Ball", "Run", "Book", "Ice", "Hat", "Dog"];
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

    // Level 2 – Mixed Trickier Words
    const level2 = await this.createGameLevel({
      levelNumber: 2,
      name: "Mixed Trickier Words",
      description: "Practice mixed words with varied sounds",
      requiredXP: 100,
      unlockableRewards: { accessory: "headphones" },
      difficulty: "easy"
    });
    const level2Words = ["Train", "Pizza", "Monkey", "Purple", "Dance", "Movie", "Smile", "Beach", "Cookie", "Laugh"];
    for (let i = 0; i < level2Words.length; i++) {
      await this.createExercise({
        levelId: level2.id,
        type: "word",
        content: level2Words[i],
        difficulty: "easy",
        xpReward: 10,
        order: i + 1
      });
    }

    // Level 3 – Multisyllabic Words
    const level3 = await this.createGameLevel({
      levelNumber: 3,
      name: "Multisyllabic Words",
      description: "Practice words with more syllables and blends",
      requiredXP: 200,
      unlockableRewards: { outfit: "casual_tshirt" },
      difficulty: "medium"
    });
    const level3Words = ["Adventure", "Guitar", "Remote", "Jellybean", "Blanket", "Window", "Robot", "Party", "Chocolate", "Skating"];
    for (let i = 0; i < level3Words.length; i++) {
      await this.createExercise({
        levelId: level3.id,
        type: "word",
        content: level3Words[i],
        difficulty: "medium",
        xpReward: 10,
        order: i + 1
      });
    }

    // Level 4 – Abstract & Complex Words
    const level4 = await this.createGameLevel({
      levelNumber: 4,
      name: "Abstract & Complex Words",
      description: "Practice challenging, abstract, or multi‑syllabic words",
      requiredXP: 300,
      unlockableRewards: { background: "ocean_waves" },
      difficulty: "medium"
    });
    const level4Words = ["Celebrate", "Document", "Excellent", "Dinosaur", "Festival", "Notebook", "Surprise", "Computer", "Pancakes"];
    for (let i = 0; i < level4Words.length; i++) {
      await this.createExercise({
        levelId: level4.id,
        type: "word",
        content: level4Words[i],
        difficulty: "medium",
        xpReward: 10,
        order: i + 1
      });
    }

    // Level 5 – Fun Starter Phrases
    const level5 = await this.createGameLevel({
      levelNumber: 5,
      name: "Fun Starter Phrases",
      description: "Practice short, fun phrases",
      requiredXP: 400,
      unlockableRewards: { badge: "phrase_master" },
      difficulty: "medium"
    });
    const level5Phrases = [
      "I want to play.",
      "That looks so fun!",
      "Let's go outside.",
      "I like this game.",
      "Come dance with me.",
      "This is my favorite.",
      "I can do it!",
      "Let's watch a movie.",
      "That was so cool!",
      "I love chocolate cake."
    ];
    for (let i = 0; i < level5Phrases.length; i++) {
      await this.createExercise({
        levelId: level5.id,
        type: "phrase",
        content: level5Phrases[i],
        difficulty: "medium",
        xpReward: 15,
        order: i + 1
      });
    }

    // Level 6 – Expressive Phrases
    const level6 = await this.createGameLevel({
      levelNumber: 6,
      name: "Expressive Phrases",
      description: "Practice expressive and relatable phrases",
      requiredXP: 500,
      unlockableRewards: { outfit: "explorer_vest" },
      difficulty: "medium"
    });
    const level6Phrases = [
      "I'm excited for tomorrow.",
      "That made me laugh so hard!",
      "Let's build a giant tower.",
      "I could eat ten cookies!",
      "The music sounds amazing.",
      "This day is the best.",
      "I forgot my lucky socks!",
      "Let's make a funny video.",
      "I wish we had a trampoline.",
      "That story was really weird."
    ];
    for (let i = 0; i < level6Phrases.length; i++) {
      await this.createExercise({
        levelId: level6.id,
        type: "phrase",
        content: level6Phrases[i],
        difficulty: "medium",
        xpReward: 15,
        order: i + 1
      });
    }

    // Level 7 – 8th Grade Level Phrases
    const level7 = await this.createGameLevel({
      levelNumber: 7,
      name: "8th Grade Level Phrases",
      description: "Practice advanced, 8th grade level phrases",
      requiredXP: 600,
      unlockableRewards: { hat: "explorer_hat" },
      difficulty: "hard"
    });
    const level7Phrases = [
      "That challenge was harder than it looked.",
      "I honestly didn't expect it to work.",
      "Can we try something completely different today?",
      "I've always wanted to ride in a hot air balloon.",
      "It's way more fun when everyone's laughing.",
      "That magician trick blew my mind.",
      "If I had a robot, I'd teach it to dance.",
      "I'm not sure what happened, but it was hilarious.",
      "This level is totally impossible—let's beat it anyway!",
      "I came up with the craziest idea ever."
    ];
    for (let i = 0; i < level7Phrases.length; i++) {
      await this.createExercise({
        levelId: level7.id,
        type: "phrase",
        content: level7Phrases[i],
        difficulty: "hard",
        xpReward: 15,
        order: i + 1
      });
    }

    // Level 8 – Simple Sentences
    const level8 = await this.createGameLevel({
      levelNumber: 8,
      name: "Simple Sentences",
      description: "Practice simple complete sentences",
      requiredXP: 700,
      unlockableRewards: { accessory: "pirate_compass" },
      difficulty: "medium"
    });
    const level8Sentences = [
      "We raced down the hill laughing.",
      "I drew a spaceship on my paper.",
      "She made a volcano that exploded.",
      "The cat jumped over the pillows.",
      "He sings loud in the shower.",
      "We made a fort from blankets.",
      "I opened the box and gasped.",
      "The balloon floated into the sky.",
      "They ran because the sprinklers turned on.",
      "I want to ride the rollercoaster again."
    ];
    for (let i = 0; i < level8Sentences.length; i++) {
      await this.createExercise({
        levelId: level8.id,
        type: "sentence",
        content: level8Sentences[i],
        difficulty: "medium",
        xpReward: 25,
        order: i + 1
      });
    }

    // Level 9 – Creative Sentences
    const level9 = await this.createGameLevel({
      levelNumber: 9,
      name: "Creative Sentences",
      description: "Practice complex and creative sentences",
      requiredXP: 800,
      unlockableRewards: { badge: "creative_genius" },
      difficulty: "hard"
    });
    const level9Sentences = [
      "The robot accidentally spilled popcorn on the teacher's shoes.",
      "I jumped into the pool wearing all my clothes.",
      "If we build a rocket, we can visit space.",
      "The dragon wore sunglasses and danced to disco music.",
      "I bet I can stack ten pancakes without dropping one.",
      "She drew a llama in a tuxedo for art class.",
      "He told the funniest joke, and I spit out water.",
      "We hid behind the couch when the lights went out.",
      "The treasure map led us to a vending machine.",
      "My kite got stuck in a cloud shaped like pizza."
    ];
    for (let i = 0; i < level9Sentences.length; i++) {
      await this.createExercise({
        levelId: level9.id,
        type: "sentence",
        content: level9Sentences[i],
        difficulty: "hard",
        xpReward: 25,
        order: i + 1
      });
    }

    // Level 10 – Whimsical Sentences
    const level10 = await this.createGameLevel({
      levelNumber: 10,
      name: "Whimsical Sentences",
      description: "Practice advanced, whimsical sentences at a 10th grade reading level",
      requiredXP: 900,
      unlockableRewards: { outfit: "treasure_hunter" },
      difficulty: "hard"
    });
    const level10Sentences = [
      "If unicorns were real, I'd totally teach mine to skateboard.",
      "I wrote a poem about french fries and it won a contest.",
      "While everyone was talking, I imagined living in a treehouse.",
      "The best adventures happen when nobody's looking at the clock.",
      "I'd rather have a superpower than a million dollars—maybe.",
      "My brain feels like a popcorn machine when I'm excited.",
      "The rollercoaster felt like flying through a thunderstorm of jellybeans.",
      "I once convinced my cousin that sandwiches talk when no one's around.",
      "The best kind of chaos involves glitter, music, and pizza.",
      "Today felt like the plot of a very strange comedy movie."
    ];
    for (let i = 0; i < level10Sentences.length; i++) {
      await this.createExercise({
        levelId: level10.id,
        type: "sentence",
        content: level10Sentences[i],
        difficulty: "hard",
        xpReward: 25,
        order: i + 1
      });
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      level: 1,
      xp: 0,
      totalExercisesCompleted: 0,
      streakDays: 0,
      lastActivityDate: null,
      unlockedRewards: {},
      createdAt: new Date()
    };
    this.users.set(user.id, user);
    
    // Create default profile for user
    await this.createUserProfile({
      userId: user.id,
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
  
  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async upsertUser(userData: UpsertUser): Promise<User> {
    let user = await this.getUser(userData.id);
    
    if (user) {
      // Update user if they exist
      user = await this.updateUser(userData.id, {
        ...userData,
        updatedAt: new Date()
      }) as User;
    } else {
      // Create new user if they don't exist
      user = await this.createUser({
        ...userData
      });
    }
    
    return user;
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
  
  // Shared phrase collections methods
  async createSharedPhraseCollection(collection: InsertSharedPhraseCollection): Promise<SharedPhraseCollection> {
    try {
      // Insert into the database
      const [sharedCollection] = await db
        .insert(sharedPhraseCollections)
        .values({
          shareId: collection.shareId,
          userId: collection.userId,
          name: collection.name || null,
          phrases: collection.phrases
        })
        .returning();
      
      return sharedCollection;
    } catch (error) {
      console.error('Error creating shared phrase collection:', error);
      // Fallback to memory storage if database fails
      const sharedCollection: SharedPhraseCollection = {
        id: this.currentSharedCollectionId++, 
        ...collection,
        createdAt: new Date()
      };
      
      this.sharedPhraseCollections.set(collection.shareId, sharedCollection);
      return sharedCollection;
    }
  }
  
  async getSharedPhraseCollection(shareId: string): Promise<SharedPhraseCollection | undefined> {
    try {
      // Query from the database
      const [collection] = await db
        .select()
        .from(sharedPhraseCollections)
        .where(eq(sharedPhraseCollections.shareId, shareId));
      
      return collection;
    } catch (error) {
      console.error('Error fetching shared phrase collection:', error);
      // Fallback to memory storage
      return this.sharedPhraseCollections.get(shareId);
    }
  }
  
  // User saved phrases methods
  async getUserSavedPhrases(userId: string): Promise<UserSavedPhrase[]> {
    return Array.from(this.userSavedPhrases.values())
      .filter(phrase => phrase.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  
  async getUserSavedPhraseById(id: number): Promise<UserSavedPhrase | undefined> {
    return this.userSavedPhrases.get(id);
  }
  
  async createUserSavedPhrase(phrase: InsertUserSavedPhrase): Promise<UserSavedPhrase> {
    const id = this.currentUserSavedPhraseId++;
    const savedPhrase: UserSavedPhrase = {
      id,
      ...phrase,
      createdAt: new Date()
    };
    
    this.userSavedPhrases.set(id, savedPhrase);
    return savedPhrase;
  }
  
  async updateUserSavedPhrase(id: number, updates: Partial<UserSavedPhrase>): Promise<UserSavedPhrase | undefined> {
    const phrase = this.userSavedPhrases.get(id);
    if (!phrase) return undefined;
    
    const updatedPhrase = {
      ...phrase,
      ...updates
    };
    
    this.userSavedPhrases.set(id, updatedPhrase);
    return updatedPhrase;
  }
  
  async deleteUserSavedPhrase(id: number): Promise<void> {
    this.userSavedPhrases.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        level: 1,
        xp: 0,
        totalExercisesCompleted: 0,
        streakDays: 0,
        lastActivityDate: null,
        unlockedRewards: {}
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          lastActivityDate: new Date()
        }
      })
      .returning();
    return user;
  }
  
  // User profile methods - temporarily using memory storage methods
  // We'll implement these with database operations later
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    return memStorage.getUserProfile(userId);
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    return memStorage.createUserProfile(profile);
  }

  async updateUserProfile(userId: number, updates: Partial<UserProfile>): Promise<UserProfile | undefined> {
    return memStorage.updateUserProfile(userId, updates);
  }
  
  // Reading session methods
  async createReadingSession(session: InsertReadingSession): Promise<ReadingSession> {
    return memStorage.createReadingSession(session);
  }

  async getReadingSession(id: number): Promise<ReadingSession | undefined> {
    return memStorage.getReadingSession(id);
  }

  async getUserReadingSessions(userId: number): Promise<ReadingSession[]> {
    return memStorage.getUserReadingSessions(userId);
  }
  
  // Game level methods
  async getGameLevel(id: number): Promise<GameLevel | undefined> {
    return memStorage.getGameLevel(id);
  }

  async getGameLevelByNumber(levelNumber: number): Promise<GameLevel | undefined> {
    return memStorage.getGameLevelByNumber(levelNumber);
  }

  async getAllGameLevels(): Promise<GameLevel[]> {
    return memStorage.getAllGameLevels();
  }

  async createGameLevel(level: InsertGameLevel): Promise<GameLevel> {
    return memStorage.createGameLevel(level);
  }
  
  // Exercise methods
  async getExercise(id: number): Promise<Exercise | undefined> {
    return memStorage.getExercise(id);
  }

  async getExercisesByLevel(levelId: number): Promise<Exercise[]> {
    return memStorage.getExercisesByLevel(levelId);
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    return memStorage.createExercise(exercise);
  }
  
  // User exercise methods
  async getUserExercise(userId: number, exerciseId: number): Promise<UserExercise | undefined> {
    return memStorage.getUserExercise(userId, exerciseId);
  }

  async getUserExercisesByLevel(userId: number, levelId: number): Promise<UserExercise[]> {
    return memStorage.getUserExercisesByLevel(userId, levelId);
  }

  async createUserExercise(userExercise: InsertUserExercise): Promise<UserExercise> {
    return memStorage.createUserExercise(userExercise);
  }

  async updateUserExercise(id: number, updates: Partial<UserExercise>): Promise<UserExercise | undefined> {
    return memStorage.updateUserExercise(id, updates);
  }
  
  // Shared phrase collections methods
  async createSharedPhraseCollection(collection: InsertSharedPhraseCollection): Promise<SharedPhraseCollection> {
    const [newCollection] = await db
      .insert(sharedPhraseCollections)
      .values(collection)
      .returning();
    return newCollection;
  }
  
  async getSharedPhraseCollection(shareId: string): Promise<SharedPhraseCollection | undefined> {
    const [collection] = await db
      .select()
      .from(sharedPhraseCollections)
      .where(eq(sharedPhraseCollections.shareId, shareId));
    return collection || undefined;
  }
  
  // User saved phrases methods
  async getUserSavedPhrases(userId: string): Promise<UserSavedPhrase[]> {
    return db
      .select()
      .from(userSavedPhrases)
      .where(eq(userSavedPhrases.userId, userId))
      .orderBy(userSavedPhrases.createdAt);
  }
  
  async getUserSavedPhraseById(id: number): Promise<UserSavedPhrase | undefined> {
    const [phrase] = await db
      .select()
      .from(userSavedPhrases)
      .where(eq(userSavedPhrases.id, id));
    return phrase || undefined;
  }
  
  async createUserSavedPhrase(phrase: InsertUserSavedPhrase): Promise<UserSavedPhrase> {
    const [newPhrase] = await db
      .insert(userSavedPhrases)
      .values(phrase)
      .returning();
    return newPhrase;
  }
  
  async updateUserSavedPhrase(id: number, updates: Partial<UserSavedPhrase>): Promise<UserSavedPhrase | undefined> {
    const [phrase] = await db
      .update(userSavedPhrases)
      .set(updates)
      .where(eq(userSavedPhrases.id, id))
      .returning();
    return phrase;
  }
  
  async deleteUserSavedPhrase(id: number): Promise<void> {
    await db
      .delete(userSavedPhrases)
      .where(eq(userSavedPhrases.id, id));
  }
}

// Keep the memory storage for non-authentication related features
const memStorage = new MemStorage();

// Use the database storage for the app
export const storage = new DatabaseStorage();
