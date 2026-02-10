/**
 * Feedback Service - STAR-based response evaluation
 * 
 * This service provides rules-based scoring for interview responses
 * based on the STAR (Situation, Task, Action, Result) methodology.
 */

/**
 * STAR component keywords for pattern matching
 */
const STAR_KEYWORDS = {
  situation: [
    'situation', 'context', 'background', 'when', 'where', 'once',
    'during', 'while', 'at the time', 'previously', 'in my role',
    'faced', 'encountered', 'challenge', 'problem', 'scenario'
  ],
  task: [
    'task', 'goal', 'objective', 'responsibility', 'role', 'needed to',
    'had to', 'was responsible', 'my job was', 'assignment', 'mission',
    'required', 'expected', 'supposed to', 'aimed to'
  ],
  action: [
    'action', 'did', 'implemented', 'created', 'developed', 'organized',
    'led', 'coordinated', 'managed', 'executed', 'performed', 'conducted',
    'initiated', 'established', 'facilitated', 'collaborated', 'worked',
    'analyzed', 'designed', 'built', 'solved', 'addressed', 'handled'
  ],
  result: [
    'result', 'outcome', 'achieved', 'accomplished', 'success', 'impact',
    'delivered', 'completed', 'improved', 'increased', 'reduced', 'saved',
    'gained', 'learned', 'ultimately', 'finally', 'consequently', 'therefore',
    'as a result', 'this led to', 'ended up', 'resulted in'
  ]
};

/**
 * Calculate presence score for a STAR component
 * @param {string} text - Response text
 * @param {string} component - STAR component (situation/task/action/result)
 * @returns {number} Score from 0-100
 */
function calculateComponentPresence(text, component) {
  const lowerText = text.toLowerCase();
  const keywords = STAR_KEYWORDS[component];
  
  let matchCount = 0;
  let matchedKeywords = [];

  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      matchCount++;
      matchedKeywords.push(keyword);
    }
  });

  // Base score on keyword density
  const score = Math.min(100, (matchCount / keywords.length) * 100 * 3);
  
  return {
    score: Math.round(score),
    matchedKeywords: matchedKeywords.slice(0, 5), // Return top 5 matches
    matchCount
  };
}

/**
 * Analyze sentence structure and length
 * @param {string} text - Response text
 * @returns {object} Structure analysis
 */
function analyzeStructure(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.trim().split(/\s+/);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  return {
    sentenceCount: sentences.length,
    wordCount: words.length,
    paragraphCount: paragraphs.length,
    avgWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
    hasMultipleParagraphs: paragraphs.length > 1
  };
}

/**
 * Calculate detail score based on response length and structure
 * @param {object} structure - Structure analysis
 * @returns {number} Score from 0-100
 */
function calculateDetailScore(structure) {
  let score = 0;

  // Word count scoring (optimal range: 100-300 words)
  if (structure.wordCount >= 100 && structure.wordCount <= 300) {
    score += 40;
  } else if (structure.wordCount >= 50 && structure.wordCount < 100) {
    score += 25;
  } else if (structure.wordCount > 300) {
    score += 30; // Slightly penalize overly long responses
  } else {
    score += 10;
  }

  // Sentence count (optimal: 5-12 sentences)
  if (structure.sentenceCount >= 5 && structure.sentenceCount <= 12) {
    score += 30;
  } else if (structure.sentenceCount >= 3) {
    score += 20;
  } else {
    score += 10;
  }

  // Paragraph structure
  if (structure.hasMultipleParagraphs) {
    score += 20;
  } else {
    score += 10;
  }

  // Average sentence length (optimal: 15-25 words)
  if (structure.avgWordsPerSentence >= 15 && structure.avgWordsPerSentence <= 25) {
    score += 10;
  } else {
    score += 5;
  }

  return Math.min(100, score);
}

/**
 * Generate improvement suggestions based on scores
 * @param {object} scores - STAR component scores
 * @param {object} structure - Response structure
 * @returns {array} Array of suggestion strings
 */
