function getAllFilters(prompts) {
  const tags = prompts.flatMap((p) => (Array.isArray(p.tags) ? p.tags : []));
  return unique([FILTER_ALL, FILTER_FAVORITE, ...tags]);
}

function includesFilter(prompt) {
  const filters = state.activeFilters;
  if (filters.has(FILTER_ALL) || filters.size === 0) return true;
  const tags = Array.isArray(prompt.tags) ? prompt.tags : [];

  if (filters.has(FILTER_FAVORITE) && !prompt.favorite) return false;

  const requiredTags = [...filters].filter(
    (item) => item !== FILTER_ALL && item !== FILTER_FAVORITE
  );
  return requiredTags.every((tag) => tags.includes(tag));
}

function includesSearch(prompt, search) {
  if (!search) return true;
  const term = search.toLowerCase();
  const text = [prompt.title || "", prompt.content || "", ...(prompt.tags || [])]
    .join(" ")
    .toLowerCase();
  return text.includes(term);
}

async function refresh() {
  const [prompts, tagColors] = await Promise.all([
    loadPromptsWithMigration(),
    getTagColors()
  ]);
  state.prompts = prompts;
  state.tagColors = tagColors;
  renderFilters();
  renderList();
}

function sanitizeActiveFilters(availableFilters) {
  const available = new Set(availableFilters);
  const next = new Set();
  for (const item of state.activeFilters) {
    if (available.has(item)) next.add(item);
  }
  if (next.size === 0) next.add(FILTER_ALL);
  if (next.has(FILTER_ALL) && next.size > 1) next.delete(FILTER_ALL);
  state.activeFilters = next;
}

function onFilterClick(filter, event) {
  if (filter === FILTER_ALL) {
    state.activeFilters = new Set([FILTER_ALL]);
    renderFilters();
    renderList();
    return;
  }

  if (!event.shiftKey) {
    if (state.activeFilters.size === 1 && state.activeFilters.has(filter)) {
      state.activeFilters = new Set([FILTER_ALL]);
      renderFilters();
      renderList();
      return;
    }

    state.activeFilters = new Set([filter]);
    renderFilters();
    renderList();
    return;
  }

  const next = new Set(state.activeFilters);
  next.delete(FILTER_ALL);
  if (next.has(filter)) next.delete(filter);
  else next.add(filter);
  if (next.size === 0) next.add(FILTER_ALL);
  state.activeFilters = next;
  renderFilters();
  renderList();
}

function renderFilters() {
  const filters = getAllFilters(state.prompts);
  sanitizeActiveFilters(filters);

  filterChipsEl.innerHTML = "";
  for (const item of filters) {
    const btn = document.createElement("button");
    btn.className = `chip ${state.activeFilters.has(item) ? "active" : ""}`;
    btn.textContent = item;
    btn.title = "\u666e\u901a\u70b9\u51fb\u5355\u9009\uff1b\u5355\u9009\u65f6\u518d\u6b21\u70b9\u51fb\u53ef\u53d6\u6d88\uff1bShift+\u70b9\u51fb\u53ef\u591a\u9009/\u51cf\u9009\uff08\u591a\u6807\u7b7e\u53d6\u4ea4\u96c6\uff09";
    if (isEditableTag(item)) {
      btn.dataset.tag = item;
      btn.title += " \u53f3\u952e\u4fee\u6539\u989c\u8272";
      applyTagPalette(btn, item, "chip");
      btn.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        openTagColorDialog(item);
      });
    }
    btn.addEventListener("click", (event) => onFilterClick(item, event));
    filterChipsEl.appendChild(btn);
  }
}

function updateTagColorPreview(color, tag = state.colorEditingTag) {
  const hex = normalizeColorValue(color) || DEFAULT_TAG_COLOR;
  const palette = buildTagPalette(hex);
  tagColorPreviewEl.textContent = tag || "";
  tagColorValueEl.textContent = hex.toUpperCase();
  tagColorPreviewEl.style.setProperty("--chip-bg", palette.chipBg);
  tagColorPreviewEl.style.setProperty("--chip-border", palette.chipBorder);
  tagColorPreviewEl.style.setProperty("--chip-text", palette.chipText);
  tagColorPreviewEl.style.setProperty("--chip-active-bg", palette.chipActiveBg);
  tagColorPreviewEl.style.setProperty("--chip-active-border", palette.chipActiveBorder);
  tagColorPreviewEl.style.setProperty("--chip-active-glow", palette.chipActiveGlow);
  renderTagColorPresets(hex);
}

