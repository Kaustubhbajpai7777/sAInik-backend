-- CreateTable
CREATE TABLE "public"."QuizResult" (
    "id" SERIAL NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "contentId" INTEGER NOT NULL,

    CONSTRAINT "QuizResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."QuizResult" ADD CONSTRAINT "QuizResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuizResult" ADD CONSTRAINT "QuizResult_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "public"."ProcessedContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
