const { GoogleGenerativeAI } = require("@google/generative-ai");
const { v4: uuidv4 } = require('uuid');

class MicrotaskService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.cache = new Map();
        this.cacheExpiry = 60 * 60 * 1000; // 1 hour cache
    }

    async generateMicrotasks(goalTitle, timeframe = 'weekly', difficulty = 'medium', examType = 'NDA', description = '') {
        try {
            console.log(`🧠 Using Gemini AI for generating ${timeframe} microtasks for goal: ${goalTitle}`);
            
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            
            const prompt = `Break down this NDA (National Defence Academy) preparation goal into ${timeframe} microtasks:

GOAL TITLE: "${goalTitle}"
DESCRIPTION: "${description}"
CONTEXT: This is for ${examType} exam preparation focusing on ${difficulty} level tasks.

Requirements:
1. Create exactly 7 specific, actionable microtasks for ${timeframe} planning
2. Each task should be completable in ${timeframe === 'daily' ? '30-60 minutes' : '2-4 hours'}
3. Include time estimates and difficulty levels
4. Focus on NDA exam preparation (Mathematics, General Ability, English)
5. Make tasks progressive (building on each other)
6. Include practice questions, theory review, and mock tests
7. Add motivational elements and milestones

Format as JSON:
{
  "goal": "original goal",
  "timeframe": "${timeframe}",
  "examType": "NDA",
  "totalDuration": "estimated completion time",
  "difficulty": "${difficulty}",
  "microtasks": [
    {
      "id": "unique_id",
      "title": "Task Title",
      "description": "Detailed description",
      "timeEstimate": "30-45 mins",
      "difficulty": "easy/medium/hard",
      "category": "Mathematics/General Ability/English/Mock Test",
      "questions": [
        {
          "question": "Sample question text",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "A",
          "explanation": "Why this is correct"
        }
      ],
      "resources": ["suggested study materials"],
      "milestone": "what you'll achieve"
    }
  ],
  "weeklyGoals": ["list of weekly objectives"],
  "motivationalTips": ["encouraging messages"],
  "assessmentCriteria": "how to measure success"
}

Make it comprehensive, practical, and motivating for NDA aspirants.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            
            try {
                // Clean the response and parse JSON
                const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
                const microtasksPlan = JSON.parse(cleanedResponse);
                
                // Add metadata
                microtasksPlan.id = uuidv4();
                microtasksPlan.createdAt = new Date().toISOString();
                microtasksPlan.status = 'active';
                
                // Ensure each microtask has an ID
                microtasksPlan.microtasks = microtasksPlan.microtasks.map((task, index) => ({
                    ...task,
                    id: task.id || `task_${microtasksPlan.id}_${index}`,
                    status: 'pending',
                    completedAt: null,
                    score: null,
                    timeSpent: null
                }));
                
                return microtasksPlan;
                
            } catch (parseError) {
                console.error('JSON parsing error:', parseError);
                return this.getFallbackMicrotasks(goalTitle, timeframe, examType, description);
            }
            
        } catch (error) {
            console.error('Microtask generation error:', error);
            return this.getFallbackMicrotasks(goalTitle, timeframe, examType, description);
        }
    }

    getFallbackMicrotasks(goalTitle, timeframe, examType, description = '') {
        const baseId = uuidv4();
        return {
            id: baseId,
            goal: goalTitle,
            description: description,
            timeframe: timeframe,
            examType: examType,
            totalDuration: timeframe === 'daily' ? '4-6 hours/week' : '8-12 hours/week',
            difficulty: 'medium',
            createdAt: new Date().toISOString(),
            status: 'active',
            microtasks: [
                {
                    id: `${baseId}_1`,
                    title: `${goalTitle.includes('math') || goalTitle.includes('Math') ? goalTitle : examType + ' Mathematics Practice Session'}`,
                    description: description || 'Solve arithmetic and algebraic problems focusing on speed and accuracy',
                    timeEstimate: timeframe === 'daily' ? '30-45 mins' : '2-3 hours',
                    difficulty: 'medium',
                    category: 'Mathematics',
                    questions: [
                        {
                            question: 'If 3x + 7 = 22, what is the value of x?',
                            options: ['3', '5', '7', '9'],
                            correctAnswer: '5',
                            explanation: '3x = 22 - 7 = 15, so x = 15/3 = 5'
                        }
                    ],
                    resources: ['NCERT Mathematics Class 12', 'Previous Year Questions'],
                    milestone: 'Master basic algebraic operations',
                    status: 'pending',
                    completedAt: null,
                    score: null,
                    timeSpent: null
                },
                {
                    id: `${baseId}_2`,
                    title: `${examType} General Knowledge Review`,
                    description: 'Study current affairs and general knowledge topics',
                    timeEstimate: timeframe === 'daily' ? '30-45 mins' : '2-3 hours',
                    difficulty: 'medium',
                    category: 'General Ability',
                    questions: [
                        {
                            question: 'Who is the current Chief of Defence Staff of India?',
                            options: ['General Bipin Rawat', 'General Anil Chauhan', 'Admiral Karambir Singh', 'Air Marshal RKS Bhadauria'],
                            correctAnswer: 'General Anil Chauhan',
                            explanation: 'General Anil Chauhan is the current Chief of Defence Staff of India'
                        }
                    ],
                    resources: ['Current Affairs Monthly Magazine', 'India Year Book'],
                    milestone: 'Stay updated with defense and current affairs',
                    status: 'pending',
                    completedAt: null,
                    score: null,
                    timeSpent: null
                },
                {
                    id: `${baseId}_3`,
                    title: 'English Comprehension Practice',
                    description: 'Practice reading comprehension and vocabulary building',
                    timeEstimate: timeframe === 'daily' ? '30-45 mins' : '2-3 hours',
                    difficulty: 'medium',
                    category: 'English',
                    questions: [
                        {
                            question: 'Choose the synonym of "Valor"',
                            options: ['Cowardice', 'Bravery', 'Fear', 'Weakness'],
                            correctAnswer: 'Bravery',
                            explanation: 'Valor means great courage in the face of danger, especially in battle'
                        }
                    ],
                    resources: ['Wren & Martin Grammar', 'Word Power Made Easy'],
                    milestone: 'Improve vocabulary and comprehension skills',
                    status: 'pending',
                    completedAt: null,
                    score: null,
                    timeSpent: null
                },
                {
                    id: `${baseId}_4`,
                    title: 'Physics Problem Solving',
                    description: 'Focus on mechanics, optics, and thermodynamics problems',
                    timeEstimate: timeframe === 'daily' ? '30-45 mins' : '2-3 hours',
                    difficulty: 'medium',
                    category: 'Mathematics',
                    questions: [
                        {
                            question: 'A ball is thrown upward with velocity 20 m/s. What is its maximum height? (g = 10 m/s²)',
                            options: ['10 m', '20 m', '30 m', '40 m'],
                            correctAnswer: '20 m',
                            explanation: 'Using v² = u² - 2gh, at max height v=0, so h = u²/2g = 400/20 = 20m'
                        }
                    ],
                    resources: ['HC Verma Physics', 'NCERT Physics Class 11-12'],
                    milestone: 'Master fundamental physics concepts',
                    status: 'pending',
                    completedAt: null,
                    score: null,
                    timeSpent: null
                },
                {
                    id: `${baseId}_5`,
                    title: 'History & Geography Review',
                    description: 'Study Indian history and world geography essentials',
                    timeEstimate: timeframe === 'daily' ? '30-45 mins' : '2-3 hours',
                    difficulty: 'medium',
                    category: 'General Ability',
                    questions: [
                        {
                            question: 'The Battle of Plassey was fought in which year?',
                            options: ['1757', '1764', '1761', '1772'],
                            correctAnswer: '1757',
                            explanation: 'The Battle of Plassey was fought on 23 June 1757 between the British East India Company and the Nawab of Bengal'
                        }
                    ],
                    resources: ['NCERT History Class 6-12', 'Atlas for Geography'],
                    milestone: 'Build strong foundation in history and geography',
                    status: 'pending',
                    completedAt: null,
                    score: null,
                    timeSpent: null
                },
                {
                    id: `${baseId}_6`,
                    title: 'Chemistry Fundamentals',
                    description: 'Focus on organic, inorganic, and physical chemistry basics',
                    timeEstimate: timeframe === 'daily' ? '30-45 mins' : '2-3 hours',
                    difficulty: 'medium',
                    category: 'Mathematics',
                    questions: [
                        {
                            question: 'What is the molecular formula of methane?',
                            options: ['CH₄', 'C₂H₆', 'C₃H₈', 'C₄H₁₀'],
                            correctAnswer: 'CH₄',
                            explanation: 'Methane is the simplest alkane with one carbon atom bonded to four hydrogen atoms'
                        }
                    ],
                    resources: ['NCERT Chemistry Class 11-12', 'OP Tandon Chemistry'],
                    milestone: 'Understand basic chemical concepts and reactions',
                    status: 'pending',
                    completedAt: null,
                    score: null,
                    timeSpent: null
                },
                {
                    id: `${baseId}_7`,
                    title: 'Mock Test & Analysis',
                    description: 'Take a full-length practice test and analyze performance',
                    timeEstimate: timeframe === 'daily' ? '45-60 mins' : '3-4 hours',
                    difficulty: 'hard',
                    category: 'Mock Test',
                    questions: [
                        {
                            question: 'Time management tip: How much time should you spend per question in NDA exam?',
                            options: ['1 minute', '1.5 minutes', '2 minutes', '2.5 minutes'],
                            correctAnswer: '1.5 minutes',
                            explanation: 'With 120 questions in 150 minutes, ideally spend 1-1.5 minutes per question'
                        }
                    ],
                    resources: ['Previous Year Papers', 'Mock Test Series'],
                    milestone: 'Develop exam strategy and time management',
                    status: 'pending',
                    completedAt: null,
                    score: null,
                    timeSpent: null
                }
            ],
            weeklyGoals: [`Complete all ${timeframe} microtasks`, 'Achieve 80%+ accuracy', 'Maintain consistent study schedule'],
            motivationalTips: ['Consistency is key to cracking NDA', 'Every small step counts towards your big goal', 'Stay focused and disciplined'],
            assessmentCriteria: 'Success measured by task completion rate, accuracy, and time management'
        };
    }

    async generateQuestions(category, difficulty = 'medium', count = 5, examType = 'NDA') {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            
            const prompt = `Generate ${count} multiple-choice questions for ${examType} ${category} preparation:

Requirements:
- Difficulty: ${difficulty}
- Format: Multiple choice with 4 options
- Include detailed explanations
- Cover important ${examType} ${category} topics
- Questions should be exam-pattern specific

Return as JSON array:
[
  {
    "id": "unique_id",
    "question": "question text",
    "options": ["option A", "option B", "option C", "option D"],
    "correctAnswer": "correct option text",
    "explanation": "detailed explanation",
    "topic": "specific topic",
    "difficulty": "${difficulty}",
    "timeLimit": "recommended time in minutes"
  }
]`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            
            try {
                const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
                const questions = JSON.parse(cleanedResponse);
                
                return questions.map((q, index) => ({
                    ...q,
                    id: q.id || `q_${Date.now()}_${index}`,
                    category: category,
                    examType: examType,
                    createdAt: new Date().toISOString()
                }));
                
            } catch (parseError) {
                console.error('Questions JSON parsing error:', parseError);
                return this.getFallbackQuestions(category, count, examType);
            }
            
        } catch (error) {
            console.error('Questions generation error:', error);
            return this.getFallbackQuestions(category, count, examType);
        }
    }

    getFallbackQuestions(category, count, examType) {
        const baseQuestions = {
            Mathematics: [
                {
                    question: 'What is the value of sin 30°?',
                    options: ['1/2', '√3/2', '1', '0'],
                    correctAnswer: '1/2',
                    explanation: 'sin 30° = 1/2 is a standard trigonometric value',
                    topic: 'Trigonometry'
                },
                {
                    question: 'If log₁₀ 100 = x, then x equals:',
                    options: ['1', '2', '10', '100'],
                    correctAnswer: '2',
                    explanation: 'log₁₀ 100 = log₁₀ 10² = 2',
                    topic: 'Logarithms'
                }
            ],
            'General Ability': [
                {
                    question: 'The Indian Army Day is celebrated on:',
                    options: ['January 15', 'January 26', 'August 15', 'October 2'],
                    correctAnswer: 'January 15',
                    explanation: 'Indian Army Day is celebrated on January 15th every year',
                    topic: 'Indian Armed Forces'
                },
                {
                    question: 'Who wrote the book "Wings of Fire"?',
                    options: ['Jawaharlal Nehru', 'A.P.J. Abdul Kalam', 'Mahatma Gandhi', 'Subhas Chandra Bose'],
                    correctAnswer: 'A.P.J. Abdul Kalam',
                    explanation: '"Wings of Fire" is the autobiography of Dr. A.P.J. Abdul Kalam',
                    topic: 'Books and Authors'
                }
            ]
        };

        const questions = baseQuestions[category] || baseQuestions['General Ability'];
        return questions.slice(0, count).map((q, index) => ({
            id: `fallback_${Date.now()}_${index}`,
            ...q,
            difficulty: 'medium',
            timeLimit: '2 minutes',
            category: category,
            examType: examType,
            createdAt: new Date().toISOString()
        }));
    }

    async generateWeeklyReport(userId, weekData) {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            
            const prompt = `Generate a comprehensive weekly progress report for an NDA aspirant:

Week Data:
- Tasks Completed: ${weekData.tasksCompleted}/${weekData.totalTasks}
- Average Score: ${weekData.averageScore}%
- Total Study Time: ${weekData.totalTime} hours
- Strong Areas: ${weekData.strongAreas.join(', ')}
- Weak Areas: ${weekData.weakAreas.join(', ')}
- Goals Achieved: ${weekData.goalsAchieved}/${weekData.totalGoals}

Generate a motivational, detailed report with:
1. Performance summary
2. Subject-wise analysis
3. Improvement areas
4. Next week's recommendations
5. Motivational message

Keep it encouraging and actionable.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            
            return {
                reportText: response.text(),
                generatedAt: new Date().toISOString(),
                weekData: weekData,
                recommendations: this.generateRecommendations(weekData)
            };
            
        } catch (error) {
            console.error('Weekly report generation error:', error);
            return this.getFallbackReport(weekData);
        }
    }

    generateRecommendations(weekData) {
        const recommendations = [];
        
        if (weekData.averageScore < 60) {
            recommendations.push('Focus on fundamental concepts before attempting advanced problems');
        }
        
        if (weekData.totalTime < 10) {
            recommendations.push('Increase daily study time to meet your preparation goals');
        }
        
        if (weekData.weakAreas.length > 0) {
            recommendations.push(`Dedicate extra time to: ${weekData.weakAreas.join(', ')}`);
        }
        
        return recommendations;
    }

    getFallbackReport(weekData) {
        return {
            reportText: `Weekly Progress Report\n\nYou completed ${weekData.tasksCompleted} out of ${weekData.totalTasks} tasks this week with an average score of ${weekData.averageScore}%. Keep up the consistent effort and focus on your weak areas for better results. Remember, every step forward is progress toward your NDA goal!`,
            generatedAt: new Date().toISOString(),
            weekData: weekData,
            recommendations: ['Stay consistent', 'Focus on weak areas', 'Practice daily']
        };
    }
}

module.exports = MicrotaskService;