function renderTagColorPresets(activeColor = tagColorInput.value) {
  const normalizedActiveColor = normalizeColorValue(activeColor);
  tagColorPresetsEl.innerHTML = "";

  for (const preset of MORANDI_PRESET_TAG_COLORS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `preset-color-btn ${
      normalizeColorValue(preset.value) === normalizedActiveColor ? "active" : ""
    }`;
    btn.title = `${preset.name} ${preset.value.toUpperCase()}`;
    btn.setAttribute("aria-label", `\u9009\u62e9 ${preset.name}`);
    btn.style.setProperty("--preset-color", preset.value);
    btn.addEventListener("click", () => {
      tagColorInput.value = preset.value;
      updateTagColorPreview(preset.value);
    });
    tagColorPresetsEl.appendChild(btn);
  }
}

function openTagColorDialog(tag) {
  if (!isEditableTag(tag)) return;
  state.colorEditingTag = tag;
  const currentColor = state.tagColors[normalizeTag(tag).toLowerCase()] || DEFAULT_TAG_COLOR;
  tagColorNameEl.textContent = tag;
  tagColorInput.value = currentColor;
  updateTagColorPreview(currentColor, tag);
  tagColorDialog.showModal();
}

function closeTagColorDialog() {
  tagColorDialog.close();
  state.colorEditingTag = null;
}

function buildCard(prompt) {
  const node = cardTemplate.content.firstElementChild.cloneNode(true);
  const titleEl = node.querySelector(".card-title");
  const contentEl = node.querySelector(".card-content");
  const metaEl = node.querySelector(".meta");
  const tagListEl = node.querySelector(".tag-list");
  const copyBtn = node.querySelector(".copy-btn");
  const editBtn = node.querySelector(".edit-btn");
  const favBtn = node.querySelector(".fav-btn");
  const deleteBtn = node.querySelector(".delete-btn");

  titleEl.textContent = prompt.favorite ? `★ ${prompt.title || "未命名"}` : prompt.title || "未命名";
  contentEl.textContent = prompt.content || "";
  if (metaEl) metaEl.remove();

  for (const tag of prompt.tags || []) {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = tag;
    span.title = "右键修改颜色";
    applyTagPalette(span, tag, "tag");
    span.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openTagColorDialog(tag);
    });
    tagListEl.appendChild(span);
  }

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(prompt.content || "");
      prompt.usageCount = (prompt.usageCount || 0) + 1;
      prompt.updatedAt = new Date().toISOString();
      await setPrompts(state.prompts);
      await refresh();
    } catch (_) {
      alert("复制失败，请检查剪贴板权限。");
    }
  });

  editBtn.addEventListener("click", () => openEditDialog(prompt));

  favBtn.addEventListener("click", async () => {
    prompt.favorite = !prompt.favorite;
    prompt.updatedAt = new Date().toISOString();
    await setPrompts(state.prompts);
    await refresh();
  });

  deleteBtn.addEventListener("click", async () => {
    const ok = confirm(`确定删除「${prompt.title || "未命名"}」吗？`);
    if (!ok) return;
    const nextPrompts = state.prompts.filter((p) => p.id !== prompt.id);
    try {
      await setPrompts(nextPrompts);
      await refresh();
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "删除失败，请稍后再试。";
      alert(`删除失败：${message}`);
    }
  });

  return node;
}

function renderList() {
  const filtered = state.prompts
    .filter((p) => includesFilter(p))
    .filter((p) => includesSearch(p, state.search))
    .sort((a, b) => {
      if (!!b.favorite !== !!a.favorite) return Number(b.favorite) - Number(a.favorite);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

  promptListEl.innerHTML = "";
  if (filtered.length === 0) {
    promptListEl.innerHTML = '<div class="empty">\u6ca1\u6709\u5339\u914d\u5185\u5bb9\uff0c\u8bd5\u8bd5\u66f4\u6362\u7b5b\u9009\u6216\u65b0\u589e\u63d0\u793a\u8bcd\u3002</div>';
    return;
  }

  for (const prompt of filtered) {
    promptListEl.appendChild(buildCard(prompt));
  }
}
