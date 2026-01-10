function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createTermPatterns(searchTerms) {
  return searchTerms.map(term => ({
    term,
    separatorRegex: new RegExp(`[\\s_\\-.]${escapeRegex(term)}`, 'i')
  }));
}

function getMatchScore(name, termPatterns) {
  const nameLower = name.toLowerCase();
  let score = 0;

  for (const { term, separatorRegex } of termPatterns) {
    if (!term) continue;

    if (nameLower === term) {
      score += 1000;
    } else if (nameLower.startsWith(term)) {
      score += 500 + (term.length * 10);
    } else if (separatorRegex.test(name)) {
      score += 300 + (term.length * 5);
    } else if (nameLower.includes(term)) {
      score += 100 + (term.length * 2);
    } else if (fuzzyMatch(nameLower, term)) {
      score += 50;
    } else {
      return 0;
    }
  }

  score += Math.max(0, 50 - name.length);
  return score;
}

function fuzzyMatch(str, pattern) {
  let patternIdx = 0;
  for (let i = 0; i < str.length && patternIdx < pattern.length; i++) {
    if (str[i] === pattern[patternIdx]) {
      patternIdx++;
    }
  }
  return patternIdx === pattern.length;
}

function parseSearchQuery(query) {
  return query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
}

function searchIndex(query, maxResults, showOnlyDirectories = false) {
  const db = require('./database');
  const searchTerms = parseSearchQuery(query);

  if (searchTerms.length === 0) return [];

  const candidates = db.searchFiles(searchTerms, maxResults, showOnlyDirectories);
  const termPatterns = createTermPatterns(searchTerms);
  const scored = [];

  for (const item of candidates) {
    const score = getMatchScore(item.name, termPatterns);
    if (score > 0) {
      scored.push({ ...item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults).map(({ name, path, isDirectory }) => ({
    name, path, isDirectory
  }));
}

module.exports = {
  getMatchScore,
  fuzzyMatch,
  parseSearchQuery,
  searchIndex,
  createTermPatterns,
};
