const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/authMiddleware');
const MicrotaskService = require('../services/microtaskService');
const EmailService = require('../services/emailService');

const prisma = new PrismaClient();
const microtaskService = new MicrotaskService();
const emailService = new EmailService();

// AI-powered function to generate realistic task completion results
function generateTaskResults(task) {
    const difficulty = task.difficulty || 'medium';
    const category = task.category || 'General';
    const timeEstimate = task.timeEstimate || '30-45 mins';
    
    // Extract base time from estimate (e.g., "30-45 mins" -> average 37.5)
    const timeMatch = timeEstimate.match(/(\d+)[-–]?(\d+)?\s*(min|hour|hr)/i);
    let baseTime = 30; // default
    if (timeMatch) {
        const min1 = parseInt(timeMatch[1]);
        const min2 = timeMatch[2] ? parseInt(timeMatch[2]) : min1;
        baseTime = (min1 + min2) / 2;
        if (timeMatch[3].toLowerCase().includes('hour') || timeMatch[3].toLowerCase().includes('hr')) {
            baseTime *= 60; // convert hours to minutes
        }
    }
    
    // Generate realistic score based on difficulty and category
    let baseScore;
    switch (difficulty.toLowerCase()) {
        case 'easy':
            baseScore = 75 + Math.random() * 20; // 75-95%
            break;
        case 'hard':
            baseScore = 50 + Math.random() * 30; // 50-80%
            break;
        default: // medium
            baseScore = 60 + Math.random() * 25; // 60-85%
    }
    
    // Adjust score based on category (some subjects are typically harder)
    const categoryMultipliers = {
        'Mathematics': 0.9,
        'Physics': 0.85,
        'Chemistry': 0.87,
        'English': 0.95,
        'General Ability': 0.92,
        'General Knowledge': 0.94,
        'Mock Test': 0.8
    };
    
    const multiplier = categoryMultipliers[category] || 0.9;
    const finalScore = Math.round(Math.max(35, Math.min(95, baseScore * multiplier)));
    
    // Generate realistic time spent (±20% of estimate)
    const timeVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2 multiplier
    const actualTime = Math.round(baseTime * timeVariation);
    
    return {
        score: finalScore,
        timeSpent: actualTime,
        explanation: `Generated based on ${difficulty} difficulty and ${category} category performance patterns`
    };
}

// Create a new goal with AI-generated microtasks
router.post('/goals', authMiddleware, async (req, res) => {
    try {
        const { title, description, timeframe, difficulty } = req.body;
        const userId = req.user.id;

        console.log(`Creating goal for user ${userId}: ${title}`);

        // Generate microtasks using AI (always NDA)
        const aiGeneratedPlan = await microtaskService.generateMicrotasks(
            title, 
            timeframe || 'weekly', 
            difficulty || 'medium', 
            'NDA',
            description
        );

        // Save goal to database
        const goal = await prisma.goal.create({
            data: {
                title: title,
                description: description || aiGeneratedPlan.goal,
                examType: 'NDA',
                timeframe: timeframe || 'weekly',
                difficulty: difficulty || 'medium',
                userId: userId,
                microtasks: {
                    create: aiGeneratedPlan.microtasks.map(task => ({
                        title: task.title,
                        description: task.description,
                        category: task.category,
                        difficulty: task.difficulty,
                        timeEstimate: task.timeEstimate,
                        questions: task.questions || [],
                        resources: task.resources || [],
                        milestone: task.milestone
                    }))
                }
            },
            include: {
                microtasks: true
            }
        });

        res.json({
            success: true,
            goal: goal,
            aiPlan: aiGeneratedPlan,
            message: 'Goal created successfully with AI-generated microtasks'
        });

    } catch (error) {
        console.error('Goal creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create goal',
            message: error.message
        });
    }
});

// Get all goals for a user
router.get('/goals', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, timeframe } = req.query;

        const whereClause = {
            userId: userId,
            ...(status && { status }),
            ...(timeframe && { timeframe })
        };

        const goals = await prisma.goal.findMany({
            where: whereClause,
            include: {
                microtasks: {
                    orderBy: { createdAt: 'asc' }
                },
                weeklyReports: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate progress for each goal
        const goalsWithProgress = goals.map(goal => {
            const totalTasks = goal.microtasks.length;
            const completedTasks = goal.microtasks.filter(task => task.status === 'completed').length;
            const completedWithScore = goal.microtasks.filter(task => task.score !== null && task.score > 0);
            const averageScore = completedWithScore.length > 0 
                ? completedWithScore.reduce((sum, task) => sum + (task.score || 0), 0) / completedWithScore.length
                : 0;

            return {
                ...goal,
                progress: {
                    totalTasks,
                    completedTasks,
                    completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
                    averageScore: averageScore || 0
                }
            };
        });

        res.json({
            success: true,
            goals: goalsWithProgress
        });

    } catch (error) {
        console.error('Goals fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch goals',
            message: error.message
        });
    }
});

