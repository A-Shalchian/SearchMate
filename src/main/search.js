function getMatchScore(name, searchTerms) {
  const nameLower = name.toLowerCase();
  let score = 0;

  for (const term of searchTerms) {
    if (!term) continue;

    if (nameLower === term) {
      score += 1000;
    } else if (nameLower.startsWith(term)) {
      score += 500 + (term.length * 10);
    } else if (new RegExp(`[\\s_\\-.]${term}`, 'i').test(name)) {
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

function searchIndex(fileIndex, query, maxResults) {
  const searchTerms = parseSearchQuery(query);
  const scored = [];

  for (const item of fileIndex) {
    const score = getMatchScore(item.name, searchTerms);
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
};
