import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASTRA_MODEL = process.env.ASTRA_MODEL ?? "gpt-6-astra";

export interface AstraRequest {
  instructions: string;
  input: string;
}

/**
 * Single entry point for all GPT-6 Astra calls. The API key never leaves
 * this process — the extension only ever talks to our own routes.
 */
export async function askAstra({ instructions, input }: AstraRequest): Promise<string> {
  const response = await client.responses.create({
    model: ASTRA_MODEL,
    instructions,
    input,
  });

  return response.output_text;
}
