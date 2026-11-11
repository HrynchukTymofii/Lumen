-- Web funnel v3: "Who are you praying for?", "Do you carry most of it on your own?", "A few quiet minutes a day?"
ALTER TABLE "User" ADD COLUMN "prayingFor" TEXT;
ALTER TABLE "User" ADD COLUMN "carryAlone" TEXT;
ALTER TABLE "User" ADD COLUMN "fewMinutes" TEXT;
