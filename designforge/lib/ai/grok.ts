
import Groq from "groq-sdk";
import { Unavailable } from "@/lib/ai/gemini";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function groqGenerate(prompt: string) {
  try {
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content: `You are an expert website generator.
Generate complete, responsive and modern websites.
Create clean HTML, CSS, React and JavaScript.
Follow the user's requirements carefully.
Return the output in the exact project structure
and format expected by the application.`
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 8000,
    });

    const result = completion.choices[0]?.message?.content;

    if (!result) {
      throw new Error("Empty Groq response");
    }

    // IMPORTANT:
    // Adapt this return value to the projects schema
    // expected by your existing application engine.
    return result;

  } catch (error: any) {
    console.error("Groq error:", error);

    if (error?.status === 429 || error?.status === 503) {
      throw new Unavailable(
        "Groq is temporarily busy or its free usage limit has been reached."
      );
    }

    throw error;
  }
}
