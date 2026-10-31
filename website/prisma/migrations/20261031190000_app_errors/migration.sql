-- CreateTable
CREATE TABLE "AppError" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'error',
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "isFatal" BOOLEAN,
    "page" TEXT,
    "platform" "Platform" NOT NULL,
    "osVersion" TEXT,
    "deviceModel" TEXT,
    "appVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppError_userId_idx" ON "AppError"("userId");

-- CreateIndex
CREATE INDEX "AppError_createdAt_idx" ON "AppError"("createdAt");

-- AddForeignKey
ALTER TABLE "AppError" ADD CONSTRAINT "AppError_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
