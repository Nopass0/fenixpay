import { MongoClient, Db } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const MONGODB_DB = process.env.MONGODB_DB || "chase_emulator";

export async function connectToMongo(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // 5 second timeout
    connectTimeoutMS: 5000,
  });
  await client.connect();
  
  const db = client.db(MONGODB_DB);
  
  cachedClient = client;
  cachedDb = db;
  
  return { client, db };
}

export async function getMongoDb(): Promise<Db> {
  const { db } = await connectToMongo();
  return db;
}

export async function closeMongo(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}