import "server-only";
import mongoose from "mongoose";
import { environment, requireMongoUri } from "@/lib/env/env";
import { AppError } from "@/lib/http/app-error";

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
  cache.promise ??= mongoose.connect(uri, {
    dbName: environment.MONGODB_DB_NAME,
    bufferCommands: false,
    serverSelectionTimeoutMS: 8_000,
    connectTimeoutMS: 8_000,
  });
  const connectionAttempt = cache.promise;
  connectionAttempt.then(
    (connection) => {
      cache.connection = connection;
    },
    () => {
      if (cache.promise === connectionAttempt) cache.promise = null;
    },
  );
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("MongoDB connection timed out.")),
      8_000,
    );
  });

  try {
    cache.connection = await Promise.race([connectionAttempt, timeout]);
    return cache.connection;
  } catch (error) {
    if (cache.promise === connectionAttempt) cache.promise = null;
    throw new AppError(
      "Unable to connect to MongoDB. Check MONGODB_URI and database availability.",
      "DATABASE_UNAVAILABLE",
      503,
      { cause: error },
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
