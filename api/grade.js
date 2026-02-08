export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { essay } = await req.json();

    // 1. Basic Validation
    if (!essay || essay.length < 50) {
      return new Response(JSON.stringify({ error: "Essay is too short to grade." }), { status: 400 });
    }

    // 2. The "Master" System Prompt
    const systemPrompt = `
      You are Dr. Arash Rahmani, an expert college admissions counselor from EssaySensei.vip. 
      Your task is to grade a college admissions essay. Be strict but constructive. 
      A score of 90+ is Ivy League ready. 70-80 is average. Below 70 needs major work.

      **EVALUATION CRITERIA:**

      1. **The Hook (In Medias Res):** - Does it start immediately in the middle of action/scene? (Good)
         - does it start with a generic summary or quote? (Bad)
      
      2. **The Phoenix Rule (Structure):**
         - The essay must follow the 20/80 split. 
         - Max 20% describing the "Fire" (hardship/trauma).
         - Min 80% describing the "Rise" (growth, learning, future).
         - Penalize heavily if they dwell on the misery without showing the growth.

      3. **Show, Don't Tell & Voice:**
         - Does it use sensory details?
         - Is the voice vulnerable and authentic (sounds like a teenager)? 
         - Penalize "Thesaurus abuse" (using big words incorrectly).

      4. **Coherence & Cohesion:**
         - Do paragraphs flow logically? Is the narrative arc clear?

      **OUTPUT FORMAT (JSON ONLY):**
      Return a JSON object exactly like this:
      {
        "score": (Integer 1-100),
        "hook_feedback": (String: "Strong - Starts with action" OR "Weak - Generic start. Try 'In Medias Res'."),
        "phoenix_feedback": (String: "Pass - Good balance of growth." OR "Fail - You spend too much time on the hardship (Fire) and not enough on the growth."),
        "voice_feedback": (String: "Authentic and vulnerable." OR "Too vague/telling not showing."),
        "main_critique": (One sentence summarizing the biggest issue),
        "upsell_blurb": (String: "Your essay has potential. For a full line-by-line edit, book Dr. Rahmani at EssaySensei.vip")
      }
    `;

    // 3. Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Very cheap, high intelligence
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the student essay: \n\n${essay}` }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    
    // 4. Return the AI's grading to the frontend
    return new Response(data.choices[0].message.content, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Error processing essay." }), { status: 500 });
  }
}