import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

router.post("/chat", async (req, res) => {
    const { message, history, context } = req.body;

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key_placeholder") {
        return res.status(500).json({ error: "Gemini API key not configured" });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const chat = model.startChat({
            history: history || [],
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        const systemPrompt = `You are a professional technical interviewer for a software engineering position. 
    The candidate is interviewing for a ${context?.role || "Software Engineer"} position.
    Provide constructive feedback, ask follow-up questions, and evaluate their responses.
    Keep your responses concise and professional.
    Currently, the candidate said: "${message}"`;

        const result = await chat.sendMessage(systemPrompt);
        const response = await result.response;
        const text = response.text();

        res.json({ text });
    } catch (error) {
        console.error("Gemini API error:", error);
        res.status(500).json({ error: "Failed to get AI response" });
    }
});

// Endpoint to generate initial interview questions
router.post("/start", async (req, res) => {
    const { role, level, description } = req.body;

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key_placeholder") {
        return res.status(500).json({ error: "Gemini API key not configured" });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Generate a set of 5 interview questions for a ${level || "Junior"} ${role || "Software Engineer"} position. 
    Context: ${description || "General technical interview"}
    Return the response as a JSON array of strings.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Attempt to parse JSON from response (Gemini sometimes adds markdown blocks)
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
            const questions = JSON.parse(jsonMatch[0]);
            return res.json({ questions });
        }

        res.json({ questions: [text] });
    } catch (error) {
        console.error("Gemini API error:", error);
        res.status(500).json({ error: "Failed to generate questions" });
    }
});

export const interviewRouter = router;
