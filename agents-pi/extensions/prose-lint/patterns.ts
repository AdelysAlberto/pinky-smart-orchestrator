/**
 * Banned prose patterns, derived from Wikipedia:Signs_of_AI_writing.
 *
 * Each pattern belongs to one numbered rule of the WRITING block in
 * `APPEND_SYSTEM.md`. The list is descriptive of a writing habit, never a ban on
 * the literal word: `robust` in a paragraph about error handling is a fact, and
 * `robust` as decoration is the tell. Hits are reported, not blocked.
 */

export type RuleId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface ProsePattern {
	readonly rule: RuleId;
	readonly label: string;
	readonly re: RegExp;
}

export const RULE_TITLES: Readonly<Record<RuleId, string>> = {
	1: "empty significance / legacy framing",
	2: "tail participle analysis",
	3: "ad-speak or AI vocabulary",
	4: "copula dodge",
	5: "negative parallelism",
	6: "formulaic heading",
	7: "vague linkage or attribution",
	8: "meta-commentary about the writing",
};

/** Structural checks that need a count rather than a match. */
export interface ProseThreshold {
	readonly rule: RuleId;
	readonly label: string;
	readonly metric: "emDash" | "bold";
	/** Minimum words (or lines) that must separate two occurrences. */
	readonly limit: number;
	readonly unit: "words" | "lines";
}

/** One reported occurrence, positioned by line in the authored text. */
export interface ProseHit {
	readonly rule: RuleId;
	readonly label: string;
	readonly line: number;
	readonly excerpt: string;
}

