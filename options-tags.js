function getExistingTags() {
  return unique(
    state.prompts.flatMap((item) => (Array.isArray(item.tags) ? item.tags : []))
  ).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function addSelectedTag(tag) {
  const clean = normalizeTag(tag);
  if (!clean) return;
  const key = clean.toLowerCase();
  const exists = state.selectedTags.some((t) => t.toLowerCase() === key);
  if (exists) return;
  state.selectedTags.push(clean);
  tagInput.value = "";
  state.suggestionIndex = -1;
  renderSelectedTags();
  renderTagSuggestions();
}

function removeSelectedTag(tag) {
  const key = normalizeTag(tag).toLowerCase();
  state.selectedTags = state.selectedTags.filter((t) => t.toLowerCase() !== key);
  renderSelectedTags();
  renderTagSuggestions();
}

function renderSelectedTags() {
  selectedTagsEl.innerHTML = "";
  for (const tag of state.selectedTags) {
    const chip = document.createElement("span");
    chip.className = "selected-tag";
    chip.title = "\u53f3\u952e\u4fee\u6539\u989c\u8272";
    applyTagPalette(chip, tag, "selected-tag");
    chip.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openTagColorDialog(tag);
    });
    const textNode = document.createElement("span");
    textNode.textContent = tag;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-tag-btn";
    removeBtn.setAttribute("data-tag", tag);
    removeBtn.setAttribute("aria-label", `\u5220\u9664 ${tag}`);
    removeBtn.textContent = "\u00d7";
    chip.appendChild(textNode);
    chip.appendChild(removeBtn);
    selectedTagsEl.appendChild(chip);
  }

  selectedTagsEl.querySelectorAll(".remove-tag-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeSelectedTag(btn.getAttribute("data-tag") || "");
      tagInput.focus();
    });
  });
}

function computeSuggestions() {
  const query = normalizeTag(tagInput.value).toLowerCase();
  const selected = new Set(state.selectedTags.map((t) => t.toLowerCase()));
  const allExistingTags = getExistingTags();
  const existing = allExistingTags
    .filter((tag) => !selected.has(tag.toLowerCase()))
    .filter((tag) => (query ? tag.toLowerCase().includes(query) : true))
    .slice(0, 10)
    .map((tag) => ({ value: tag, create: false }));

  const shouldCreate =
    query &&
    !allExistingTags.some((tag) => tag.toLowerCase() === query) &&
    !selected.has(query);

  if (shouldCreate) existing.unshift({ value: tagInput.value.trim(), create: true });
  return existing;
}

function renderTagSuggestions() {
  state.suggestionList = computeSuggestions();
  if (state.suggestionList.length === 0) {
    tagSuggestionsEl.classList.add("hidden");
    tagSuggestionsEl.innerHTML = "";
    state.suggestionIndex = -1;
    return;
  }

  if (state.suggestionIndex >= state.suggestionList.length) state.suggestionIndex = 0;
  if (state.suggestionIndex < -1) state.suggestionIndex = -1;

  tagSuggestionsEl.innerHTML = "";
  for (let i = 0; i < state.suggestionList.length; i += 1) {
    const item = state.suggestionList[i];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `tag-suggestion ${i === state.suggestionIndex ? "active" : ""} ${item.create ? "tag-create" : ""}`;
    btn.textContent = item.create ? `\u521b\u5efa\u6807\u7b7e\uff1a${item.value}` : item.value;
    btn.addEventListener("mousedown", (event) => {
      event.preventDefault();
      addSelectedTag(item.value);
      tagInput.focus();
    });
    tagSuggestionsEl.appendChild(btn);
  }
  tagSuggestionsEl.classList.remove("hidden");
}

function hideTagSuggestions() {
  tagSuggestionsEl.classList.add("hidden");
  tagSuggestionsEl.innerHTML = "";
  state.suggestionList = [];
  state.suggestionIndex = -1;
}

function resetTagPicker(tags = []) {
  state.selectedTags = normalizeTagList(tags);
  state.suggestionList = [];
  state.suggestionIndex = -1;
  tagInput.value = "";
  renderSelectedTags();
  hideTagSuggestions();
}

function openCreateDialog() {
  state.editingId = null;
  dialogTitle.textContent = "\u65b0\u589e\u63d0\u793a\u8bcd";
  titleInput.value = "";
  contentInput.value = "";
  favoriteInput.checked = false;
  resetTagPicker([]);
  promptDialog.showModal();
}

function openEditDialog(prompt) {
  state.editingId = prompt.id;
  dialogTitle.textContent = "\u7f16\u8f91\u63d0\u793a\u8bcd";
  titleInput.value = prompt.title || "";
  contentInput.value = prompt.content || "";
  favoriteInput.checked = !!prompt.favorite;
  resetTagPicker(prompt.tags || []);
  promptDialog.showModal();
}

function closeDialog() {
  promptDialog.close();
  hideTagSuggestions();
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
