import "server-only";
import mongoose from "mongoose";
import { requireMongoUri } from "@/lib/env/env";

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache = (globalWithMongoose.mongooseCache ??= {
  connection: null,
  promise: null,
});

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.connection) return cache.connection;

  const uri = requireMongoUri();
  cache.promise ??= mongoose.connect(uri, { bufferCommands: false });

  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    throw new Error(
      "Unable to connect to MongoDB. Check MONGODB_URI and database availability.",
      {
        cause: error,
      },
    );
  }
}
