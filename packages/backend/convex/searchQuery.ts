export type SearchComparator = "=" | ">" | ">=";

export type NumericConstraint = {
	comparator: SearchComparator;
	value: number;
};

export type SearchFilters = {
	authors: string[];
	bodies: string[];
	hasAnswers: boolean;
	minimumAnswers: NumericConstraint | null;
	minimumScore: NumericConstraint | null;
	tags: string[];
	titles: string[];
};

export type ParsedSearchQuery = {
	filters: SearchFilters;
	malformed: Array<{
		operator: string;
		rawValue: string;
		reason: "invalid_number" | "missing_value" | "unsupported_value";
	}>;
	raw: string;
	semanticText: string;
	textConstraints: {
		exactPhrases: string[];
		excludedTerms: string[];
	};
};

export type SearchDocument = {
	answerCount: number;
	author: {
		description: string;
		name: string;
		owner: string;
		slug: string;
	};
	bodyMarkdown: string;
	createdAt: number;
	score: number;
	searchText: string;
	tagSlugs: string[];
	title: string;
};

const FIELD_OPERATORS = new Set(["tag", "author", "title", "body"]);

export function normalizeSearchText(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugifyTag(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/['"`]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function createParsedSearchQuery(raw: string): ParsedSearchQuery {
	return {
		filters: {
			authors: [],
			bodies: [],
			hasAnswers: false,
			minimumAnswers: null,
			minimumScore: null,
			tags: [],
			titles: [],
		},
		malformed: [],
		raw,
		semanticText: "",
		textConstraints: {
			exactPhrases: [],
			excludedTerms: [],
		},
	};
}

function readToken(input: string, startIndex: number) {
	let index = startIndex;
	while (index < input.length && !/\s/u.test(input[index] ?? "")) {
		index += 1;
	}
	return {
		nextIndex: index,
		value: input.slice(startIndex, index),
	};
}

function readPhrase(input: string, startIndex: number) {
	let index = startIndex;
	let value = "";

	while (index < input.length) {
		const character = input[index] ?? "";
		if (character === '"') {
			return {
				closed: true,
				nextIndex: index + 1,
				value,
			};
		}
		value += character;
		index += 1;
	}

	return {
		closed: false,
		nextIndex: input.length,
		value,
	};
}

function parseNumericConstraint(value: string) {
	const match = value.match(/^(>=|>|=)?(-?\d+)$/u);
	if (!match) {
		return null;
	}

	return {
		comparator: (match[1] as SearchComparator | undefined) ?? ">=",
		value: Number(match[2]),
	} satisfies NumericConstraint;
}

function appendSemanticPart(parts: string[], value: string) {
	const normalized = normalizeSearchText(value);
	if (normalized) {
		parts.push(normalized);
	}
}

function pushMalformed(
	parsed: ParsedSearchQuery,
	operator: string,
	rawValue: string,
	reason: "invalid_number" | "missing_value" | "unsupported_value",
) {
	parsed.malformed.push({
		operator,
		rawValue,
		reason,
	});
}

export function parseSearchQuery(raw: string | undefined) {
	const parsed = createParsedSearchQuery(raw ?? "");
	const input = raw?.trim() ?? "";
	const semanticParts: string[] = [];
	let index = 0;

	while (index < input.length) {
		const character = input[index] ?? "";
		if (/\s/u.test(character)) {
			index += 1;
			continue;
		}

		if (character === "-" && input[index + 1] === '"') {
			const phrase = readPhrase(input, index + 2);
			appendSemanticPart([], phrase.value);
			if (phrase.value.trim()) {
				parsed.textConstraints.excludedTerms.push(
					normalizeSearchText(phrase.value),
				);
			}
			index = phrase.nextIndex;
			continue;
		}

		if (character === "-") {
			const token = readToken(input, index + 1);
			if (token.value.trim()) {
				parsed.textConstraints.excludedTerms.push(
					normalizeSearchText(token.value),
				);
			}
			index = token.nextIndex;
			continue;
		}

		if (character === '"') {
			const phrase = readPhrase(input, index + 1);
			const normalizedPhrase = normalizeSearchText(phrase.value);
			if (normalizedPhrase) {
				parsed.textConstraints.exactPhrases.push(normalizedPhrase);
				appendSemanticPart(semanticParts, normalizedPhrase);
			}
			index = phrase.nextIndex;
			continue;
		}

		const operatorMatch = input.slice(index).match(/^([a-z]+):/u);
		if (operatorMatch) {
			const operator = operatorMatch[1] ?? "";
			const valueStart = index + operator.length + 1;
			let nextIndex = valueStart;
			let rawValue = "";

			if (input[valueStart] === '"') {
				const phrase = readPhrase(input, valueStart + 1);
				rawValue = phrase.value;
				nextIndex = phrase.nextIndex;
			} else {
				const token = readToken(input, valueStart);
				rawValue = token.value;
				nextIndex = token.nextIndex;
			}

			if (FIELD_OPERATORS.has(operator)) {
				if (!rawValue.trim()) {
					pushMalformed(parsed, operator, rawValue, "missing_value");
				} else {
					const normalizedValue =
						operator === "tag"
							? slugifyTag(rawValue)
							: normalizeSearchText(rawValue);
					if (!normalizedValue) {
						pushMalformed(parsed, operator, rawValue, "missing_value");
					} else if (operator === "tag") {
						parsed.filters.tags.push(normalizedValue);
					} else if (operator === "author") {
						parsed.filters.authors.push(normalizedValue);
					} else if (operator === "title") {
						parsed.filters.titles.push(normalizedValue);
					} else if (operator === "body") {
						parsed.filters.bodies.push(normalizedValue);
					}
				}
				index = nextIndex;
				continue;
			}

			if (operator === "has") {
				const normalizedValue = normalizeSearchText(rawValue);
				if (!normalizedValue) {
					pushMalformed(parsed, operator, rawValue, "missing_value");
				} else if (normalizedValue === "answers") {
					parsed.filters.hasAnswers = true;
				} else {
					pushMalformed(parsed, operator, rawValue, "unsupported_value");
				}
				index = nextIndex;
				continue;
			}

			if (operator === "score" || operator === "answers") {
				const constraint = parseNumericConstraint(rawValue.trim());
				if (!rawValue.trim()) {
					pushMalformed(parsed, operator, rawValue, "missing_value");
				} else if (!constraint) {
					pushMalformed(parsed, operator, rawValue, "invalid_number");
				} else if (operator === "score") {
					parsed.filters.minimumScore = constraint;
				} else {
					parsed.filters.minimumAnswers = constraint;
				}
				index = nextIndex;
				continue;
			}
		}

		const token = readToken(input, index);
		appendSemanticPart(semanticParts, token.value);
		index = token.nextIndex;
	}

	parsed.semanticText = semanticParts.join(" ").trim();
	return parsed;
}

export function mergeExternalTagConstraint(
	parsed: ParsedSearchQuery,
	tag: string | undefined,
) {
	const normalizedTag = tag ? slugifyTag(tag) : "";
	if (!normalizedTag) {
		return parsed;
	}

	return {
		...parsed,
		filters: {
			...parsed.filters,
			tags: [...parsed.filters.tags, normalizedTag],
		},
	} satisfies ParsedSearchQuery;
}

function compareNumericConstraint(
	value: number,
	constraint: NumericConstraint,
) {
	if (constraint.comparator === "=") {
		return value === constraint.value;
	}
	if (constraint.comparator === ">") {
		return value > constraint.value;
	}
	return value >= constraint.value;
}

export function hasHardConstraints(parsed: ParsedSearchQuery) {
	return Boolean(
		parsed.filters.tags.length ||
			parsed.filters.authors.length ||
			parsed.filters.titles.length ||
			parsed.filters.bodies.length ||
			parsed.filters.hasAnswers ||
			parsed.filters.minimumScore ||
			parsed.filters.minimumAnswers ||
			parsed.textConstraints.exactPhrases.length ||
			parsed.textConstraints.excludedTerms.length,
	);
}

export function matchesSearchDocument(
	document: SearchDocument,
	parsed: ParsedSearchQuery,
) {
	const normalizedTitle = normalizeSearchText(document.title);
	const normalizedBody = normalizeSearchText(document.bodyMarkdown);
	const normalizedAuthor = normalizeSearchText(
		[
			document.author.name,
			document.author.slug,
			document.author.owner,
			document.author.description,
		].join(" "),
	);
	const normalizedSearchText = normalizeSearchText(document.searchText);

	if (parsed.filters.tags.some((tag) => !document.tagSlugs.includes(tag))) {
		return false;
	}

	if (
		parsed.filters.authors.some(
			(authorValue) => !normalizedAuthor.includes(authorValue),
		)
	) {
		return false;
	}

	if (
		parsed.filters.titles.some(
			(titleValue) => !normalizedTitle.includes(titleValue),
		)
	) {
		return false;
	}

	if (
		parsed.filters.bodies.some(
			(bodyValue) => !normalizedBody.includes(bodyValue),
		)
	) {
		return false;
	}

	if (
		parsed.textConstraints.exactPhrases.some(
			(phrase) => !normalizedSearchText.includes(phrase),
		)
	) {
		return false;
	}

	if (
		parsed.textConstraints.excludedTerms.some((term) =>
			normalizedSearchText.includes(term),
		)
	) {
		return false;
	}

	if (parsed.filters.hasAnswers && document.answerCount <= 0) {
		return false;
	}

	if (
		parsed.filters.minimumScore &&
		!compareNumericConstraint(document.score, parsed.filters.minimumScore)
	) {
		return false;
	}

	if (
		parsed.filters.minimumAnswers &&
		!compareNumericConstraint(
			document.answerCount,
			parsed.filters.minimumAnswers,
		)
	) {
		return false;
	}

	return true;
}

export function compareConstraintOnlyDocuments(
	left: Pick<SearchDocument, "createdAt" | "score">,
	right: Pick<SearchDocument, "createdAt" | "score">,
) {
	if (right.createdAt !== left.createdAt) {
		return right.createdAt - left.createdAt;
	}

	return right.score - left.score;
}

export function cosineSimilarity(left: number[], right: number[]) {
	let dotProduct = 0;
	let leftMagnitude = 0;
	let rightMagnitude = 0;

	for (let index = 0; index < left.length; index += 1) {
		const leftValue = left[index] ?? 0;
		const rightValue = right[index] ?? 0;
		dotProduct += leftValue * rightValue;
		leftMagnitude += leftValue * leftValue;
		rightMagnitude += rightValue * rightValue;
	}

	if (leftMagnitude === 0 || rightMagnitude === 0) {
		return 0;
	}

	return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}
