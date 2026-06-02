import { MongoClient, Db, Collection } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export interface ReelsyUser {
  _id?: string;
  userEmail: string;
  emailPassword?: string; // Hashed password (optional for OAuth users)
  username: string;
  displayName: string;
  profileImage?: string; // URL to image or avatar selected
  age?: number;
  interests?: string[]; // Personalization data
  supabaseId?: string; // Supabase auth user ID (for Google OAuth)
  authProvider?: 'email' | 'google'; // Authentication method
  tier?: 'free' | 'premium' | 'premium+' | 'gold' | 'verified';
  // Suspension & Security
  isSuspended?: boolean;
  suspensionReason?: string;
  suspensionDetails?: string; // Full explanation for user
  suspendedAt?: Date;
  strikeCount?: number; // Track suspicious activities (3 strikes = ban)
  strikes?: Array<{ type: string; timestamp: Date; details: string }>; // Strike log
  // Ban information (via Supabase Admin API)
  isBanned?: boolean; // Explicitly banned by admin
  banReason?: string; // Why they were banned
  bannedAt?: Date; // When they were banned
  bannedUntil?: Date; // When ban expires (null = permanent)
  createdAt: Date;
  updatedAt: Date;
}

export async function connectMongoDB(): Promise<Db> {
  if (db) {
    return db;
  }

  const mongoUri = process.env.MONGODB_URI;
  const mongoDb = process.env.MONGODB_DB;

  if (!mongoUri || !mongoDb) {
    throw new Error('MONGODB_URI and MONGODB_DB environment variables must be set');
  }

  try {
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db(mongoDb);
    console.log('Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function getMongoDBCollection(collectionName: string): Promise<Collection> {
  const database = await connectMongoDB();
  return database.collection(collectionName);
}

export async function getUsersCollection(): Promise<Collection<ReelsyUser>> {
  return getMongoDBCollection('users') as unknown as Promise<Collection<ReelsyUser>>;
}

export async function disconnectMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('Disconnected from MongoDB');
  }
}
