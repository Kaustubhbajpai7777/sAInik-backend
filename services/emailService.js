const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER || 'your-email@gmail.com',
                pass: process.env.GMAIL_APP_PASSWORD || 'your-app-password'
            }
        });
    }

    async sendWeeklyReport(userEmail, userName, reportData) {
        try {
            console.log(`Sending weekly report to ${userEmail}...`);

            const htmlContent = this.generateReportHTML(userName, reportData);
            
            const mailOptions = {
                from: process.env.GMAIL_USER || 'sAInik <noreply@sainik.com>',
                to: userEmail,
                subject: `🎯 Weekly NDA Progress Report - ${this.getWeekDateRange()}`,
                html: htmlContent,
                text: this.generateReportText(userName, reportData)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Weekly report sent successfully:', result.messageId);
            
            return {
                success: true,
                messageId: result.messageId,
                sentAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Email sending error:', error);
            return {
                success: false,
                error: error.message,
                attemptedAt: new Date().toISOString()
            };
        }
    }

    generateReportHTML(userName, reportData) {
        const { weekData, reportText, recommendations } = reportData;
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly NDA Progress Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .header p {
            margin: 5px 0 0 0;
            opacity: 0.9;
        }
        .content {
            padding: 30px 20px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #ff6b35;
        }
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #ff6b35;
            margin-bottom: 5px;
        }
        .stat-label {
            color: #666;
            font-size: 14px;
        }
        .progress-bar {
            background: #e9ecef;
            border-radius: 10px;
            height: 10px;
            margin: 10px 0;
            overflow: hidden;
        }
        .progress-fill {
            background: linear-gradient(90deg, #ff6b35, #f7931e);
            height: 100%;
            border-radius: 10px;
            transition: width 0.3s ease;
        }
        .section {
            margin: 25px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .section h3 {
            color: #333;
            margin-bottom: 15px;
            border-bottom: 2px solid #ff6b35;
            padding-bottom: 5px;
        }
        .recommendations {
            background: #e8f5e8;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 15px 0;
        }
        .recommendations ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .footer {
            background: #333;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 14px;
        }
        .motivational-quote {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
            font-style: italic;
            margin: 20px 0;
            border-radius: 8px;
        }
        @media (max-width: 600px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
            .container {
                margin: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Weekly Progress Report</h1>
            <p>Hello ${userName}! Here's your NDA preparation summary for ${this.getWeekDateRange()}</p>
        </div>
        
        <div class="content">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${weekData.tasksCompleted}/${weekData.totalTasks}</div>
                    <div class="stat-label">Tasks Completed</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(weekData.tasksCompleted/weekData.totalTasks)*100}%"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">${weekData.averageScore}%</div>
                    <div class="stat-label">Average Score</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${weekData.averageScore}%"></div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">${weekData.totalTime}h</div>
                    <div class="stat-label">Study Time</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-number">${weekData.goalsAchieved}/${weekData.totalGoals}</div>
                    <div class="stat-label">Goals Achieved</div>
                </div>
            </div>

            <div class="section">
                <h3>📊 Performance Analysis</h3>
                <p>${reportText}</p>
            </div>

            <div class="section">
                <h3>💪 Strong Areas</h3>
                <p>Great work in: <strong>${weekData.strongAreas.join(', ')}</strong></p>
            </div>

            <div class="section">
                <h3>🎯 Areas for Improvement</h3>
                <p>Focus more on: <strong>${weekData.weakAreas.join(', ')}</strong></p>
            </div>

            <div class="recommendations">
                <h3>🚀 Recommendations for Next Week</h3>
                <ul>
                    ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>

            <div class="motivational-quote">
                <h3>💫 Motivation Corner</h3>
                <p>"Success is the sum of small efforts repeated day in and day out. Keep pushing towards your NDA dream!"</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Generated by sAInik - Your AI-Powered NDA Preparation Assistant</p>
            <p>Keep up the excellent work! Every step counts towards your goal. 🇮🇳</p>
        </div>
    </div>
</body>
</html>`;
    }

    generateReportText(userName, reportData) {
        const { weekData, reportText, recommendations } = reportData;
        
        return `Weekly NDA Progress Report for ${userName}

Week Summary (${this.getWeekDateRange()}):
- Tasks Completed: ${weekData.tasksCompleted}/${weekData.totalTasks}
- Average Score: ${weekData.averageScore}%
- Total Study Time: ${weekData.totalTime} hours
- Goals Achieved: ${weekData.goalsAchieved}/${weekData.totalGoals}

Performance Analysis:
${reportText}

Strong Areas: ${weekData.strongAreas.join(', ')}
Areas for Improvement: ${weekData.weakAreas.join(', ')}

Recommendations for Next Week:
${recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

Keep up the excellent work! Every step counts towards your NDA goal.

Generated by sAInik - Your AI-Powered NDA Preparation Assistant`;
    }

    getWeekDateRange() {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
        
        const formatDate = (date) => {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
        };
        
        return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
    }

    async testEmailConfiguration() {
        try {
            await this.transporter.verify();
            return { success: true, message: 'Email configuration is valid' };
        } catch (error) {
            console.error('Email configuration error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = EmailService;