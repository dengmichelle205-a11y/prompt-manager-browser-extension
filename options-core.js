const promptListEl = document.getElementById("promptList");
const filterChipsEl = document.getElementById("filterChips");
const searchInput = document.getElementById("searchInput");
const addPromptBtn = document.getElementById("addPromptBtn");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const promptDialog = document.getElementById("promptDialog");
const promptForm = document.getElementById("promptForm");
const dialogTitle = document.getElementById("dialogTitle");
const titleInput = document.getElementById("titleInput");
const contentInput = document.getElementById("contentInput");
const favoriteInput = document.getElementById("favoriteInput");
const cancelBtn = document.getElementById("cancelBtn");
const cardTemplate = document.getElementById("cardTemplate");
const selectedTagsEl = document.getElementById("selectedTags");
const tagInput = document.getElementById("tagInput");
const tagSuggestionsEl = document.getElementById("tagSuggestions");
const tagColorDialog = document.getElementById("tagColorDialog");
const tagColorForm = document.getElementById("tagColorForm");
const tagColorNameEl = document.getElementById("tagColorName");
const tagColorInput = document.getElementById("tagColorInput");
const tagColorPresetsEl = document.getElementById("tagColorPresets");
const tagColorPreviewEl = document.getElementById("tagColorPreview");
const tagColorValueEl = document.getElementById("tagColorValue");
const resetTagColorBtn = document.getElementById("resetTagColorBtn");
const cancelTagColorBtn = document.getElementById("cancelTagColorBtn");

const FILTER_ALL = "\u5168\u90e8";
const FILTER_FAVORITE = "\u6536\u85cf";

const TAG_COLORS_KEY = "tagColors";
const PROMPTS_KEY = "prompts";
const PROMPT_MIGRATION_KEY = "promptSyncMigratedToLocal";
const DEFAULT_TAG_COLOR = "#e2e9e5";
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ITEMS = 5000;
const MAX_TITLE_LENGTH = 500;
const MAX_CONTENT_LENGTH = 100000;
const MAX_TAGS_PER_PROMPT = 50;
const MAX_TAG_LENGTH = 100;
const BLOCKED_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const MORANDI_PRESET_TAG_COLORS = [
  { name: "Ochre", value: "#eaaa60" },
  { name: "Salmon", value: "#e68b81" },
  { name: "Lavender", value: "#b7b2d0" },
  { name: "Dusty Blue", value: "#7da6c6" },
  { name: "Seafoam", value: "#84c3b7" }
];

const state = {
  prompts: [],
  search: "",
  activeFilters: new Set([FILTER_ALL]),
  editingId: null,
  selectedTags: [],
  suggestionList: [],
  suggestionIndex: -1,
  tagColors: {},
  colorEditingTag: null
};

function normalizeTag(tag) {
  return String(tag || "").trim();
}

