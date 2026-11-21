import nextEnv from "@next/env";
import mongoose from "mongoose";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const uri = process.env.MONGODB_URI?.trim();
const databaseName = process.env.MONGODB_DB_NAME?.trim() || "mmm-db";

if (!uri || (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://"))) {
  console.error("MONGODB_URI is missing or invalid. The URI value was not printed.");
  process.exit(1);
}

const indexes = {
  shared_rsvp_links: [[{ tokenHash: 1 }, { unique: true }], [{ expiresAt: 1 }, { expireAfterSeconds: 0 }]],
  users: [[{ normalizedEmail: 1 }, { unique: true }]],
  user_sessions: [
    [{ sessionTokenHash: 1 }, { unique: true }],
    [{ expiresAt: 1 }, { expireAfterSeconds: 0 }],
  ],
  email_verification_tokens: [
    [{ tokenHash: 1 }, { unique: true }],
    [{ expiresAt: 1 }, { expireAfterSeconds: 0 }],
  ],
  password_reset_tokens: [
    [{ tokenHash: 1 }, { unique: true }],
    [{ expiresAt: 1 }, { expireAfterSeconds: 0 }],
  ],
  auth_rate_limits: [
    [{ keyHash: 1 }, { unique: true }],
    [{ expiresAt: 1 }, { expireAfterSeconds: 0 }],
  ],
  weddings: [
    [{ ownerUserId: 1, createdAt: -1 }, {}],
    [{ slug: 1 }, { unique: true }],
  ],
  wedding_settings: [[{ weddingId: 1 }, { unique: true }]],
  wedding_memberships: [
    [{ weddingId: 1, userId: 1 }, { unique: true }],
    [{ userId: 1, joinedAt: -1 }, {}],
  ],
  wedding_invitations: [
    [{ tokenHash: 1 }, { unique: true }],
    [{ weddingId: 1, normalizedEmail: 1, acceptedAt: 1, revokedAt: 1 }, {}],
    [{ weddingId: 1, createdAt: -1 }, {}],
    [{ expiresAt: 1 }, {}],
    [{ activeInvitationKey: 1 }, { unique: true, sparse: true }],
  ],
  events: [
    [{ weddingId: 1, startDate: 1 }, {}],
    [{ weddingId: 1, status: 1, startDate: 1 }, {}],
    [{ "venue.location": "2dsphere" }, {}],
  ],
  guests: [
    [{ weddingId: 1, householdKey: 1 }, { unique: true, partialFilterExpression: { householdKey: { $type: "string" } } }],
    [{ rsvpTokenHash: 1 }, { unique: true, partialFilterExpression: { rsvpTokenHash: { $type: "string" } } }],
    [{ weddingId: 1, createdAt: -1 }, {}],
    [{ invitationTokenHash: 1 }, { unique: true }],
    [{ weddingId: 1, normalizedEmail: 1 }, { unique: true, partialFilterExpression: { normalizedEmail: { $type: "string" } } }],
  ],
  guest_events: [[{ weddingId: 1, guestId: 1, eventId: 1 }, { unique: true }]],
  rsvps: [
    [{ weddingId: 1, guestId: 1, eventId: 1 }, { unique: true }],
    [{ weddingId: 1, eventId: 1, status: 1 }, {}],
  ],
  tasks: [
    [{ weddingId: 1, status: 1, dueDate: 1 }, {}],
    [{ weddingId: 1, assignedUserId: 1, dueDate: 1 }, {}],
    [{ weddingId: 1, eventId: 1, dueDate: 1 }, {}],
  ],
  expenses: [[{ weddingId: 1, expenseDate: -1 }, {}]],
  vendors: [[{ weddingId: 1, category: 1, name: 1 }, {}]],
  albums: [[{ weddingId: 1, createdAt: -1 }, {}]],
  photos: [
    [{ weddingId: 1, albumId: 1, createdAt: -1 }, {}],
    [{ objectKey: 1 }, { unique: true }],
  ],
  email_logs: [[{ idempotencyKey: 1 }, { unique: true }]],
  activity_logs: [[{ weddingId: 1, createdAt: -1 }, {}]],
};

try {
  await mongoose.connect(uri, {
    dbName: databaseName,
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
  });

  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB connection did not expose a database handle.");

  for (const collectionName of Object.keys(indexes)) {
    const existing = await database
      .listCollections({ name: collectionName }, { nameOnly: true })
      .hasNext();
    if (!existing) await database.createCollection(collectionName);

    for (const [keys, options] of indexes[collectionName]) {
      await database.collection(collectionName).createIndex(keys, options);
    }
  }

  await database.admin().ping();
  console.log(`Initialized ${databaseName}: ${Object.keys(indexes).length} collections and documented indexes.`);
  console.log("No sample users or wedding records were inserted.");
} catch (error) {
  console.error(`Database initialization failed (${error?.name || "Error"}). URI and details were suppressed.`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