// Get specific goal with detailed microtasks
router.get('/goals/:goalId', authMiddleware, async (req, res) => {
    try {
        const { goalId } = req.params;
        const userId = req.user.id;

        const goal = await prisma.goal.findFirst({
            where: {
                id: goalId,
                userId: userId
            },
            include: {
                microtasks: {
                    include: {
                        progressLogs: {
                            orderBy: { timestamp: 'desc' }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!goal) {
            return res.status(404).json({
                success: false,
                error: 'Goal not found'
            });
        }

        res.json({
            success: true,
            goal: goal
        });

    } catch (error) {
        console.error('Goal fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch goal',
            message: error.message
        });
    }
});

// Start a microtask
router.post('/microtasks/:taskId/start', authMiddleware, async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.id;

        // Update microtask status
        const microtask = await prisma.microtask.update({
            where: { id: taskId },
            data: { status: 'in-progress' }
        });

        // Log the action
        await prisma.progressLog.create({
            data: {
                action: 'started',
                microtaskId: taskId,
                userId: userId
            }
        });

        res.json({
            success: true,
            microtask: microtask,
            message: 'Microtask started successfully'
        });

    } catch (error) {
        console.error('Microtask start error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start microtask',
            message: error.message
        });
    }
});

// Complete a microtask with AI-generated score and time
router.post('/microtasks/:taskId/complete', authMiddleware, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { notes } = req.body;
        const userId = req.user.id;

        // Get the microtask details first
        const currentTask = await prisma.microtask.findUnique({
            where: { id: taskId },
            include: { goal: true }
        });

        if (!currentTask) {
            return res.status(404).json({
                success: false,
                error: 'Microtask not found'
            });
        }

        // Auto-generate realistic score and time using AI logic
        const autoGeneratedResults = generateTaskResults(currentTask);

        // Update microtask
        const microtask = await prisma.microtask.update({
            where: { id: taskId },
            data: {
                status: 'completed',
                score: autoGeneratedResults.score,
                timeSpent: autoGeneratedResults.timeSpent,
                completedAt: new Date()
            },
            include: {
                goal: true
            }
        });

        // Log the completion
        await prisma.progressLog.create({
            data: {
                action: 'completed',
                score: autoGeneratedResults.score,
                timeSpent: autoGeneratedResults.timeSpent,
                notes: notes || `Auto-completed with ${autoGeneratedResults.score}% score`,
                microtaskId: taskId,
                userId: userId
            }
        });

        res.json({
            success: true,
            microtask: microtask,
            autoGenerated: autoGeneratedResults,
            message: `Microtask completed successfully! AI generated: ${autoGeneratedResults.score}% score in ${autoGeneratedResults.timeSpent} minutes`
        });

    } catch (error) {
        console.error('Microtask completion error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete microtask',
            message: error.message
        });
    }
});

// Generate additional questions for a category
router.post('/questions/generate', authMiddleware, async (req, res) => {
    try {
        const { category, difficulty, count } = req.body;

        const questions = await microtaskService.generateQuestions(
            category || 'Mathematics',
            difficulty || 'medium',
            count || 5,
            'NDA'
        );

        res.json({
            success: true,
            questions: questions
        });

    } catch (error) {
        console.error('Question generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate questions',
            message: error.message
        });
    }
});