function normalizeTagList(tags) {
  const seen = new Set();
  const output = [];
  for (const raw of tags) {
    const clean = normalizeTag(raw).slice(0, MAX_TAG_LENGTH);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(clean);
  }
  return output;
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeColorValue(color) {
  const value = String(color || "").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return "";
  return value.toLowerCase();
}

function sanitizeTagColors(raw) {
  const next = Object.create(null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return next;

  for (const [tag, color] of Object.entries(raw)) {
    const key = normalizeTag(tag).toLowerCase();
    const hex = normalizeColorValue(color);
    if (!key || !hex || BLOCKED_OBJECT_KEYS.has(key)) continue;
    next[key] = hex;
  }
  return next;
}

function hexToRgb(hex) {
  const clean = normalizeColorValue(hex);
  if (!clean) return null;
  const value = clean.slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function rgbaFromHex(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "";
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function shadeHex(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "";
  const toHex = (value) => clampChannel(value).toString(16).padStart(2, "0");
  return `#${toHex(rgb.r + amount)}${toHex(rgb.g + amount)}${toHex(rgb.b + amount)}`;
}

function getRelativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1;
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function buildTagPalette(hex) {
  const color = normalizeColorValue(hex) || DEFAULT_TAG_COLOR;
  const lightColor = getRelativeLuminance(color) > 0.45;
  const text = lightColor ? shadeHex(color, -120) : shadeHex(color, -35);
  return {
    chipBg: rgbaFromHex(color, 0.16),
    chipBorder: rgbaFromHex(color, 0.38),
    chipText: text,
    chipActiveBg: rgbaFromHex(color, 0.3),
    chipActiveBorder: rgbaFromHex(color, 0.58),
    chipActiveGlow: rgbaFromHex(color, 0.2),
    tagBg: rgbaFromHex(color, 0.14),
    tagBorder: rgbaFromHex(color, 0.34),
    tagText: text,
    selectedTagBg: rgbaFromHex(color, 0.2),
    selectedTagBorder: rgbaFromHex(color, 0.42),
    selectedTagText: text
  };
}

function clearTagPalette(element, keys) {
  for (const key of keys) {
    element.style.removeProperty(key);
  }
}

function applyTagPalette(element, tag, type = "tag") {
  const color = state.tagColors[normalizeTag(tag).toLowerCase()];
  if (!color) {
    if (type === "chip") {
      clearTagPalette(element, [
        "--chip-bg",
        "--chip-border",
        "--chip-text",
        "--chip-active-bg",
        "--chip-active-border",
        "--chip-active-glow"
      ]);
      return;
    }
    if (type === "selected-tag") {
      clearTagPalette(element, [
        "--selected-tag-bg",
        "--selected-tag-border",
        "--selected-tag-text"
      ]);
      return;
    }
    clearTagPalette(element, ["--tag-bg", "--tag-border", "--tag-text"]);
    return;
  }

  const palette = buildTagPalette(color);
  if (type === "chip") {
    element.style.setProperty("--chip-bg", palette.chipBg);
    element.style.setProperty("--chip-border", palette.chipBorder);
    element.style.setProperty("--chip-text", palette.chipText);
    element.style.setProperty("--chip-active-bg", palette.chipActiveBg);
    element.style.setProperty("--chip-active-border", palette.chipActiveBorder);
    element.style.setProperty("--chip-active-glow", palette.chipActiveGlow);
    return;
  }

  if (type === "selected-tag") {
    element.style.setProperty("--selected-tag-bg", palette.selectedTagBg);
    element.style.setProperty("--selected-tag-border", palette.selectedTagBorder);
    element.style.setProperty("--selected-tag-text", palette.selectedTagText);
    return;
  }

  element.style.setProperty("--tag-bg", palette.tagBg);
  element.style.setProperty("--tag-border", palette.tagBorder);
  element.style.setProperty("--tag-text", palette.tagText);
}

function isEditableTag(tag) {
  return !!normalizeTag(tag) && tag !== FILTER_ALL && tag !== FILTER_FAVORITE;
}

function normalizePrompt(item, now) {
  const original = item && typeof item === "object" ? item : {};
  const legacyCategory = normalizeTag(original.category);
  const tags = normalizeTagList([
    ...(Array.isArray(original.tags) ? original.tags : []),
    legacyCategory
  ]);

  const usageCount = Number(original.usageCount);
  const createdAt = typeof original.createdAt === "string" && !Number.isNaN(Date.parse(original.createdAt))
    ? original.createdAt
    : now;
  const updatedAt = typeof original.updatedAt === "string" && !Number.isNaN(Date.parse(original.updatedAt))
    ? original.updatedAt
    : createdAt;

  return {
    id: typeof original.id === "string" && original.id.trim()
      ? original.id.trim().slice(0, 200)
      : crypto.randomUUID(),
    title: String(original.title || "\u672a\u547d\u540d").slice(0, MAX_TITLE_LENGTH),
    content: String(original.content || "").slice(0, MAX_CONTENT_LENGTH),
    tags: tags.slice(0, MAX_TAGS_PER_PROMPT),
    favorite: !!original.favorite,
    createdAt,
    updatedAt,
    usageCount: Number.isFinite(usageCount) && usageCount >= 0 ? Math.floor(usageCount) : 0
  };
}

function getPromptKey(prompt) {
  if (prompt && typeof prompt.id === "string" && prompt.id.trim()) {
    return `id:${prompt.id.trim()}`;
  }

  const title = String(prompt?.title || "").trim().toLowerCase();
  const content = String(prompt?.content || "").trim().toLowerCase();
  const tags = normalizeTagList(Array.isArray(prompt?.tags) ? prompt.tags : [])
    .map((tag) => tag.toLowerCase())
    .sort()
    .join("|");
  return `sig:${title}::${content}::${tags}`;
}

function getPromptTimeValue(prompt) {
  const updatedAt = Date.parse(prompt?.updatedAt || "");
  if (!Number.isNaN(updatedAt)) return updatedAt;
  const createdAt = Date.parse(prompt?.createdAt || "");
  if (!Number.isNaN(createdAt)) return createdAt;
  return 0;
}

function mergePromptLists(localPrompts, syncPrompts, now) {
  const mergedByKey = new Map();

  for (const source of [localPrompts, syncPrompts]) {
    for (const item of source) {
      const normalized = normalizePrompt(item, now);
      if (!normalized.content.trim()) continue;

      const key = getPromptKey(normalized);
      const existing = mergedByKey.get(key);
      if (!existing) {
        mergedByKey.set(key, normalized);
        continue;
      }

      if (getPromptTimeValue(normalized) >= getPromptTimeValue(existing)) {
        mergedByKey.set(key, normalized);
      }
    }
  }

  return [...mergedByKey.values()];
}

async function getRawPrompts() {
  const stored = await chrome.storage.local.get(PROMPTS_KEY);
  const prompts = stored[PROMPTS_KEY];
  return Array.isArray(prompts) ? prompts : [];
}

async function getTagColors() {
  const stored = await chrome.storage.sync.get(TAG_COLORS_KEY);
  return sanitizeTagColors(stored[TAG_COLORS_KEY]);
}

function normalizePromptCollection(prompts, now) {
  return (Array.isArray(prompts) ? prompts : [])
    .map((item) => normalizePrompt(item, now))
    .filter((item) => item.content.trim().length > 0);
}

function arePromptListsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function persistPrompts(prompts) {
  const now = new Date().toISOString();
  const normalizedNext = normalizePromptCollection(prompts, now);
  const currentRaw = await getRawPrompts();
  const normalizedCurrent = normalizePromptCollection(currentRaw, now);

  if (arePromptListsEqual(normalizedCurrent, normalizedNext)) {
    state.prompts = normalizedNext;
    return normalizedNext;
  }

  await chrome.storage.local.set({ [PROMPTS_KEY]: normalizedNext });
  state.prompts = normalizedNext;
  return normalizedNext;
}

async function setPrompts(prompts) {
  return persistPrompts(prompts);
}

async function setTagColors(tagColors) {
  const normalized = sanitizeTagColors(tagColors);
  await chrome.storage.sync.set({ [TAG_COLORS_KEY]: normalized });
  state.tagColors = normalized;
}

async function migrateStorageToSync() {
  const [syncStored, localStored] = await Promise.all([
    chrome.storage.sync.get([PROMPTS_KEY, TAG_COLORS_KEY]),
    chrome.storage.local.get([PROMPTS_KEY, TAG_COLORS_KEY, PROMPT_MIGRATION_KEY])
  ]);

  const nextSync = {};
  const syncPrompts = syncStored[PROMPTS_KEY];
  const syncTagColors = sanitizeTagColors(syncStored[TAG_COLORS_KEY]);
  const localPrompts = localStored[PROMPTS_KEY];
  const localTagColors = sanitizeTagColors(localStored[TAG_COLORS_KEY]);
  const promptMigrationDone = !!localStored[PROMPT_MIGRATION_KEY];

  if (!promptMigrationDone) {
    const now = new Date().toISOString();
    const normalizedLocalPrompts = Array.isArray(localPrompts)
      ? localPrompts.map((item) => normalizePrompt(item, now)).filter((item) => item.content.trim())
      : [];
    const normalizedSyncPrompts = Array.isArray(syncPrompts)
      ? syncPrompts.map((item) => normalizePrompt(item, now)).filter((item) => item.content.trim())
      : [];
    const mergedPrompts = mergePromptLists(normalizedLocalPrompts, normalizedSyncPrompts, now);

    if (!arePromptListsEqual(mergedPrompts, normalizedLocalPrompts)) {
      await setPrompts(mergedPrompts);
    }

    if (normalizedSyncPrompts.length > 0) {
      await chrome.storage.sync.remove(PROMPTS_KEY);
    }

    await chrome.storage.local.set({ [PROMPT_MIGRATION_KEY]: true });
  }

  if (Object.keys(syncTagColors).length === 0 && Object.keys(localTagColors).length > 0) {
    nextSync[TAG_COLORS_KEY] = localTagColors;
  }

  if (Object.keys(nextSync).length > 0) {
    await chrome.storage.sync.set(nextSync);
  }
}

async function loadPromptsWithMigration() {
  await migrateStorageToSync();
  const raw = await getRawPrompts();
  const now = new Date().toISOString();
  const normalized = raw
    .map((item) => normalizePrompt(item, now))
    .filter((item) => item.content.trim().length > 0);

  const hasLegacyCategory = raw.some(
    (item) => item && typeof item === "object" && "category" in item
  );
  if (hasLegacyCategory) {
    await setPrompts(normalized);
  }
  return normalized;
}
