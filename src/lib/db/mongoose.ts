import "server-only";
import mongoose from "mongoose";
import { environment, requireMongoUri } from "@/lib/env/env";
import { AppError } from "@/lib/http/app-error";
import { logger } from "@/lib/logger";

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
  if (cache.connection?.connection.readyState === 1) return cache.connection;
  if (cache.connection) cache.connection = null;
  if (mongoose.connection.readyState === 0) cache.promise = null;

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
  const timeoutError = new Error("MongoDB connection timed out.");
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(timeoutError),
      8_000,
    );
  });

  try {
    const connection = await Promise.race([connectionAttempt, timeout]);
    if (connection.connection.readyState !== 1) {
      throw new Error("MongoDB connection is not ready.");
    }
    cache.connection = connection;
    return cache.connection;
  } catch (error) {
    cache.connection = null;
    const errorRecord = typeof error === "object" && error !== null
      ? error as { name?: unknown; code?: unknown; cause?: unknown }
      : null;
    const causeRecord = typeof errorRecord?.cause === "object" && errorRecord.cause !== null
      ? errorRecord.cause as { name?: unknown; code?: unknown }
      : null;
    const errorName = typeof errorRecord?.name === "string" ? errorRecord.name : typeof error;
    const errorCode = typeof errorRecord?.code === "string" || typeof errorRecord?.code === "number"
      ? ` code=${errorRecord.code}`
      : "";
    const causeName = typeof causeRecord?.name === "string" ? ` cause=${causeRecord.name}` : "";
    const causeCode = typeof causeRecord?.code === "string" || typeof causeRecord?.code === "number"
      ? ` causeCode=${causeRecord.code}`
      : "";
    logger.error(`MongoDB connection unavailable (${errorName}${errorCode}${causeName}${causeCode}).`);
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
