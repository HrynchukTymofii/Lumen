-- New accounts read the KJV unless they pick another translation
ALTER TABLE "User" ALTER COLUMN "translation" SET DEFAULT 'KJV';