// Get progress analytics
router.get('/analytics', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { timeframe, goalId } = req.query;

        // Base query
        let whereClause = { userId: userId };
        if (goalId) {
            whereClause.goalId = goalId;
        }

        // Get microtasks data
        const microtasks = await prisma.microtask.findMany({
            where: {
                goal: {
                    userId: userId,
                    ...(goalId && { id: goalId })
                }
            },
            include: {
                goal: true,
                progressLogs: true
            }
        });

        // Calculate analytics
        const analytics = {
            totalTasks: microtasks.length,
            completedTasks: microtasks.filter(t => t.status === 'completed').length,
            pendingTasks: microtasks.filter(t => t.status === 'pending').length,
            inProgressTasks: microtasks.filter(t => t.status === 'in-progress').length,
            averageScore: 0,
            totalTimeSpent: 0,
            categoryBreakdown: {},
            dailyProgress: [],
            weeklyTrends: []
        };

        // Calculate average score and time
        const completedWithScore = microtasks.filter(t => t.score !== null);
        if (completedWithScore.length > 0) {
            analytics.averageScore = completedWithScore.reduce((sum, t) => sum + t.score, 0) / completedWithScore.length;
        }

        analytics.totalTimeSpent = microtasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0);

        // Category breakdown
        microtasks.forEach(task => {
            const category = task.category || 'General';
            if (!analytics.categoryBreakdown[category]) {
                analytics.categoryBreakdown[category] = {
                    total: 0,
                    completed: 0,
                    averageScore: 0,
                    totalTime: 0
                };
            }
            
            const cat = analytics.categoryBreakdown[task.category];
            cat.total++;
            if (task.status === 'completed') {
                cat.completed++;
                cat.averageScore += task.score || 0;
                cat.totalTime += task.timeSpent || 0;
            }
        });

        // Calculate averages for categories
        Object.keys(analytics.categoryBreakdown).forEach(category => {
            const cat = analytics.categoryBreakdown[category];
            if (cat.completed > 0) {
                cat.averageScore = cat.averageScore / cat.completed;
            }
        });

        res.json({
            success: true,
            analytics: analytics
        });

    } catch (error) {
        console.error('Analytics fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics',
            message: error.message
        });
    }
});

// Generate and send weekly report
router.post('/reports/weekly/:goalId', authMiddleware, async (req, res) => {
    try {
        const { goalId } = req.params;
        const userId = req.user.id;

        // Get user and goal data
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: userId },
            include: { microtasks: true }
        });

        if (!goal) {
            return res.status(404).json({
                success: false,
                error: 'Goal not found'
            });
        }

        // Calculate week data
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week

        const completedTasks = goal.microtasks.filter(t => t.status === 'completed');
        const weekData = {
            tasksCompleted: completedTasks.length,
            totalTasks: goal.microtasks.length,
            averageScore: completedTasks.length > 0 
                ? completedTasks.reduce((sum, t) => sum + (t.score || 0), 0) / completedTasks.length 
                : 0,
            totalTime: completedTasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0) / 60, // Convert to hours
            strongAreas: ['Mathematics', 'General Knowledge'], // This should be calculated from actual data
            weakAreas: ['English'], // This should be calculated from actual data
            goalsAchieved: completedTasks.length,
            totalGoals: goal.microtasks.length
        };

        // Generate AI report
        const reportData = await microtaskService.generateWeeklyReport(userId, weekData);

        // Save report to database
        const weeklyReport = await prisma.weeklyReport.create({
            data: {
                weekStartDate: weekStart,
                weekEndDate: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
                tasksCompleted: weekData.tasksCompleted,
                totalTasks: weekData.totalTasks,
                averageScore: weekData.averageScore,
                totalTimeSpent: weekData.totalTime * 60, // Convert back to minutes
                strongAreas: weekData.strongAreas,
                weakAreas: weekData.weakAreas,
                reportText: reportData.reportText,
                recommendations: reportData.recommendations,
                goalId: goalId,
                userId: userId
            }
        });

        // Send email if user email is available
        if (user.email) {
            const emailResult = await emailService.sendWeeklyReport(
                user.email,
                user.name || 'NDA Aspirant',
                reportData
            );

            if (emailResult.success) {
                await prisma.weeklyReport.update({
                    where: { id: weeklyReport.id },
                    data: {
                        emailSent: true,
                        emailSentAt: new Date()
                    }
                });
            }
        }

        res.json({
            success: true,
            report: weeklyReport,
            reportData: reportData,
            message: 'Weekly report generated and sent successfully'
        });

    } catch (error) {
        console.error('Weekly report error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate weekly report',
            message: error.message
        });
    }
});

// Test email configuration
router.get('/test-email', authMiddleware, async (req, res) => {
    try {
        const result = await emailService.testEmailConfiguration();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Email test failed',
            message: error.message
        });
    }
});

module.exports = router;