export const PATTERNS: readonly ProsePattern[] = [
	{
		rule: 1,
		label: '"serves as a testament/symbol/monument"',
		re: /\b(?:serves?|stands?) as (?:a |an |the )?(?:testament|reminder|symbol|monument|beacon|cornerstone)\b/i,
	},
	{ rule: 1, label: '"a testament to"', re: /\b(?:a |an )?testament to\b/i },
	{
		rule: 1,
		label: '"played a pivotal/crucial/key role"',
		re: /\bplay(?:s|ed|ing)? (?:a |an )?(?:pivotal|crucial|vital|critical|key|significant|central) (?:role|part)\b/i,
	},
	{
		rule: 1,
		label: '"underscores/highlights its importance"',
		re: /\b(?:underscor|highlight|emphasi[sz])(?:es|ed|ing)? (?:its|their|the) (?:importance|significance|value|relevance)\b/i,
	},
	{ rule: 1, label: '"reflects a broader ..."', re: /\breflect(?:s|ed|ing)? (?:a |the )?broader\b/i },
	{ rule: 1, label: '"setting the stage for"', re: /\bsetting the stage for\b/i },
	{ rule: 1, label: '"marks a shift / turning point"', re: /\bmarks? a (?:major |significant |key )?(?:shift|turning point|departure)\b/i },
	{ rule: 1, label: '"turning point"', re: /\bturning point\b/i },
	{ rule: 1, label: '"evolving landscape"', re: /\b(?:evolving|changing|shifting) landscape\b/i },
	{ rule: 1, label: '"indelible mark"', re: /\bindelible (?:mark|impression)\b/i },
	{ rule: 1, label: '"lasting legacy"', re: /\b(?:lasting|enduring) legacy\b/i },
	{ rule: 1, label: '"deeply rooted in"', re: /\bdeeply rooted in\b/i },
	{
		rule: 2,
		label: 'tail participle clause (", -ing ...")',
		re: /,\s+(?:highlighting|underscoring|emphasi[sz]ing|ensuring|reflecting|symbolizing|contributing to|fostering|enhancing|showcasing|demonstrating|cementing|solidifying|positioning|marking|paving the way|serving as)\b/i,
	},
	{ rule: 2, label: '"paving the way for"', re: /\bpav(?:e|es|ed|ing) the way for\b/i },
	{ rule: 2, label: '"plays a role in the broader"', re: /\bin the broader (?:context|landscape|discussion|debate)\b/i },
	{
		rule: 3,
		label: 'ad-speak ("boasts", "nestled", "vibrant", "renowned")',
		re: /\b(?:boasts?|nestled|vibrant|rich heritage|groundbreaking|renowned|world-class|cutting-edge|state-of-the-art|unparalleled|best-in-class)\b/i,
	},
	{ rule: 3, label: '"a diverse array of"', re: /\ba diverse (?:array|range) of\b/i },
	{ rule: 3, label: '"in the heart of"', re: /\bin the heart of\b/i },
	{ rule: 3, label: '"showcasing"', re: /\bshowcas(?:e|es|ed|ing)\b/i },
	{ rule: 3, label: '"delve / deep dive"', re: /\b(?:delve[sd]?|delving|deep dive|deep-dive)\b/i },
	{ rule: 3, label: '"intricate / intricacies"', re: /\bintricac(?:y|ies)\b|\bintricate(?:ly)?\b/i },
	{ rule: 3, label: '"tapestry"', re: /\btapestry\b/i },
	{ rule: 3, label: '"seamless(ly)"', re: /\bseamless(?:ly)?\b/i },
	{ rule: 3, label: '"robust"', re: /\brobust(?:ly|ness)?\b/i },
	{ rule: 3, label: '"meticulous(ly)"', re: /\bmeticulous(?:ly)?\b/i },
	{ rule: 3, label: '"leverage"', re: /\bleverag(?:e|es|ed|ing)\b/i },
	{ rule: 3, label: '"valuable insights"', re: /\bvaluable insights?\b/i },
	{ rule: 3, label: '"enabling/empowering"', re: /\b(?:empowering|unlocking|harnessing) the (?:power|potential)\b/i },
	{ rule: 4, label: '"serves as / functions as / operates as"', re: /\b(?:serves?|function(?:s|ed|ing)?|operat(?:es|ed|ing)) as\b/i },
	{ rule: 4, label: '"holds the distinction of"', re: /\bhold(?:s|ing)? the distinction of\b/i },
	{ rule: 4, label: '"constitutes / represents a"', re: /\b(?:constitutes?|represents?)\s+(?:a|an|the)\b/i },
	{ rule: 4, label: '"features / maintains (neutral "has")"', re: /\b(?:maintains|features)\s+(?:a|an|the)\b/i },
	{
		rule: 5,
		label: '"not just X but Y" / "not only X but also Y"',
		re: /\bnot (?:just|only|merely|simply)\b[^.!?\n]{0,80}\bbut\b/i,
	},
	{ rule: 5, label: '"not X, it\'s Y"', re: /\b(?:is|was)(?:n't| not) (?:just |only |about |a )?[^.!?\n]{0,60},?\s*(?:it'?s|they'?re) (?:a |an |about )?/i },
	{ rule: 5, label: '"isn\'t about X, it\'s about Y"', re: /\bisn'?t about\b[^.!?\n]{0,80}\bit'?s about\b/i },
	{ rule: 5, label: '"not X — Y" em-dash assertion', re: /\bnot\b[^.!?\n]{0,40}\s—\s/i },
	{ rule: 6, label: 'formulaic heading text', re: /^#{1,6}\s+.*\b(?:legacy|recognition|future outlook|future prospects|key takeaways|conclusion|final thoughts|lessons learned|challenges and)\b/i },
	{
		rule: 6,
		label: 'formulaic "X and Y" heading',
		re: /^#{1,6}\s+[\w'’ -]{2,30}\s+and\s+(?:recognition|legacy|impact|influence|future|prospects|challenges|opportunities|conclusion|summary|takeaways)\s*$/i,
	},
	{
		rule: 7,
		label: '"associated with" (vague linkage)',
		re: /\b(?:is|are|was|were|been) (?:often |widely |generally |also )?associated with\b/i,
	},
	{ rule: 7, label: '"in connection with"', re: /\bin connection with\b/i },
	{
		rule: 7,
		label: 'unnamed authority ("experts argue", "sources say")',
		re: /\b(?:experts|sources|critics|observers|analysts|researchers|scholars|industry reports|publications|outlets)\s+(?:say|says|argue|argues|note|notes|suggest|suggests|indicate|indicates|have (?:cited|noted|argued|described))\b/i,
	},
	{ rule: 7, label: '"several publications/sources"', re: /\b(?:several|multiple|various|numerous) (?:publications|sources|outlets|media outlets)\b/i },
	{ rule: 7, label: '"widely regarded as"', re: /\bwidely (?:regarded|considered|seen|recognized) as\b/i },
	{ rule: 7, label: '"has been profiled/featured in"', re: /\bhas been (?:profiled|featured|cited|covered) in\b/i },
	{ rule: 7, label: '"maintains an active social media presence"', re: /\b(?:active|strong) (?:social media|digital) presence\b/i },
	{ rule: 7, label: '"independent coverage"', re: /\bindependent (?:coverage|sources)\b/i },
	{
		rule: 8,
		label: '"based on available information" / "details are scarce"',
		re: /\bbased on (?:the )?available (?:information|sources|data)\b|\b(?:details|information) (?:are|is|remain) (?:limited|scarce|not widely)\b/i,
	},
	{ rule: 8, label: '"should be treated as X rather than Y"', re: /\bshould be (?:treated|read|understood|presented) as\b/i },
	{ rule: 8, label: '"while not exhaustive"', re: /\bwhile not (?:exhaustive|definitive|conclusive)\b/i },
	{ rule: 8, label: '"in the provided sources"', re: /\bin the (?:provided|available) (?:sources|context|material|search results)\b/i },
	{ rule: 8, label: '"as an AI" / self-reference', re: /\bas an? (?:AI|language model|assistant)\b/i },
	{ rule: 8, label: '"I cannot / I don\'t have access"', re: /\bI (?:cannot|can't|do not|don't) (?:have access|browse|access|provide medical|verify)\b/i },
];

/**
 * Thresholds measured over the whole text. Only density of em dashes is kept:
 * boldface is a real tell in an article and a structural marker in rules docs,
 * so counting it fired on every `AGENTS.md` and buried the useful hits.
 */
export const THRESHOLDS: readonly ProseThreshold[] = [
	{ rule: 8, label: "em dash", metric: "emDash", unit: "words", limit: 120 },
];
