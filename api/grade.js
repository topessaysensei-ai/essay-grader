export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { essay, studentName, studentEmail } = await req.json();

    if (!essay || essay.length < 50) {
      return new Response(JSON.stringify({ error: "Essay is too short to grade." }), { status: 400 });
    }

    // 1. Log the attempt immediately (in case the AI fails, you still have the lead)
    console.log(`NEW LEAD STARTED: Name: ${studentName}, Email: ${studentEmail}`);

    const systemPrompt = `
      You are Dr. Arash Rahmani, a strict Ivy League admissions reader.
      
      Review the essay based on these 6 criteria.
      For the feedback:
      1. Identify the PROBLEM only.
      2. Do NOT tell them how to fix it.
      3. Be brief (1-2 sentences max).
      4. Be direct.

      CRITERIA:
      1. Narrative Arc: Does the protagonist change?
      2. Storytelling: Is the hook boring? Is it engaging?
      3. Paragraph Structure: Is the flow logical?
      4. Syntax & Mechanics: Is the grammar weak?
      5. Special Rules: Does it violate "Show Don't Tell"? Does it dwell too much on trauma (Phoenix Rule)?
      6. Coherence: Is the theme messy?

      OUTPUT JSON:
      {
        "score": (Integer 1-100. <70 bad, 70-89 average, 90+ Ivy),
        "narrative_problem": (String: e.g. "The narrative remains static..."),
        "storytelling_problem": (String: e.g. "The opening is a generic..."),
        "structure_problem": (String: e.g. "The transitions between paragraphs..."),
        "mechanics_problem": (String: e.g. "Sentence structure is repetitive..."),
        "special_problem": (String: e.g. "The essay relies on abstract adjectives..."),
        "coherence_problem": (String: e.g. "The central theme gets lost...")
      }
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the student essay: \n\n${essay}` }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    
    // 2. Parse the result so we can extract the score
    const result = JSON.parse(data.choices[0].message.content);

    // 3. LOG THE FINAL SCORE FOR YOU
    console.log(`LEAD SCORED: Name: ${studentName}, Email: ${studentEmail}, Score: ${result.score}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Error processing essay." }), { status: 500 });
  }
}