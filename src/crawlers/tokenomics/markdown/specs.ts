import { PROVENANCE_FIELDS, type CollectionSpec } from "./records.js";

// Field specs for every entity collection (content/markdown/<file>.md).
// One spec drives both compose and derive, so the two cannot drift.

const P = PROVENANCE_FIELDS;

export const STAGES: CollectionSpec = {
  collection: "stages",
  heading: "Tokenomics stages",
  titleKey: "name",
  fields: [
    { key: "scope", type: "text" },
    { key: "key_question", type: "text" },
    ...P,
  ],
};

export const LAYERS: CollectionSpec = {
  collection: "layers",
  heading: "The Five-Layer Tokenomics Stack",
  titleKey: "name",
  fields: [
    { key: "number", type: "int" },
    { key: "table_label", type: "text" },
    { key: "multiplier_effect", type: "text" },
    { key: "moves_multiplier", type: "bool" },
    { key: "key_metric", type: "text" },
    ...P,
    { key: "primary_levers", type: "list" },
    { key: "description_md", type: "md" },
    { key: "components", type: "json" },
    { key: "tooling_md", type: "md?" },
  ],
};

export const BIGT_VARIABLES: CollectionSpec = {
  collection: "bigt-variables",
  heading: "Big-T notation variables",
  titleKey: "name",
  fields: [
    { key: "symbol", type: "text" },
    { key: "description", type: "text" },
    ...P,
  ],
};

export const BIGT_CLASSES: CollectionSpec = {
  collection: "bigt-classes",
  heading: "Big-T complexity ladder",
  titleKey: "notation",
  fields: [
    { key: "order", type: "int" },
    { key: "name", type: "text" },
    { key: "headline", type: "text" },
    { key: "description", type: "text" },
    { key: "fix", type: "text" },
    ...P,
  ],
};

export const LEVERS: CollectionSpec = {
  collection: "levers",
  heading: "Consumption and efficiency levers",
  titleKey: "name",
  fields: [
    { key: "kind", type: "text" },
    { key: "layer", type: "int?" },
    { key: "effect", type: "text?" },
    ...P,
    { key: "bigt_classes", type: "list" },
    { key: "description_md", type: "md" },
  ],
};

export const METRICS: CollectionSpec = {
  collection: "metrics",
  heading: "Reference metrics",
  titleKey: "name",
  fields: [
    { key: "formula", type: "text?" },
    { key: "formula_text", type: "text?" },
    ...P,
    { key: "inputs", type: "list" },
    { key: "targets", type: "list" },
    { key: "definition_md", type: "md" },
  ],
};

export const PERSONAS: CollectionSpec = {
  collection: "personas",
  heading: "Tokenomics personas",
  titleKey: "name",
  fields: [
    { key: "core", type: "bool" },
    { key: "responsibility", type: "text" },
    ...P,
    { key: "stages", type: "list" },
    { key: "signals", type: "list" },
    { key: "description_md", type: "md" },
  ],
};

export const VALUE_CATEGORIES: CollectionSpec = {
  collection: "value-categories",
  heading: "Value outcome categories",
  titleKey: "name",
  fields: [
    { key: "group", type: "text" },
    { key: "description", type: "text" },
    { key: "estimate_as", type: "text?" },
    ...P,
  ],
};

export const BOOKING_DESTINATIONS: CollectionSpec = {
  collection: "booking-destinations",
  heading: "Value booking destinations",
  titleKey: "name",
  fields: [{ key: "description", type: "text" }, ...P],
};

export const GLOSSARY: CollectionSpec = {
  collection: "glossary",
  heading: "Glossary",
  titleKey: "term",
  fields: [{ key: "definition", type: "text" }, ...P],
};

export const FOCUS_TRACKER: CollectionSpec = {
  collection: "focus-tracker",
  heading: "FOCUS 1.5 AI tracker",
  titleKey: "title",
  fields: [
    { key: "bucket", type: "text" },
    { key: "kind", type: "text" },
    ...P,
    { key: "labels", type: "list" },
    { key: "identifiers", type: "list" },
    { key: "links", type: "list" },
    { key: "body_md", type: "md" },
  ],
};

export const CACHE_PROVIDERS: CollectionSpec = {
  collection: "cache-providers",
  heading: "Provider prompt-cache behavior snapshot",
  titleKey: "provider",
  fields: [
    { key: "write_charge", type: "text" },
    { key: "read_charge", type: "text" },
    { key: "minimum_prefix", type: "text" },
    { key: "lifetime_notes", type: "text" },
    { key: "reviewed", type: "text" },
    ...P,
  ],
};

/** content/markdown/<file> → spec, in emit order. */
export const COLLECTION_FILES: [string, CollectionSpec][] = [
  ["stages.md", STAGES],
  ["layers.md", LAYERS],
  ["bigt-variables.md", BIGT_VARIABLES],
  ["bigt-classes.md", BIGT_CLASSES],
  ["levers.md", LEVERS],
  ["metrics.md", METRICS],
  ["personas.md", PERSONAS],
  ["value-categories.md", VALUE_CATEGORIES],
  ["booking-destinations.md", BOOKING_DESTINATIONS],
  ["glossary.md", GLOSSARY],
  ["focus-tracker.md", FOCUS_TRACKER],
  ["cache-providers.md", CACHE_PROVIDERS],
];
export type { CollectionSpec as CollectionSpecT } from "./records.js";
