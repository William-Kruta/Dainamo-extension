// ollama_response.js

/**
 * Generate a response from Ollama without using chat history
 * @param {string} prompt - The user's prompt
 * @param {string} model - The model name to use
 * @param {number} contextTokens - Maximum context tokens
 * @param {string} ollamaUrl - The Ollama API URL
 * @returns {Promise<string>} - The generated response
 */
export async function generateOllamaResponse(
  prompt,
  model,
  contextTokens,
  temperature,
  ollamaUrl
) {
  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false,
      num_ctx: contextTokens,
      temperature: parseFloat(temperature),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API returned ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log(`DATAAA: ${JSON.stringify(data, null, 2)}`);
  const content = data.response;
  const tokens = data.eval_count / (data.eval_duration / 1_000_000_000);

  const payload = {
    content: content,
    tokens: tokens.toFixed(2),
  };
  console.log(`PAYLOAD: ${JSON.stringify(payload, null, 2)}`);
  return payload;
}

/**
 * Generate a response from Ollama using chat history
 * @param {Array} messages - Array of message objects with role and content
 * @param {string} model - The model name to use
 * @param {number} contextTokens - Maximum context tokens
 * @param {string} ollamaUrl - The Ollama API URL
 * @returns {Promise<string>} - The generated response
 */
export async function generateOllamaResponseWithMemory(
  messages,
  model,
  contextTokens,
  temperature,
  ollamaUrl
) {
  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      stream: false,
      num_ctx: contextTokens,
      temperature: parseFloat(temperature),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API returned ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log(`DATA: ${JSON.stringify(data, null, 2)}`);

  const content = data.message.content;
  const tokens = data.eval_count / (data.eval_duration / 1_000_000_000);

  const payload = {
    content: content,
    tokens: tokens.toFixed(2),
  };

  console.log(`JSON: ${JSON.stringify(payload, null, 2)}`);
  return payload;
}

/**
 * Test the connection to Ollama
 * @param {string} url - The Ollama API URL to test
 * @returns {Promise<Object>} - Connection test results
 */
export async function testOllamaConnection(url) {
  try {
    // Try to get list of models to verify connection
    const response = await fetch(`${url}/api/tags`, {
      method: "GET",
    });

    if (!response.ok) {
      return { success: false, error: `HTTP Error: ${response.status}` };
    }

    const data = await response.json();
    const models = data.models ? data.models.map((model) => model.name) : [];

    return {
      success: true,
      models: models.length ? models : ["No models found"],
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Connection failed",
    };
  }
}

/**
 * Optimize a search query using Ollama
 * @param {string} userQuery - The original user query
 * @param {string} model - The model to use for optimization
 * @param {string} ollamaUrl - The Ollama API URL
 * @param {number} contextTokens - Maximum context tokens
 * @returns {Promise<string>} - The optimized search query
 */
export async function optimizeSearchQuery(
  userQuery,
  model,
  ollamaUrl,
  contextTokens
) {
  const currentDate = new Date();
  try {
    const prompt = `Optimize this users query for better google search results. Here is the current date if it is relevant to the query: ${currentDate.toDateString()}.
    Return ONLY the search query with no explanations or additional text:
    "${userQuery}"`;

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        num_ctx: contextTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    // Clean up the response to ensure it's just the query
    const optimizedQuery = data.response.trim().replace(/^["']|["']$/g, "");
    console.log(
      `Original query: "${userQuery}" -> Optimized: "${optimizedQuery}"`
    );
    return optimizedQuery;
  } catch (error) {
    console.warn("Failed to optimize search query:", error);
    return userQuery; // Fall back to original query
  }
}
