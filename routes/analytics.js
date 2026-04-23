const express = require('express');
const prisma = require('../prisma/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ## SAVE A NEW QUIZ RESULT ##
router.post('/save-quiz-result', authMiddleware, async (req, res) => {
  const { contentId, score, totalQuestions } = req.body;
  const userId = req.user.userId;

  if (contentId === undefined || score === undefined || totalQuestions === undefined) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const newResult = await prisma.quizResult.create({
      data: {
        score,
        totalQuestions,
        userId,
        contentId,
      },
    });
    res.status(201).json(newResult);
  } catch (error) {
    console.error("Error saving quiz result:", error);
    res.status(500).json({ error: 'Failed to save quiz result.' });
  }
});

// ## GET ALL QUIZ RESULTS FOR THE LOGGED-IN USER ##
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const results = await prisma.quizResult.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' }, // Show most recent first
      include: {
        processedContent: { // Include the title of the content for context
          select: {
            title: true,
          },
        },
      },
    });
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: 'Failed to retrieve analytics data.' });
  }
});

module.exports = router;