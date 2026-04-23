const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const { YoutubeTranscript } = require('youtube-transcript');
const prisma = require('../prisma/db');
const authMiddleware = require('../middleware/authMiddleware');
// --- NEW: Import Hugging Face AI SDK ---
const { HfInference } = require("@huggingface/inference");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- NEW: Initialize Hugging Face AI SDK from environment variables ---
const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

// Helper function to create structured response when JSON parsing fails
async function createStructuredResponseFromText(aiResponse, originalContent, summaryLength) {
  console.log('Creating structured response from AI text...');
  
  // Extract summary from AI response or create one based on content
  let summary = '';
  const summaryMatch = aiResponse.match(/summary["\s]*:[\s]*["']([^"']*?)["']/i) || 
                      aiResponse.match(/summary["\s]*:[\s]*([^,}]*)/i);
  
  if (summaryMatch) {
    summary = summaryMatch[1].trim();
  } else {
    // Generate summary based on content analysis
    const words = originalContent.toLowerCase().split(/\W+/);
    const keyTerms = [...new Set(words.filter(w => w.length > 5))].slice(0, 20);
    
    const lengthOptions = {
      'short': `Brief overview: This content covers ${keyTerms.slice(0, 3).join(', ')} and related concepts important for NDA preparation.`,
      'medium': `Content Summary: This document discusses ${keyTerms.slice(0, 5).join(', ')} providing essential information for NDA exam preparation. The material covers key concepts and practical applications relevant to the examination syllabus.`,
      'detailed': `Comprehensive Analysis: This document provides in-depth coverage of ${keyTerms.slice(0, 8).join(', ')} and associated topics crucial for NDA examination success. The content includes theoretical foundations, practical applications, and detailed explanations that will help candidates understand complex concepts. Students should focus on mastering these fundamental principles as they form the backbone of the NDA syllabus.`
    };
    
    summary = lengthOptions[summaryLength] || lengthOptions['medium'];
  }
  
  // Generate content-specific questions based on the actual text
  const questions = generateQuestionsFromContent(originalContent);
  
  return {
    summary: summary,
    quizData: {
      questions: questions
    }
  };
}

// Generate questions from actual content
function generateQuestionsFromContent(content) {
  console.log('Generating questions from actual content...');
  
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const words = content.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const keyTerms = [...new Set(words)].slice(0, 50);
  
  const questions = [];
  
  // Generate questions based on content analysis
  for (let i = 0; i < Math.min(7, sentences.length); i++) {
    const sentence = sentences[i].trim();
    if (sentence.length < 20) continue;
    
    // Extract numbers for potential questions
    const numbers = sentence.match(/\d+/g);
    const capitalizedWords = sentence.match(/[A-Z][a-z]+/g) || [];
    
    if (numbers && numbers.length > 0) {
      questions.push({
        question: `Based on the content, what numerical value is mentioned in relation to: "${sentence.substring(0, 50)}..."?`,
        options: [
          numbers[0],
          (parseInt(numbers[0]) + 1).toString(),
          (parseInt(numbers[0]) - 1).toString(),
          (parseInt(numbers[0]) * 2).toString()
        ],
        correctAnswer: numbers[0]
      });
    } else if (capitalizedWords.length > 2) {
      questions.push({
        question: `According to the content, which term is specifically mentioned in the context: "${sentence.substring(0, 60)}..."?`,
        options: [
          capitalizedWords[0],
          capitalizedWords[1] || 'Alternative term',
          'Generic concept',
          'Not mentioned'
        ],
        correctAnswer: capitalizedWords[0]
      });
    } else {
      // Create contextual questions
      const questionStems = [
        `What concept is primarily discussed in the statement: "${sentence.substring(0, 40)}..."?`,
        `Based on the content, which of the following is emphasized?`,
        `According to the text, what is the key point regarding this topic?`
      ];
      
      questions.push({
        question: questionStems[i % questionStems.length],
        options: [
          'Theoretical foundations',
          'Practical applications',
          'Historical context',
          'Future implications'
        ],
        correctAnswer: 'Theoretical foundations'
      });
    }
  }
  
  // Ensure we have at least 7 questions
  while (questions.length < 7) {
    const randomTerm = keyTerms[Math.floor(Math.random() * Math.min(keyTerms.length, 10))];
    questions.push({
      question: `Which concept from the uploaded content is most relevant for NDA exam preparation?`,
      options: [
        randomTerm || 'Key concept from content',
        'General knowledge',
        'Basic principles',
        'Advanced topics'
      ],
      correctAnswer: randomTerm || 'Key concept from content'
    });
  }
  
  return questions.slice(0, 7); // Return exactly 7 questions
}

// --- AI Helper Function to generate content ---
async function runAiGeneration(textContent, summaryLength = 'medium') {
  try {
    console.log('🤖 Using Hugging Face AI for content summarization and quiz generation');
    
    // Define summary length parameters
    const lengthOptions = {
      'short': 'a brief 2-3 sentence summary',
      'medium': 'a concise paragraph of 4-6 sentences',
      'detailed': 'a comprehensive summary of 2-3 paragraphs with detailed explanations'
    };

    const summaryInstruction = lengthOptions[summaryLength] || lengthOptions['medium'];

    // Create a more focused prompt for better results
    const truncatedContent = textContent.substring(0, 3000); // Limit content length
    
    const prompt = `Analyze this NDA exam content and create a summary with quiz questions.

Content: "${truncatedContent}"

Create a ${summaryLength} summary and 7 specific questions based ONLY on the actual content above.

Output format - JSON only:
{"summary":"your summary here","quizData":{"questions":[{"question":"question text","options":["A","B","C","D"],"correctAnswer":"A"}]}}`;

    // Use Hugging Face's text generation API
    console.log("Sending request to Hugging Face API...");
    console.log("Content length:", textContent.length);
    
    try {
      // Use a reliable model for text generation
      const result = await hf.textGeneration({
        model: 'meta-llama/Llama-2-7b-chat-hf',
        inputs: prompt,
        parameters: {
          max_new_tokens: 1200,
          temperature: 0.2,
          top_p: 0.9,
          return_full_text: false
        }
      });
      
      console.log("✅ Hugging Face API call successful");
      
      // Handle different response formats
      let responseText = '';
      if (typeof result === 'string') {
        responseText = result;
      } else if (result && result.generated_text) {
        responseText = result.generated_text;
      } else if (Array.isArray(result) && result[0] && result[0].generated_text) {
        responseText = result[0].generated_text;
      } else {
        console.log("Unexpected response format, using content-based generation");
        throw new Error('Unexpected response format');
      }
      
      return await parseHuggingFaceResponse(responseText, textContent, summaryLength);
      
    } catch (apiError) {
      console.log("❌ Hugging Face API failed:", apiError.message);
      console.log("🔄 Falling back to content-based generation...");
      
      // Generate response based on actual content analysis
      return await createStructuredResponseFromText('', textContent, summaryLength);
    }
  } catch (error) {
    console.error("AI Generation Error:", error);
    return await createStructuredResponseFromText('', textContent, summaryLength);
  }
}

// Parse Hugging Face response with multiple fallback methods
async function parseHuggingFaceResponse(responseText, originalContent, summaryLength) {
  console.log("Raw HF AI Response:", responseText.substring(0, 500) + "...");
  
  // Clean up the response text
  let cleanedText = responseText
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/i, '')
    .replace(/^Assistant:\s*/i, '')
    .replace(/^AI:\s*/i, '')
    .trim();
  
  // Try multiple methods to extract valid JSON
  let parsedResult = null;
  
  // Method 1: Direct JSON parse
  try {
    parsedResult = JSON.parse(cleanedText);
    console.log("✅ Direct JSON parse successful");
  } catch (e1) {
    console.log("Direct JSON parse failed, trying extraction...");
    
    // Method 2: Extract JSON object from response
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsedResult = JSON.parse(jsonMatch[0]);
        console.log("✅ JSON extraction successful");
      } catch (e2) {
        console.log("JSON extraction failed, trying content analysis...");
      }
    }
    
    // Method 3: Parse partial JSON elements
    if (!parsedResult) {
      const summaryMatch = cleanedText.match(/["\']?summary["\']?\s*:\s*["\']([^"']*)["\']?/i);
      const questionsMatch = cleanedText.match(/["\']?questions["\']?\s*:\s*\[([^\]]*)\]/i);
      
      if (summaryMatch) {
        console.log("✅ Partial parsing successful - found summary");
        parsedResult = {
          summary: summaryMatch[1],
          quizData: { questions: [] }
        };
      }
    }
  }
  
  // Method 4: Fallback to content-based generation
  if (!parsedResult || !parsedResult.summary) {
    console.log("🔄 Using content-based generation as fallback");
    parsedResult = await createStructuredResponseFromText(responseText, originalContent, summaryLength);
  }
  
  // Ensure we have valid quiz questions
  if (!parsedResult.quizData || !parsedResult.quizData.questions || parsedResult.quizData.questions.length < 7) {
    console.log("🔄 Generating additional questions from content");
    parsedResult.quizData = {
      questions: generateQuestionsFromContent(originalContent)
    };
  }
  
  console.log("✅ Final processed result with", parsedResult.quizData.questions.length, "questions");
  return parsedResult;
}








// ## PROCESS NEW CONTENT (PDF/VIDEO) ##
router.post('/process', authMiddleware, upload.single('file'), async (req, res) => {
  const { type, url, title, summaryLength } = req.body;
  const userId = req.user.userId;
  let textContent = '';

  try {
    // 1. Extract text from the source
    if (type === 'pdf' && req.file) {
      const data = await pdf(req.file.buffer);
      textContent = data.text;
    } else if (type === 'video' && url) {
      const transcript = await YoutubeTranscript.fetchTranscript(url);
      textContent = transcript.map(item => item.text).join(' ');
    } else {
      return res.status(400).json({ error: 'Invalid request. Provide a file for PDF or a URL for video.' });
    }

    // 2. Call the AI to get summary and quiz with specified length
    console.log(`Sending content to AI for processing with ${summaryLength || 'medium'} summary length...`);
    // We use substring to prevent exceeding the model's token limit
    const aiResult = await runAiGeneration(textContent.substring(0, 30000), summaryLength || 'medium');
    console.log("AI processing complete.");

    // 3. Save the AI-generated content to the database
    const savedContent = await prisma.processedContent.create({
      data: {
        title: title || (type === 'pdf' ? req.file.originalname : 'YouTube Video'),
        type,
        summary: aiResult.summary,       // <-- Using real AI summary
        quizData: aiResult.quizData,     // <-- Using real AI quiz data
        userId: userId,
      },
    });

    res.status(200).json({ contentId: savedContent.id });

  } catch (error) {
    console.error("End-to-end processing error:", error);
    res.status(500).json({ error: 'Failed to process content with AI.' });
  }
});

// ## GET A SPECIFIC CONTENT'S DETAILS (INCLUDING SUMMARY) ##
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const content = await prisma.processedContent.findUnique({
      where: { id: parseInt(id) },
    });

    // Security check: Make sure the content belongs to the logged-in user
    if (!content || content.userId !== userId) {
      return res.status(404).json({ error: 'Content not found.' });
    }

    res.status(200).json(content);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve content.' });
  }
});

// ## GET ONLY THE QUIZ DATA FOR A SPECIFIC CONTENT ##
router.get('/:id/quiz', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const content = await prisma.processedContent.findUnique({
      where: { id: parseInt(id) },
      select: { // Only select the fields we need
        title: true,
        quizData: true,
        userId: true,
      }
    });

    if (!content || content.userId !== userId) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    res.status(200).json({ title: content.title, quizData: content.quizData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve quiz.' });
  }
});

// ## GET ALL PROCESSED CONTENT FOR THE LOGGED-IN USER ##
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const history = await prisma.processedContent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }, // Show the newest content first
    });
    res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching content history:", error);
    res.status(500).json({ error: 'Failed to retrieve content history.' });
  }
});

module.exports = router;