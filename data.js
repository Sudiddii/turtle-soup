const SoupData = (() => {
  const categoryKeys = Object.keys(categoryMeta).filter((key) => key !== "all");
  const categoryIcons = {
    all: `<svg class="category-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>`,
    suspense: `<svg class="category-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>`,
    horror: `<svg class="category-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    funny: `<svg class="category-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 10h.01M16 10h.01M8 15c1.2 1.1 2.5 1.6 4 1.6s2.8-.5 4-1.6"/></svg>`,
    emotional: `<svg class="category-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 8.5c0 5.3-8.5 10-8.5 10s-8.5-4.7-8.5-10A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8.5 2.5Z"/></svg>`,
    absurd: `<svg class="category-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12c2.5-5 8.5-5 11-2.5 2 2 .5 5-2.5 4.5-3-.5-2.5-4.5.5-5.5 3.5-1.2 6.5 1 7 4.5"/><path d="M6 17c3 2.5 8 2.8 11-.5"/></svg>`,
    sciFi: `<svg class="category-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.2 3.2L16.5 7.5l-3.3 1.3L12 12l-1.2-3.2-3.3-1.3 3.3-1.3L12 3Z"/><path d="M18 13l.8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13ZM6 14l.6 1.6L8 16.2l-1.4.6L6 18.5l-.6-1.7-1.4-.6 1.4-.6L6 14Z"/></svg>`,
    ruleHorror: `<svg class="category-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8l2 2v14H6V6l2-2Z"/><path d="M9 10h6M9 14h6M9 18h4"/></svg>`
  };
  let validSoups = [];

  function validateSoup(soup, index, seenSlugs) {
    const errors = [];
    if (!soup || typeof soup !== "object") errors.push("not an object");
    if (!soup.slug) errors.push("missing slug");
    if (soup.slug && seenSlugs.has(soup.slug)) errors.push(`duplicate slug "${soup.slug}"`);
    if (!soup.title) errors.push("missing title");
    if (!soup.teaser) errors.push("missing teaser");
    if (!soup.surface) errors.push("missing surface");
    if (!soup.answer) errors.push("missing answer");
    if (!categoryKeys.includes(soup.category)) errors.push(`invalid category "${soup.category}"`);
    if (!Number.isInteger(soup.difficulty) || soup.difficulty < 1 || soup.difficulty > 5) {
      errors.push("difficulty must be 1-5");
    }
    if (!Number.isInteger(soup.horrorLevel) || soup.horrorLevel < 0 || soup.horrorLevel > 3) {
      errors.push("horrorLevel must be 0-3");
    }
    if (!Number.isFinite(soup.minutes) || soup.minutes <= 0) errors.push("minutes must be positive");
    if (!Array.isArray(soup.tags) || soup.tags.length < 3 || soup.tags.length > 5) {
      errors.push("tags must include 3-5 items");
    }
    if (!Array.isArray(soup.keyPoints) || soup.keyPoints.length < 2) {
      errors.push("keyPoints must include at least 2 items");
    }
    if (!Array.isArray(soup.hostNotes)) errors.push("hostNotes must be an array");
    if (!Array.isArray(soup.hints) || soup.hints.length !== 3) {
      errors.push("hints must include exactly 3 items");
    }
    if (errors.length) console.warn(`Invalid soup at index ${index}: ${errors.join(", ")}`, soup);
    if (soup && soup.slug) seenSlugs.add(soup.slug);
    return errors;
  }

  function init() {
    const seenSlugs = new Set();
    validSoups = soups.filter((soup, index) => validateSoup(soup, index, seenSlugs).length === 0);
    if (!validSoups.length) console.warn("No valid turtle soup stories found.");
    return validSoups;
  }

  function shuffle(items) {
    const next = [...items];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  }

  function getAllSoups() {
    return validSoups;
  }

  function getSoupBySlug(slug) {
    return validSoups.find((soup) => soup.slug === slug) || null;
  }

  function getSoupsByFilter(filter) {
    return filter === "all" ? validSoups : validSoups.filter((soup) => soup.category === filter);
  }

  function getSoupPreview(soup) {
    if (soup.teaser) return soup.teaser;
    return soup.surface.length > 42 ? `${soup.surface.slice(0, 42)}...` : soup.surface;
  }

  function getRandomSoup(candidates, currentSlug, seenSlugs) {
    const source = candidates.filter((soup) => soup && soup.slug && soup.slug !== currentSlug);
    const unseen = source.filter((soup) => !seenSlugs.includes(soup.slug));
    const pool = unseen.length ? unseen : source;
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  function getNextSoup(currentSoup, seenSlugs, mode = "same") {
    if (!currentSoup) return getRandomSoup(validSoups, null, seenSlugs);
    const candidates = mode === "same" ? getSoupsByFilter(currentSoup.category) : validSoups;
    return getRandomSoup(candidates, currentSoup.slug, seenSlugs) || getRandomSoup(validSoups, currentSoup.slug, []);
  }

  function getRelatedSoups(currentSoup, seenSlugs, limit = 3) {
    if (!currentSoup) return [];
    const same = validSoups.filter(
      (soup) => soup.slug !== currentSoup.slug && soup.category === currentSoup.category
    );
    const unseenSame = same.filter((soup) => !seenSlugs.includes(soup.slug));
    const closeHorror = validSoups.filter(
      (soup) =>
        soup.slug !== currentSoup.slug &&
        soup.category !== currentSoup.category &&
        Math.abs(soup.horrorLevel - currentSoup.horrorLevel) <= 1
    );
    const fallback = validSoups.filter((soup) => soup.slug !== currentSoup.slug);
    const picked = [];

    for (const group of [shuffle(unseenSame), shuffle(same), shuffle(closeHorror), shuffle(fallback)]) {
      for (const soup of group) {
        if (!picked.some((item) => item.slug === soup.slug)) picked.push(soup);
        if (picked.length === limit) return picked;
      }
    }
    return picked;
  }

  function getCategoryMeta(category) {
    return categoryMeta[category] || categoryMeta.suspense;
  }

  function getCategoryLabel(category) {
    const meta = getCategoryMeta(category);
    return meta.label;
  }

  function getCategoryIcon(category) {
    const key = getCategoryMeta(category).iconKey;
    return categoryIcons[key] || categoryIcons.suspense;
  }

  function getDifficultyLabel(value) {
    return difficultyLabels[value] || "中等";
  }

  return {
    init,
    getAllSoups,
    getSoupBySlug,
    getSoupsByFilter,
    getSoupPreview,
    getRandomSoup,
    getNextSoup,
    getRelatedSoups,
    getCategoryMeta,
    getCategoryLabel,
    getCategoryIcon,
    getDifficultyLabel,
    shuffle
  };
})();
