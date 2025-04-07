export async function performSearch(query) {
  const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(
    query
  )}`;

  try {
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const html = await response.text();
    return html;
  } catch (error) {
    console.error("Error fetching search results:", error);
    return null;
  }
}

export function parseSearchResults(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const results = [];
  const resultElements = doc.querySelectorAll(".b_algo");

  resultElements.forEach((element) => {
    const titleElement = element.querySelector("h2 a");
    const snippetElement = element.querySelector(".b_caption p");
    const urlElement = element.querySelector("cite");
    const dateElement = element.querySelector(".news_dt");
    // Look for other metadata Bing might provide
    const metadataElements = element.querySelectorAll(".b_factrow");

    let metadata = {};
    metadataElements.forEach((meta) => {
      metadata[meta.querySelector("strong")?.textContent || "info"] =
        meta.querySelector(":not(strong)")?.textContent || "";
    });

    results.push({
      title: titleElement?.textContent || "",
      url: titleElement?.href || "",
      displayUrl: urlElement?.textContent || "",
      snippet: snippetElement?.textContent || "",
      date: dateElement?.textContent || "",
      metadata: metadata,
    });
  });

  return results;
}
