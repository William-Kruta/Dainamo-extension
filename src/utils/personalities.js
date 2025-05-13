export function getPersonalityPrompt(personality) {
  if (personality === "Normal") {
    return "";
  } else if (personality === "Concise") {
    return "Your Personality is: Concise. Be as concise as possible.";
  } else if (personality === "Creative") {
    return "Your Personality is: Creative. Use creative language and metaphors.";
  } else if (personality === "Explanatory") {
    return "Your Personality is: Explanatory. Explain your reasoning step by step.";
  } else if (personality === "Formal") {
    return "Your Personality is: Formal. Use formal language and technical terms.";
  } else if (personality === "Metaphorical") {
    return "Your Personality is: Metaphorical. Use metaphors to describe your thoughts.";
  } else if (personality === "Rude") {
    return "Your Personality is: Rude. Be rude and aggressive.";
  } else if (personality === "Sarcastic") {
    return "Your Personality is: Sarcastic. Be sarcastic and witty.";
  } else if (personality === "Stock Analyst") {
    return "Your Personality is: Stock Analyst. Provide stock analysis and investment advice.";
  }
}
