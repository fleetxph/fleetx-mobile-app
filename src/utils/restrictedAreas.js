const FALLBACK_RESTRICTED_RULES = [
  {
    id: "fallback-palawan",
    keywords: ["palawan"],
    message:
      "This destination may require special approval or may be outside the current standard service coverage.",
  },
  {
    id: "fallback-boracay",
    keywords: ["boracay"],
    message:
      "This destination may require special approval or may be outside the current standard service coverage.",
  },
  {
    id: "fallback-cebu",
    keywords: ["cebu"],
    message:
      "This destination may require special approval or may be outside the current standard service coverage.",
  },
  {
    id: "fallback-davao",
    keywords: ["davao", "mindanao"],
    message:
      "This destination may require special approval or may be outside the current standard service coverage.",
  },
  {
    id: "fallback-visayas",
    keywords: ["visayas", "bohol"],
    message:
      "This destination may require special approval or may be outside the current standard service coverage.",
  },
];

function normalizeKeyword(value) {
  return String(value || "").trim().toLowerCase();
}

function toKeywordList(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeKeyword).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map(normalizeKeyword)
    .filter(Boolean);
}

function extractRuleKeywords(rule = {}) {
  const keywordSources = [
    rule.keywords,
    rule.keyword,
    rule.restrictedKeywords,
    rule.matchKeywords,
    rule.areas,
    rule.areaNames,
  ];

  const keywords = keywordSources.flatMap(toKeywordList);
  const nameKeyword = normalizeKeyword(rule.name || rule.title || rule.areaName || rule.locationName);

  if (nameKeyword) {
    keywords.push(nameKeyword);
  }

  return [...new Set(keywords.filter(Boolean))];
}

export function normalizeRestrictedAreaRules(rawRules = []) {
  if (!Array.isArray(rawRules)) return [];

  return rawRules
    .map((rule, index) => {
      const keywords = extractRuleKeywords(rule);
      const isActive =
        rule?.isActive === undefined && rule?.active === undefined
          ? true
          : Boolean(rule?.isActive ?? rule?.active);

      return {
        id: String(rule?._id || rule?.id || rule?.slug || `restricted-${index}`),
        name: String(rule?.name || rule?.title || rule?.areaName || "").trim(),
        message: String(rule?.message || rule?.description || rule?.note || "").trim(),
        keywords,
        isActive,
        raw: rule,
      };
    })
    .filter((rule) => rule.isActive && rule.keywords.length);
}

export function getFallbackRestrictedAreaRules() {
  return FALLBACK_RESTRICTED_RULES.map((rule) => ({
    ...rule,
    isActive: true,
    raw: rule,
  }));
}

export function evaluateRestrictedArea(locationText, rules = []) {
  const normalizedLocation = normalizeKeyword(locationText);

  if (!normalizedLocation) {
    return {
      isRestricted: false,
      message: "",
      matchedRule: null,
      matchedKeyword: "",
    };
  }

  for (const rule of rules) {
    const matchedKeyword = (rule?.keywords || []).find((keyword) =>
      normalizedLocation.includes(keyword)
    );

    if (matchedKeyword) {
      return {
        isRestricted: true,
        message:
          rule?.message ||
          "This location is currently outside the standard service coverage.",
        matchedRule: rule,
        matchedKeyword,
      };
    }
  }

  return {
    isRestricted: false,
    message: "",
    matchedRule: null,
    matchedKeyword: "",
  };
}
