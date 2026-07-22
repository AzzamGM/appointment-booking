CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "country" TEXT,
    "city" TEXT,
    "language" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Visit_createdAt_idx" ON "Visit"("createdAt");
CREATE INDEX "Visit_country_createdAt_idx" ON "Visit"("country", "createdAt");
CREATE INDEX "Visit_sessionId_idx" ON "Visit"("sessionId");

ALTER TABLE "Visit" ADD CONSTRAINT "Visit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
