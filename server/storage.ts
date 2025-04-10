import { users, type User, type InsertUser, type ReadingSession, type InsertReadingSession } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Reading session methods
  createReadingSession(session: InsertReadingSession): Promise<ReadingSession>;
  getReadingSession(id: number): Promise<ReadingSession | undefined>;
  getUserReadingSessions(userId: number): Promise<ReadingSession[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private readingSessions: Map<number, ReadingSession>;
  currentId: number;
  currentSessionId: number;

  constructor() {
    this.users = new Map();
    this.readingSessions = new Map();
    this.currentId = 1;
    this.currentSessionId = 1;
  }

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
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createReadingSession(insertSession: InsertReadingSession): Promise<ReadingSession> {
    const id = this.currentSessionId++;
    const session: ReadingSession = { 
      ...insertSession, 
      id,
      createdAt: new Date()
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
}

export const storage = new MemStorage();
