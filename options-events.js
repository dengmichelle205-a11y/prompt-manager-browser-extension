addPromptBtn.addEventListener("click", openCreateDialog);
cancelBtn.addEventListener("click", closeDialog);

promptForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const tags = normalizeTagList(state.selectedTags);
  const favorite = favoriteInput.checked;

  if (!content) {
    alert("\u5185\u5bb9\u4e0d\u80fd\u4e3a\u7a7a\u3002");
    return;
  }

  const now = new Date().toISOString();
  if (!state.editingId) {
    state.prompts.push({
      id: crypto.randomUUID(),
      title,
      content,
      tags,
      favorite,
      createdAt: now,
      updatedAt: now,
      usageCount: 0
    });
  } else {
    const target = state.prompts.find((p) => p.id === state.editingId);
    if (!target) {
      alert("\u672a\u627e\u5230\u8981\u7f16\u8f91\u7684\u63d0\u793a\u8bcd\u3002");
      return;
    }
    target.title = title;
    target.content = content;
    target.tags = tags;
    target.favorite = favorite;
    target.updatedAt = now;
  }

  try {
    await setPrompts(state.prompts);
    closeDialog();
    await refresh();
  } catch (error) {
    const message = error instanceof Error && error.message
      ? error.message
      : "\u4fdd\u5b58\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002";
    alert(`\u4fdd\u5b58\u5931\u8d25\uff1a${message}`);
  }
});

searchInput.addEventListener("input", () => {
  state.search = searchInput.value.trim();
  renderList();
});

exportBtn.addEventListener("click", async () => {
  const prompts = await loadPromptsWithMigration();
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(`prompt-manager-${date}.json`, prompts);
});

importInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    if (file.size > MAX_IMPORT_BYTES) throw new Error("文件过大，最大支持 5 MB");
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("无效 JSON 格式：根节点必须是数组");
    if (parsed.length > MAX_IMPORT_ITEMS) {
      throw new Error(`数据条目过多，最大支持 ${MAX_IMPORT_ITEMS} 条`);
    }

    const now = new Date().toISOString();
    const normalized = parsed
      .map((item) => normalizePrompt(item, now))
      .filter((item) => item.content.trim().length > 0);
    const merged = mergePromptLists(state.prompts, normalized, now);

    await setPrompts(merged);
    await refresh();
    alert(`\u5bfc\u5165\u5b8c\u6210\uff1a\u65b0\u589e\u6216\u5408\u5e76 ${normalized.length} \u6761\uff0c\u5f53\u524d\u5171 ${merged.length} \u6761\u3002`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    alert(`导入失败：${message}`);
  } finally {
    importInput.value = "";
  }
});

tagInput.addEventListener("focus", renderTagSuggestions);
tagInput.addEventListener("input", () => {
  state.suggestionIndex = -1;
  renderTagSuggestions();
});

tagInput.addEventListener("keydown", (event) => {
  const hasSuggestions = state.suggestionList.length > 0;

  if (event.key === "ArrowDown" && hasSuggestions) {
    event.preventDefault();
    state.suggestionIndex = (state.suggestionIndex + 1) % state.suggestionList.length;
    renderTagSuggestions();
    return;
  }

  if (event.key === "ArrowUp" && hasSuggestions) {
    event.preventDefault();
    state.suggestionIndex = state.suggestionIndex <= 0
      ? state.suggestionList.length - 1
      : state.suggestionIndex - 1;
    renderTagSuggestions();
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (hasSuggestions && state.suggestionIndex >= 0) {
      addSelectedTag(state.suggestionList[state.suggestionIndex].value);
    } else {
      addSelectedTag(tagInput.value);
    }
    return;
  }

  if (event.key === "Backspace" && !tagInput.value.trim() && state.selectedTags.length > 0) {
    removeSelectedTag(state.selectedTags[state.selectedTags.length - 1]);
    return;
  }

  if (event.key === "Escape") hideTagSuggestions();
});

tagInput.addEventListener("blur", () => {
  setTimeout(() => hideTagSuggestions(), 100);
});

tagColorInput.addEventListener("input", () => {
  updateTagColorPreview(tagColorInput.value);
});

resetTagColorBtn.addEventListener("click", async () => {
  const tag = normalizeTag(state.colorEditingTag);
  if (!tag) return;
  const nextColors = { ...state.tagColors };
  delete nextColors[tag.toLowerCase()];
  await setTagColors(nextColors);
  closeTagColorDialog();
  renderFilters();
  renderList();
  renderSelectedTags();
});

cancelTagColorBtn.addEventListener("click", closeTagColorDialog);

tagColorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const tag = normalizeTag(state.colorEditingTag);
  const color = normalizeColorValue(tagColorInput.value);
  if (!tag || !color) return;

  await setTagColors({ ...state.tagColors, [tag.toLowerCase()]: color });
  closeTagColorDialog();
  renderFilters();
  renderList();
  renderSelectedTags();
});

tagColorDialog.addEventListener("close", () => {
  state.colorEditingTag = null;
});

refresh();
