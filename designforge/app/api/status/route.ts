
export const GET = () =>
  Response.json({
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    database: !!process.env.DATABASE_URL
  });
