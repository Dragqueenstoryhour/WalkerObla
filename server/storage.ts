import { 
  users, 
  userProfiles,
  readingSession,
  gameLevels,
  exercises,
  userExercises,
  sharedPhraseCollections,
  userSavedPhrases,
  practiceGroups,
  practiceGroupPhrases,
  savedWords,
  wordFolders,
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
  type InsertUserSavedPhrase,
  type PracticeGroup,
  type InsertPracticeGroup,
  type PracticeGroupPhrase,
  type InsertPracticeGroupPhrase,
  type SavedWord,
  type InsertSavedWord,
  type WordFolder,
  type InsertWordFolder
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { type Json } from "drizzle-orm/pg-core";
import { db } from "./db";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // User profile methods
  getUserProfile(userId: string): Promise<UserProfile | undefined>; // Changed to string
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | undefined>; // Changed to string

  // Reading session methods
  createReadingSession(session: InsertReadingSession): Promise<ReadingSession>;
  getReadingSession(id: number): Promise<ReadingSession | undefined>;
  getUserReadingSessions(userId: string): Promise<ReadingSession[]>; // Changed to string

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
  getUserExercise(userId: string, exerciseId: number): Promise<UserExercise | undefined>; // Changed to string
  getUserExercisesByLevel(userId: string, levelId: number): Promise<UserExercise[]>; // Changed to string
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

  // Practice groups methods
  getPracticeGroups(userId: string): Promise<PracticeGroup[]>;
  getPracticeGroupById(id: number): Promise<PracticeGroup | undefined>;
  createPracticeGroup(group: InsertPracticeGroup): Promise<PracticeGroup>;
  updatePracticeGroup(id: number, updates: Partial<PracticeGroup>): Promise<PracticeGroup | undefined>;
  deletePracticeGroup(id: number): Promise<void>;
  sharePracticeGroup(id: number): Promise<PracticeGroup | undefined>;
  getPracticeGroupByShareId(shareId: string): Promise<PracticeGroup | undefined>;

  // Practice group phrases methods
  addPhraseToPracticeGroup(groupId: number, phraseId: number): Promise<PracticeGroupPhrase>;
  getPhrasesByGroupId(groupId: number): Promise<UserSavedPhrase[]>;
  removePhraseFromGroup(groupId: number, phraseId: number): Promise<void>;

  // Saved words methods
  getSavedWords(userId: string): Promise<SavedWord[]>;
  createSavedWord(word: InsertSavedWord): Promise<SavedWord>;
  deleteSavedWord(userId: string, word: string): Promise<void>;
  updateSavedWord(id: number, updates: Partial<SavedWord>): Promise<SavedWord | undefined>;

  // Word folders methods
  getWordFolders(userId: string): Promise<WordFolder[]>;
  createWordFolder(folder: InsertWordFolder): Promise<WordFolder>;
  updateWordFolder(id: number, userId: string, updates: Partial<WordFolder>): Promise<WordFolder | undefined>;
  deleteWordFolder(id: number, userId: string): Promise<void>;
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
  private practiceGroups: Map<number, PracticeGroup>;
  private practiceGroupPhrases: Map<number, PracticeGroupPhrase>;

  currentSessionId: number;
  currentProfileId: number;
  currentLevelId: number;
  currentExerciseId: number;
  currentUserExerciseId: number;
  currentUserSavedPhraseId: number;
  currentSharedCollectionId: number;
  currentPracticeGroupId: number;
  currentPracticeGroupPhraseId: number;

  constructor() {
    this.users = new Map();
    this.userProfiles = new Map();
    this.readingSessions = new Map();
    this.gameLevels = new Map();
    this.exercises = new Map();
    this.userExercises = new Map();
    this.sharedPhraseCollections = new Map();
    this.userSavedPhrases = new Map();
    this.practiceGroups = new Map();
    this.practiceGroupPhrases = new Map();

    this.currentSessionId = 1;
    this.currentProfileId = 1;
    this.currentLevelId = 1;
    this.currentExerciseId = 1;
    this.currentUserExerciseId = 1;
    this.currentUserSavedPhraseId = 1;
    this.currentSharedCollectionId = 1;
    this.currentPracticeGroupId = 1;
    this.currentPracticeGroupPhraseId = 1;

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

  async getUserById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user || null;
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
  async getUserProfile(userId: string): Promise<UserProfile | undefined> { // Corrected type
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

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | undefined> { // Corrected type
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

  async getUserReadingSessions(userId: string): Promise<ReadingSession[]> { // Corrected type
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
  async getUserExercise(userId: string, exerciseId: number): Promise<UserExercise | undefined> { // Corrected type
    return Array.from(this.userExercises.values()).find(
      (userExercise) => userExercise.userId === userId && userExercise.exerciseId === exerciseId
    );
  }

  async getUserExercisesByLevel(userId: string, levelId: number): Promise<UserExercise[]> { // Corrected type
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
    this.userExercises.set(id, updatedExercise);
    return updatedUserExercise;
  }

  // Shared phrase collections methods
  async createSharedPhraseCollection(collection: InsertSharedPhraseCollection): Promise<SharedPhraseCollection> {
    try {
      console.log('Creating shared phrase collection with data:', {
        shareId: collection.shareId,
        userId: collection.userId ?? null,
        name: collection.name ?? null,
        phrasesCount: Array.isArray(collection.phrases) ? collection.phrases.length : 'not array'
      });

      // Validate the data before insertion
      if (!collection.shareId || !collection.phrases) {
        throw new Error('Invalid shared collection data: missing required fields');
      }

      // Ensure we have proper data structure
      let phrases = collection.phrases;

      // Insert into the database
      const [sharedCollection] = await db
        .insert(sharedPhraseCollections)
        .values({
          shareId: collection.shareId,
          userId: collection.userId ?? null,
          name: collection.name ?? null,
          phrases: phrases
        })
        .returning();

      console.log('Successfully created shared collection:', {
        id: sharedCollection.id,
        shareId: sharedCollection.shareId,
        phrasesCount: Array.isArray(sharedCollection.phrases) ? 
          (sharedCollection.phrases as any[]).length : 
          'unknown format'
      });

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

  // Practice groups methods
  async getPracticeGroups(userId: string): Promise<PracticeGroup[]> {
    return Array.from(this.practiceGroups.values())
      .filter(group => group.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getPracticeGroupById(id: number): Promise<PracticeGroup | undefined> {
    return this.practiceGroups.get(id);
  }

  async createPracticeGroup(group: InsertPracticeGroup): Promise<PracticeGroup> {
    const id = this.currentPracticeGroupId++;
    const newGroup: PracticeGroup = {
      id,
      ...group,
      shareId: null,
      isShared: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.practiceGroups.set(id, newGroup);
    return newGroup;
  }

  async updatePracticeGroup(id: number, updates: Partial<PracticeGroup>): Promise<PracticeGroup | undefined> {
    const group = await this.getPracticeGroupById(id);
    if (!group) return undefined;

    const updatedGroup: PracticeGroup = {
      ...group,
      ...updates,
      updatedAt: new Date()
    };
    this.practiceGroups.set(id, updatedGroup);
    return updatedGroup;
  }

  async deletePracticeGroup(id: number): Promise<void> {
    // First, remove all phrases associated with this group
    const groupPhrases = Array.from(this.practiceGroupPhrases.values())
      .filter(groupPhrase => groupPhrase.groupId === id);

    for (const groupPhrase of groupPhrases) {
      this.practiceGroupPhrases.delete(groupPhrase.id);
    }

    // Then delete the group itself
    this.practiceGroups.delete(id);
  }

  async sharePracticeGroup(id: number): Promise<PracticeGroup | undefined> {
    const group = await this.getPracticeGroupById(id);
    if (!group) return undefined;

    // Generate a unique share ID
    const shareId = `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const updatedGroup = await this.updatePracticeGroup(id, {
      shareId,
      isShared: true
    });

    return updatedGroup;
  }

  async getPracticeGroupByShareId(shareId: string): Promise<PracticeGroup | undefined> {
    return Array.from(this.practiceGroups.values())
      .find(group => group.shareId === shareId);
  }

  // Practice group phrases methods
  async addPhraseToPracticeGroup(groupId: number, phraseId: number): Promise<PracticeGroupPhrase> {
    // Verify that both the group and phrase exist
    const group = await this.getPracticeGroupById(groupId);
    const phrase = await this.getUserSavedPhraseById(phraseId);

    if (!group || !phrase) {
      throw new Error(`Group ID ${groupId} or Phrase ID ${phraseId} not found`);
    }

    // Check if the phrase is already in the group
    const existingLink = Array.from(this.practiceGroupPhrases.values())
      .find(link => link.groupId === groupId && link.phraseId === phraseId);

    if (existingLink) {
      return existingLink; // Already added
    }

    // Add the phrase to the group
    const id = this.currentPracticeGroupPhraseId++;
    const newLink: PracticeGroupPhrase = {
      id,
      groupId,
      phraseId,
      addedAt: new Date()
    };

    this.practiceGroupPhrases.set(id, newLink);

    // Update the group's lastUpdated timestamp
    await this.updatePracticeGroup(groupId, { updatedAt: new Date() });

    return newLink;
  }

  async getPhrasesByGroupId(groupId: number): Promise<UserSavedPhrase[]> {
    // Get all link entries for this group
    const links = Array.from(this.practiceGroupPhrases.values())
      .filter(link => link.groupId === groupId);

    // Get the corresponding phrases
    const phrases: UserSavedPhrase[] = [];
    for (const link of links) {
      const phrase = await this.getUserSavedPhraseById(link.phraseId);
      if (phrase) {
        phrases.push(phrase);
      }
    }

    return phrases;
  }

  async removePhraseFromGroup(groupId: number, phraseId: number): Promise<void> {
    // Find the link to remove
    const linkToRemove = Array.from(this.practiceGroupPhrases.values())
      .find(link => link.groupId === groupId && link.phraseId === phraseId);

    if (linkToRemove) {
      this.practiceGroupPhrases.delete(linkToRemove.id);

      // Update the group's lastUpdated timestamp
      await this.updatePracticeGroup(groupId, { updatedAt: new Date() });
    }
  }
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
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

  // User profile methods
  async getUserProfile(userId: string): Promise<UserProfile | undefined> { // Corrected type
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [newProfile] = await db
      .insert(userProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | undefined> { // Corrected type
    const [updatedProfile] = await db
      .update(userProfiles)
      .set({ ...updates, updatedAt: new Date() }) // Ensure updatedAt is updated
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updatedProfile;
  }

  // Reading session methods
  async createReadingSession(session: InsertReadingSession): Promise<ReadingSession> {
    const [newSession] = await db
      .insert(readingSession)
      .values(session)
      .returning();
    return newSession;
  }

  async getReadingSession(id: number): Promise<ReadingSession | undefined> {
    const [session] = await db.select().from(readingSession).where(eq(readingSession.id, id));
    return session;
  }

  async getUserReadingSessions(userId: string): Promise<ReadingSession[]> { // Corrected type
    return db.select().from(readingSession).where(eq(readingSession.userId, userId));
  }

  // Game level methods
  async getGameLevel(id: number): Promise<GameLevel | undefined> {
    const [level] = await db.select().from(gameLevels).where(eq(gameLevels.id, id));
    return level;
  }

  async getGameLevelByNumber(levelNumber: number): Promise<GameLevel | undefined> {
    const [level] = await db.select().from(gameLevels).where(eq(gameLevels.levelNumber, levelNumber));
    return level;
  }

  async getAllGameLevels(): Promise<GameLevel[]> {
    return db.select().from(gameLevels).orderBy(gameLevels.levelNumber);
  }

  async createGameLevel(level: InsertGameLevel): Promise<GameLevel> {
    const [newLevel] = await db
      .insert(gameLevels)
      .values(level)
      .returning();
    return newLevel;
  }

  // Exercise methods
  async getExercise(id: number): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    return exercise;
  }

  async getExercisesByLevel(levelId: number): Promise<Exercise[]> {
    return db.select().from(exercises).where(eq(exercises.levelId, levelId)).orderBy(exercises.order);
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const [newExercise] = await db
      .insert(exercises)
      .values(exercise)
      .returning();
    return newExercise;
  }

  // User exercise methods
  async getUserExercise(userId: string, exerciseId: number): Promise<UserExercise | undefined> { // Corrected type
    const [userExercise] = await db
      .select()
      .from(userExercises)
      .where(and(eq(userExercises.userId, userId), eq(userExercises.exerciseId, exerciseId)));
    return userExercise;
  }

  async getUserExercisesByLevel(userId: string, levelId: number): Promise<UserExercise[]> { // Corrected type
    // First, get all exercise IDs for this level
    const levelExercises = await db
        .select({ id: exercises.id })
        .from(exercises)
        .where(eq(exercises.levelId, levelId));
    const exerciseIds = levelExercises.map(e => e.id);

    if (exerciseIds.length === 0) {
        return []; // No exercises for this level
    }

    // Then, get user exercises that match these IDs and userId
    return db
        .select()
        .from(userExercises)
        .where(and(
            eq(userExercises.userId, userId),
            inArray(userExercises.exerciseId, exerciseIds)
        ));
  }

  async createUserExercise(userExercise: InsertUserExercise): Promise<UserExercise> {
    const [newUserExercise] = await db
      .insert(userExercises)
      .values(userExercise)
      .returning();
    return newUserExercise;
  }

  async updateUserExercise(id: number, updates: Partial<UserExercise>): Promise<UserExercise | undefined> {
    const [updatedUserExercise] = await db
      .update(userExercises)
      .set({ ...updates, lastAttemptAt: new Date() }) // Ensure lastAttemptAt is updated
      .where(eq(userExercises.id, id))
      .returning();
    return updatedUserExercise;
  }

  // Shared phrase collections methods (these were mostly already using DB)
  async createSharedPhraseCollection(collection: InsertSharedPhraseCollection): Promise<SharedPhraseCollection> {
    try {
      console.log('Creating shared phrase collection with data:', {
        shareId: collection.shareId,
        userId: collection.userId ?? null,
        name: collection.name ?? null,
        phrasesCount: Array.isArray(collection.phrases) ? collection.phrases.length : 'not array'
      });

      // Validate the data before insertion
      if (!collection.shareId || !collection.phrases) {
        throw new Error('Invalid shared collection data: missing required fields');
      }

      // Ensure we have proper data structure
      let phrases = collection.phrases;

      // Insert into the database
      const [sharedCollection] = await db
        .insert(sharedPhraseCollections)
        .values({
          shareId: collection.shareId,
          userId: collection.userId ?? null,
          name: collection.name ?? null,
          phrases: phrases
        })
        .returning();

      console.log('Successfully created shared collection:', {
        id: sharedCollection.id,
        shareId: sharedCollection.shareId,
        phrasesCount: Array.isArray(sharedCollection.phrases) ? 
          (sharedCollection.phrases as any[]).length : 
          'unknown format'
      });

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

  // User saved phrases methods (these were mostly already using DB, but updating MemStorage as well)
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

  // Practice groups methods (these were mostly already using DB)
  async getPracticeGroups(userId: string): Promise<PracticeGroup[]> {
    return db
      .select()
      .from(practiceGroups)
      .where(eq(practiceGroups.userId, userId))
      .orderBy(practiceGroups.createdAt);
  }

  async getPracticeGroupById(id: number): Promise<PracticeGroup | undefined> {
    const [group] = await db
      .select()
      .from(practiceGroups)
      .where(eq(practiceGroups.id, id));
    return group || undefined;
  }

  async createPracticeGroup(group: InsertPracticeGroup): Promise<PracticeGroup> {
    const [newGroup] = await db
      .insert(practiceGroups)
      .values(group)
      .returning();
    return newGroup;
  }

  async updatePracticeGroup(id: number, updates: Partial<PracticeGroup>): Promise<PracticeGroup | undefined> {
    const [group] = await db
      .update(practiceGroups)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(practiceGroups.id, id))
      .returning();
    return group;
  }

  async deletePracticeGroup(id: number): Promise<void> {
    // First delete all phrase associations
    await db
      .delete(practiceGroupPhrases)
      .where(eq(practiceGroupPhrases.groupId, id));

    // Then delete the group
    await db
      .delete(practiceGroups)
      .where(eq(practiceGroups.id, id));
  }

  async sharePracticeGroup(id: number): Promise<PracticeGroup | undefined> {
    const group = await this.getPracticeGroupById(id);
    if (!group) return undefined;

    // Generate a unique share ID
    const shareId = `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const [updatedGroup] = await db
      .update(practiceGroups)
      .set({
        shareId,
        isShared: true,
        updatedAt: new Date()
      })
      .where(eq(practiceGroups.id, id))
      .returning();

    return updatedGroup;
  }

  async getPracticeGroupByShareId(shareId: string): Promise<PracticeGroup | undefined> {
    const [group] = await db
      .select()
      .from(practiceGroups)
      .where(eq(practiceGroups.shareId, shareId));
    return group || undefined;
  }

  // Practice group phrases methods (these were mostly already using DB)
  async addPhraseToPracticeGroup(groupId: number, phraseId: number): Promise<PracticeGroupPhrase> {
    // First check if the phrase is already in the group
    const existingLinks = await db
      .select()
      .from(practiceGroupPhrases)
      .where(and(
        eq(practiceGroupPhrases.groupId, groupId),
        eq(practiceGroupPhrases.phraseId, phraseId)
      ));

    if (existingLinks.length > 0) {
      return existingLinks[0]; // Already exists
    }

    // Update the group's updatedAt timestamp
    await db
      .update(practiceGroups)
      .set({
        updatedAt: new Date()
      })
      .where(eq(practiceGroups.id, groupId));

    // Add the phrase to the group
    const [newLink] = await db
      .insert(practiceGroupPhrases)
      .values({
        groupId,
        phraseId
      })
      .returning();

    return newLink;
  }

  async getPhrasesByGroupId(groupId: number): Promise<UserSavedPhrase[]> {
    // Get all phrases that belong to this group through the link table
    const result = await db
      .select({
        phrase: userSavedPhrases
      })
      .from(practiceGroupPhrases)
      .innerJoin(
        userSavedPhrases,
        eq(practiceGroupPhrases.phraseId, userSavedPhrases.id)
      )
      .where(eq(practiceGroupPhrases.groupId, groupId));

    return result.map(r => r.phrase);
  }

  async removePhraseFromGroup(groupId: number, phraseId: number): Promise<void> {
    // Delete the link
    await db
      .delete(practiceGroupPhrases)
      .where(and(
        eq(practiceGroupPhrases.groupId, groupId),
        eq(practiceGroupPhrases.phraseId, phraseId)
      ));

    // Update the group's updatedAt timestamp
    await db
      .update(practiceGroups)
      .set({
        updatedAt: new Date()
      })
      .where(eq(practiceGroups.id, groupId));
  }

  // Saved words methods
  async getSavedWords(userId: string): Promise<SavedWord[]> {
    return db
      .select()
      .from(savedWords)
      .where(eq(savedWords.userId, userId))
      .orderBy(savedWords.createdAt);
  }

  async createSavedWord(word: InsertSavedWord): Promise<SavedWord> {
    const [newWord] = await db
      .insert(savedWords)
      .values(word)
      .returning();
    return newWord;
  }

  async deleteSavedWord(userId: string, word: string): Promise<void> {
    await db
      .delete(savedWords)
      .where(and(
        eq(savedWords.userId, userId),
        eq(savedWords.word, word)
      ));
  }

  async updateSavedWord(id: number, updates: Partial<SavedWord>): Promise<SavedWord | undefined> {
    const [updatedWord] = await db
      .update(savedWords)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(savedWords.id, id))
      .returning();
    return updatedWord || undefined;
  }

  // Word folders methods
  async getWordFolders(userId: string): Promise<WordFolder[]> {
    return db
      .select()
      .from(wordFolders)
      .where(eq(wordFolders.userId, userId))
      .orderBy(wordFolders.createdAt);
  }

  async createWordFolder(folder: InsertWordFolder): Promise<WordFolder> {
    const [newFolder] = await db
      .insert(wordFolders)
      .values(folder)
      .returning();
    return newFolder;
  }

  async updateWordFolder(id: number, userId: string, updates: Partial<WordFolder>): Promise<WordFolder | undefined> {
    const [updatedFolder] = await db
      .update(wordFolders)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(
        eq(wordFolders.id, id),
        eq(wordFolders.userId, userId)
      ))
      .returning();
    return updatedFolder || undefined;
  }

  async deleteWordFolder(id: number, userId: string): Promise<void> {
    // First remove folder reference from saved words
    await db
      .update(savedWords)
      .set({ folderId: null })
      .where(and(
        eq(savedWords.folderId, id),
        eq(savedWords.userId, userId)
      ));

    // Then delete the folder
    await db
      .delete(wordFolders)
      .where(and(
        eq(wordFolders.id, id),
        eq(wordFolders.userId, userId)
      ));

    // Update the group's updatedAt timestamp
    await db
      .update(practiceGroups)
      .set({
        updatedAt: new Date()
      })
      .where(eq(practiceGroups.id, groupId));
  }
}

// Keep the memory storage for non-authentication related features
const memStorage = new MemStorage();

// Use the database storage for the app
export const storage = new DatabaseStorage();