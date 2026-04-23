const express = require('express');
const prisma = require('../prisma/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ## GET USER PROFILE ##
router.get('/profile', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, languagePreference: true }, // Select only safe fields
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user profile.' });
  }
});

// ## UPDATE USER PROFILE ##
router.put('/profile', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const { name } = req.body; // For now, we'll just allow updating the name

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name },
    });
    res.status(200).json({ name: updatedUser.name, email: updatedUser.email });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user profile.' });
  }
});

router.get('/dashboard', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Fetch the 3 most recently processed content items
    const recentContent = await prisma.processedContent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    // Fetch the 3 most recent quiz results
    const recentQuizzes = await prisma.quizResult.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 3,
      include: {
        processedContent: { select: { title: true } },
      },
    });

    res.status(200).json({ recentContent, recentQuizzes });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ error: 'Failed to retrieve dashboard data.' });
  }
});

// ## GET USER STATISTICS ##
router.get('/stats', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Get total counts
    const [totalQuizzes, totalContent, totalGoals, completedTasks] = await Promise.all([
      prisma.quizResult.count({ where: { userId } }),
      prisma.processedContent.count({ where: { userId } }),
      prisma.goal.count({ where: { userId } }),
      prisma.microtask.count({ where: { goal: { userId }, status: 'completed' } })
    ]);

    // Calculate average score
    const quizResults = await prisma.quizResult.findMany({
      where: { userId },
      select: { score: true, totalQuestions: true }
    });

    let averageScore = 0;
    if (quizResults.length > 0) {
      const totalScore = quizResults.reduce((acc, quiz) => 
        acc + ((quiz.score / quiz.totalQuestions) * 100), 0
      );
      averageScore = totalScore / quizResults.length;
    }

    // Calculate total time spent from microtasks
    const microtasks = await prisma.microtask.findMany({
      where: { goal: { userId }, status: 'completed' },
      select: { timeSpent: true }
    });

    const totalTimeSpent = microtasks.reduce((acc, task) => 
      acc + (task.timeSpent || 0), 0
    );

    // Get recent activity
    const recentQuizzes = await prisma.quizResult.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 5,
      include: {
        processedContent: { select: { title: true } },
      },
    });

    const recentContent = await prisma.processedContent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, type: true, createdAt: true },
    });

    const stats = {
      totalQuizzes,
      averageScore,
      totalContent,
      completedTasks,
      totalGoals,
      totalTimeSpent,
      recentActivity: {
        quizzes: recentQuizzes,
        content: recentContent,
      },
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    res.status(500).json({ error: 'Failed to retrieve user statistics.' });
  }
});

module.exports = router;