function generateSuggestions(scores, structure) {
  const suggestions = [];

  // STAR component suggestions
  if (scores.situation < 50) {
    suggestions.push('Add more context about the situation. Describe when and where this occurred, and what the circumstances were.');
  }
  
  if (scores.task < 50) {
    suggestions.push('Clarify your specific role and responsibilities. What were you expected to accomplish?');
  }
  
  if (scores.action < 50) {
    suggestions.push('Provide more detail about the actions you took. Use action verbs to describe what you specifically did.');
  }
  
  if (scores.result < 50) {
    suggestions.push('Emphasize the outcomes and impact of your actions. Include metrics or specific achievements when possible.');
  }

  // Structure suggestions
  if (structure.wordCount < 50) {
    suggestions.push('Your response is quite brief. Aim for 100-200 words to provide sufficient detail.');
  } else if (structure.wordCount > 300) {
    suggestions.push('Consider being more concise. Focus on the most impactful details of your STAR response.');
  }

  if (!structure.hasMultipleParagraphs && structure.wordCount > 100) {
    suggestions.push('Break your response into paragraphs to improve readability (e.g., one for each STAR component).');
  }

  if (structure.sentenceCount < 4) {
    suggestions.push('Add more sentences to elaborate on each part of your story.');
  }

  // Overall balance suggestion
  const starScores = [scores.situation, scores.task, scores.action, scores.result];
  const maxScore = Math.max(...starScores);
  const minScore = Math.min(...starScores);
  if (maxScore - minScore > 40) {
    suggestions.push('Try to balance all four STAR components equally in your response.');
  }

  return suggestions;
}

/**
 * Generate strengths based on high-scoring components
 * @param {object} scores - STAR component scores
 * @param {object} structure - Response structure
 * @returns {array} Array of strength strings
 */
function generateStrengths(scores, structure) {
  const strengths = [];

  if (scores.situation >= 70) {
    strengths.push('Strong situational context that sets up the story well.');
  }
  
  if (scores.task >= 70) {
    strengths.push('Clear articulation of your role and responsibilities.');
  }
  
  if (scores.action >= 70) {
    strengths.push('Detailed description of the actions you took.');
  }
  
  if (scores.result >= 70) {
    strengths.push('Effective emphasis on outcomes and impact.');
  }

  if (structure.wordCount >= 100 && structure.wordCount <= 250) {
    strengths.push('Good response length - detailed but concise.');
  }

  if (structure.hasMultipleParagraphs) {
    strengths.push('Well-structured response with clear organization.');
  }

  if (strengths.length === 0) {
    strengths.push('You provided a response - keep practicing to improve!');
  }

  return strengths;
}

/**
 * Evaluate an interview response using STAR methodology
 * @param {string} responseText - The user's response
 * @param {object} question - The interview question object
 * @returns {object} Evaluation results with scores and feedback
 */
export function evaluateResponse(responseText, question) {
  // Analyze structure
  const structure = analyzeStructure(responseText);

  // Calculate STAR component scores
  const situationAnalysis = calculateComponentPresence(responseText, 'situation');
  const taskAnalysis = calculateComponentPresence(responseText, 'task');
  const actionAnalysis = calculateComponentPresence(responseText, 'action');
  const resultAnalysis = calculateComponentPresence(responseText, 'result');

  // Calculate detail score
  const detailScore = calculateDetailScore(structure);

  // Component scores
  const scores = {
    situation: situationAnalysis.score,
    task: taskAnalysis.score,
    action: actionAnalysis.score,
    result: resultAnalysis.score,
    detail: detailScore,
    overall: 0
  };

  // Calculate overall score (weighted average)
  scores.overall = Math.round(
    (scores.situation * 0.2) +
    (scores.task * 0.2) +
    (scores.action * 0.25) +
    (scores.result * 0.25) +
    (scores.detail * 0.1)
  );

  // Generate feedback
  const suggestions = generateSuggestions(scores, structure);
  const strengths = generateStrengths(scores, structure);

  // Determine rating
  let rating;
  if (scores.overall >= 85) {
    rating = 'excellent';
  } else if (scores.overall >= 70) {
    rating = 'good';
  } else if (scores.overall >= 50) {
    rating = 'fair';
  } else {
    rating = 'needs_improvement';
  }

  return {
    scores,
    rating,
    strengths,
    suggestions,
    analysis: {
      structure,
      starComponents: {
        situation: {
          score: situationAnalysis.score,
          keywordsFound: situationAnalysis.matchedKeywords
        },
        task: {
          score: taskAnalysis.score,
          keywordsFound: taskAnalysis.matchedKeywords
        },
        action: {
          score: actionAnalysis.score,
          keywordsFound: actionAnalysis.matchedKeywords
        },
        result: {
          score: resultAnalysis.score,
          keywordsFound: resultAnalysis.matchedKeywords
        }
      }
    }
  };
}

export default {
  evaluateResponse
};
