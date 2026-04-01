"use strict"

(function () {
  const PLAYER_IDS = ["greg", "ju", "elo", "bibi"]
  const PLAYER_TOKEN_POSITIONS = {
    greg: { left: 160, top: 260 },
    ju:   { left: 280, top: 260 },
    elo:  { left: 400, top: 260 },
    bibi: { left: 520, top: 260 }
  }
  const SANDBOX_MAX_PLAYERS = 12

  function byId(id) { return document.getElementById(id) }
  function clone(value) { return JSON.parse(JSON.stringify(value)) }
  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  function getExtendedCustomization() {
    const data = getCustomization()
    data.content = data.content && typeof data.content === "object" ? data.content : {}
    data.content.maps = Array.isArray(data.content.maps) ? data.content.maps : []
    data.content.mapTabs = Array.isArray(data.content.mapTabs) ? data.content.mapTabs : []
    data.content.pnjs = Array.isArray(data.content.pnjs) ? data.content.pnjs : []
    data.content.pnjTabs = Array.isArray(data.content.pnjTabs) ? data.content.pnjTabs : []
    data.content.highPnjs = Array.isArray(data.content.highPnjs) ? data.content.highPnjs : []
    data.content.mobs = Array.isArray(data.content.mobs) ? data.content.mobs : []
    data.content.documents = Array.isArray(data.content.documents) ? data.content.documents : []
    return data
  }

  function saveExtendedCustomization(data) {
    saveCustomization(data)
  }

  function stopStudioMenuMusic() {
    try {
      const music = byId("music")
      if (!music) return
      music.pause()
      music.currentTime = 0
      music.volume = 0
      music.removeAttribute("src")
      music.load()
    } catch (e) {}
  }

  function getDefaultCatalog() {
    return {
      maps: {
        villes: [],
        landscape: [],
        lieux: [],
        monde: []
      },
      pnjs: [],
      highPnjs: [],
      mobs: {
        normal: [],
        combat: []
      },
      documents: []
    }
  }

  function getCatalog() {
    const catalog = clone(getDefaultCatalog())
    const custom = getExtendedCustomization().content
    custom.maps.forEach(item => {
      const section = item.section || "lieux"
      if (!catalog.maps[section]) catalog.maps[section] = []
      let group = catalog.maps[section].find(entry => entry[0] === (item.category || "Custom"))
      if (!group) { group = [item.category || "Custom", []]; catalog.maps[section].push(group) }
      group[1].push([item.label, item.map, item.audio || ""])
    })
    custom.pnjs.forEach(item => {
      let group = catalog.pnjs.find(entry => entry[0] === (item.category || "Custom"))
      if (!group) { group = [item.category || "Custom", []]; catalog.pnjs.push(group) }
      group[1].push([item.label, item.image])
    })
    custom.highPnjs.forEach(item => {
      let group = catalog.highPnjs.find(entry => entry[0] === (item.category || "Custom"))
      if (!group) { group = [item.category || "Custom", []]; catalog.highPnjs.push(group) }
      group[1].push([item.label, item.image, item.title || item.label])
    })
    custom.mobs.forEach(item => {
      const target = item.combatOnly ? catalog.mobs.combat : catalog.mobs.normal
      let group = target.find(entry => entry[0] === (item.category || "Custom"))
      if (!group) { group = [item.category || "Custom", []]; target.push(group) }
      group[1].push([item.label, item.id, item.action || "diff"])
    })
    custom.documents.forEach(item => {
      let group = catalog.documents.find(entry => entry[0] === (item.category || "Custom"))
      if (!group) { group = [item.category || "Custom", []]; catalog.documents.push(group) }
      group[1].push([item.label, item.image, item.title || item.label])
    })
    return catalog
  }

  function ensureCustomMobsRegistered() {
    getExtendedCustomization().content.mobs.forEach(item => {
      if (!item || !item.id) return
      if (typeof mobStats === "object" && mobStats && !mobStats[item.id]) mobStats[item.id] = { tier: item.tier || "weak", baseHP: Number(item.baseHP) || 30 }
      if (Array.isArray(WANTED_MOBS) && !WANTED_MOBS.includes(item.id)) WANTED_MOBS.push(item.id)
      if (Array.isArray(MOB_SELECT_LIST) && !MOB_SELECT_LIST.includes(item.id)) MOB_SELECT_LIST.push(item.id)
    })
  }

  function createCategoryBlock(id, label, buttonsHtml) {
    return `<button class="mapCategoryButton" onclick="toggleCategory('${id}', this)"><span class="arrow">&#9656;</span> ${esc(label)}</button><div id="${esc(id)}" class="mapCategory">${buttonsHtml}</div>`
  }

  function createStudioEmptyState(title, message) {
    return `
      <div style="display:grid;gap:10px;padding:14px;border:1px dashed rgba(214,180,106,0.28);border-radius:12px;background:rgba(0,0,0,0.12);">
        <div style="font-family:Cinzel,serif;font-size:14px;letter-spacing:1px;color:#f0d087;">${esc(title)}</div>
        <div style="font-size:12px;line-height:1.7;color:#cdbb96;">${esc(message)}</div>
        <button type="button" onclick="if (typeof openCustomizationPanel === 'function') openCustomizationPanel()" style="justify-self:start;padding:10px 14px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Ouvrir le studio</button>
      </div>
    `
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "custom_mob"
  }

  function getSandboxVisiblePlayerCount(rawCount) {
    return Math.max(1, Math.min(SANDBOX_MAX_PLAYERS, parseInt(rawCount, 10) || 4))
  }

  function getSandboxPlayerKey(index) {
    return index >= 1 && index <= PLAYER_IDS.length ? PLAYER_IDS[index - 1] : "slot_" + index
  }

  function getSandboxPlayerConfig(index) {
    return getPlayerCustomization(getSandboxPlayerKey(index))
  }

  function getSandboxPlayerName(index) {
    return getPlayerDisplayName(getSandboxPlayerKey(index))
  }

  function getSandboxPlayerImage(index) {
    const playerKey = getSandboxPlayerKey(index)
    const player = getPlayerCustomization(playerKey)
    return player.image || getDefaultPlayerSlotImage(playerKey)
  }

  function buildSandboxCharacterButtonsMarkup(count) {
    let sourceCount = count
    try {
      const runtimeCount = document.body && document.body.getAttribute("data-sandbox-player-count")
      if (runtimeCount) sourceCount = runtimeCount
    } catch (_) {}
    const visibleCount = getSandboxVisiblePlayerCount(sourceCount)
    let markup = ""
    for (let slotIndex = 1; slotIndex <= visibleCount; slotIndex += 1) {
      const playerKey = getSandboxPlayerKey(slotIndex)
      const player = getPlayerCustomization(playerKey)
      if (player.enabled === false) continue
      markup += `<button class="gmCharacterSlotButton" onclick="return openCharacterSheetFromMenuWithFallback('${esc(playerKey)}', event)">${esc(getSandboxPlayerName(slotIndex))}</button>`
    }
    return markup
  }

  function getSandboxExtraSlotImage(index) {
    const safeIndex = Math.max(5, Math.min(SANDBOX_MAX_PLAYERS, parseInt(index, 10) || 5))
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="gx${safeIndex}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f5ecd6"/><stop offset="100%" stop-color="#d9c39a"/></linearGradient></defs><circle cx="80" cy="80" r="76" fill="url(#gx${safeIndex})" stroke="#9d8357" stroke-width="8"/><circle cx="80" cy="62" r="24" fill="#8f7a56"/><path d="M42 126c7-24 26-36 38-36s31 12 38 36" fill="#8f7a56"/><text x="80" y="150" text-anchor="middle" font-family="Cinzel, serif" font-size="24" fill="#5b482c">${safeIndex}</text></svg>`
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg)
  }

  function getSandboxExtraSlotPosition(index) {
    const safeIndex = Math.max(5, parseInt(index, 10) || 5) - 1
    const col = safeIndex % 4
    const row = Math.floor(safeIndex / 4)
    return {
      left: 160 + (col * 120),
      top: 260 + (row * 150)
    }
  }

  function ensureSandboxExtraTokens(count) {
    const map = byId("map")
    if (!map) return
    const visibleCount = getSandboxVisiblePlayerCount(count)
    map.querySelectorAll(".sandboxExtraToken").forEach(node => {
      const slotIndex = parseInt(node.dataset.slotIndex, 10) || 0
      if (slotIndex > visibleCount) node.remove()
    })
    for (let slotIndex = 5; slotIndex <= visibleCount; slotIndex += 1) {
      let token = byId("sandbox_extra_" + slotIndex)
      if (!token) {
        token = document.createElement("div")
        token.className = "token sandboxExtraToken"
        token.id = "sandbox_extra_" + slotIndex
        token.dataset.slotIndex = String(slotIndex)
        token.innerHTML = `<div class="hpBarToken"><div class="hpBarFill" id="hp_sandbox_extra_${slotIndex}"></div><div class="hpBarTokenValue" id="hp_label_sandbox_extra_${slotIndex}">0/0</div></div><img alt="Joueur ${slotIndex}"><div class="nameTag">Joueur ${slotIndex}</div>`
        map.appendChild(token)
      }
      const pos = getSandboxExtraSlotPosition(slotIndex)
      if (token.dataset.mjPlaced !== "true") {
        token.style.left = pos.left + "px"
        token.style.top = pos.top + "px"
      }
      const img = token.querySelector("img")
      if (img) img.src = getSandboxPlayerImage(slotIndex) || getSandboxExtraSlotImage(slotIndex)
      const tag = token.querySelector(".nameTag")
      if (tag) tag.textContent = getSandboxPlayerName(slotIndex)
    }
  }

  function refreshProjectTitle() {
    const title = String(getExtendedCustomization().project.title || "Roleplay It Yourself").trim() || "Roleplay It Yourself"
    document.title = title
    const titleEl = byId("gameTitle")
    if (titleEl) {
      titleEl.innerText = title
      titleEl.classList.add("visible")
      titleEl.style.opacity = "1"
    }
  }

  function refreshThemePresentation() {
    const customization = getExtendedCustomization()
    if (typeof getProjectThemePresentation !== "function") return
    const presentation = getProjectThemePresentation(customization.project.theme)
    if (typeof applyProjectThemeToDocument === "function") {
      applyProjectThemeToDocument(presentation.theme)
    } else {
      document.body.setAttribute("data-project-theme", presentation.theme)
    }

    const eyebrow = byId("entryHubEyebrow")
    if (eyebrow) eyebrow.innerText = presentation.eyebrow
    const lead = byId("entryHubLead")
    if (lead) lead.innerText = presentation.lead
    const mjTitle = byId("entryMjTitle")
    if (mjTitle) mjTitle.innerText = presentation.mjTitle
    const mjDescription = byId("entryMjDescription")
    if (mjDescription) mjDescription.innerText = presentation.mjDescription
    const playerTitle = byId("entryPlayerTitle")
    if (playerTitle) playerTitle.innerText = presentation.playerTitle
    const playerDescription = byId("entryPlayerDescription")
    if (playerDescription) playerDescription.innerText = presentation.playerDescription
  }

  function forceSandboxPlayerVisibility(count) {
    const visibleCount = getSandboxVisiblePlayerCount(count)
    if (document.body) {
      document.body.setAttribute("data-sandbox-player-count", String(visibleCount))
    }
    ensureSandboxExtraTokens(visibleCount)
    PLAYER_IDS.forEach(playerId => {
      const token = byId(playerId)
      const isVisible = PLAYER_IDS.indexOf(playerId) < visibleCount && getPlayerCustomization(playerId).enabled !== false
      if (token) {
        token.hidden = !isVisible
        token.setAttribute("aria-hidden", isVisible ? "false" : "true")
        token.style.setProperty("display", isVisible ? "flex" : "none", "important")
        token.style.setProperty("visibility", isVisible ? "visible" : "hidden", "important")
        token.style.setProperty("pointer-events", isVisible ? "auto" : "none", "important")
      }
      document.querySelectorAll(`[data-player-choice="${playerId}"]`).forEach(button => {
        button.hidden = !isVisible
        button.style.setProperty("display", isVisible ? "" : "none", "important")
      })
    })
    document.querySelectorAll(".sandboxExtraToken").forEach(token => {
      const slotIndex = parseInt(token.dataset.slotIndex, 10) || 0
      const isVisible = slotIndex > 4 && slotIndex <= visibleCount && getSandboxPlayerConfig(slotIndex).enabled !== false
      token.hidden = !isVisible
      token.style.setProperty("display", isVisible ? "flex" : "none", "important")
      token.style.setProperty("visibility", isVisible ? "visible" : "hidden", "important")
      token.style.setProperty("pointer-events", isVisible ? "auto" : "none", "important")
      const img = token.querySelector("img")
      if (img) img.src = getSandboxPlayerImage(slotIndex)
      const tag = token.querySelector(".nameTag")
      if (tag) tag.textContent = getSandboxPlayerName(slotIndex)
    })
    const gmCharacters = byId("gmCharacters")
    if (gmCharacters) {
      gmCharacters.innerHTML = buildSandboxCharacterButtonsMarkup(visibleCount)
    }
  }

  function refreshPlayerLabels() {
    const customization = getExtendedCustomization()
    const visibleCount = getSandboxVisiblePlayerCount(customization.project.playerCount)
    PLAYER_IDS.forEach(playerId => {
      const player = getPlayerCustomization(playerId)
      const name = getPlayerDisplayName(playerId)
      const image = player.image || getDefaultPlayerSlotImage(playerId)
      const isVisible = PLAYER_IDS.indexOf(playerId) < visibleCount && player.enabled !== false
      document.querySelectorAll(`[data-player-choice="${playerId}"]`).forEach(button => { button.innerText = name })
      const token = byId(playerId)
      if (token) {
        const position = PLAYER_TOKEN_POSITIONS[playerId]
        if (isVisible && position && token.dataset.mjPlaced !== "true") {
          token.style.left = position.left + "px"
          token.style.top = position.top + "px"
        }
        if (!isVisible) token.dataset.mjPlaced = "false"
        const img = token.querySelector("img")
        if (img) img.src = image
        const tag = token.querySelector(".nameTag")
        if (tag) tag.innerText = name
      }
    })
    forceSandboxPlayerVisibility(visibleCount)
  }

  function refreshAuthSelect() {
    const select = byId("playerAuthCharacter")
    if (!select) return
    ;[...select.options].forEach(option => {
      if (!option.value) return
      option.text = getPlayerDisplayName(option.value)
    })
  }

  function renderMapMenu() {
    const catalog = getCatalog()
    const customization = getExtendedCustomization()
    const startMapId = String((customization.project && customization.project.startMapId) || window.__onboardingStartMapId || "tutorial_start_map").trim()
    const startMapAsset = String((customization.project && customization.project.startMapAsset) || window.__onboardingStartMapAsset || "").trim()
    const startMapLabel = String((customization.project && customization.project.startMapLabel) || window.__onboardingStartMapLabel || "").trim() || "Map de depart"
    const startMapButton = startMapAsset
      ? `<button onclick="return launchOnboardingStartMap()" class="map-simple-btn">${esc(startMapLabel)}</button>`
      : ""
    const renderMapBtn = item => `<button onclick="changeMap('${esc(item[1])}'${item[2] ? `, '${esc(item[2])}'` : ""})">${esc(item[0])}</button>`
    const renderSection = (groups, prefix) => groups.map((group, index) => createCategoryBlock(`${prefix}_${index}`, group[0], group[1].map(renderMapBtn).join(""))).join("")
    if (byId("mapVilles")) byId("mapVilles").innerHTML =
      (startMapButton ? `<div style="margin-bottom:10px;">${startMapButton}</div>` : "") +
      (catalog.maps.villes.length
        ? renderSection(catalog.maps.villes, "dynMapVilles")
        : createStudioEmptyState("Aucune map de ville", "Ajoute tes premieres villes ou scenes dans le studio MJ."))
    if (byId("mapLandscape")) {
      const landscapeItems = catalog.maps.landscape.flatMap(group => group[1]).map(item => `<button onclick="changeMap('${esc(item[1])}'${item[2] ? `, '${esc(item[2])}'` : ""})" class="map-simple-btn">${esc(item[0])}</button>`).join("")
      byId("mapLandscape").innerHTML = (startMapButton ? `<div style="margin-bottom:10px;">${startMapButton}</div>` : "") + (landscapeItems || createStudioEmptyState("Aucun paysage", "Ajoute tes plans larges, paysages ou ambiances de voyage dans le studio."))
    }
    if (byId("mapLieux")) byId("mapLieux").innerHTML = catalog.maps.lieux.length
      ? renderSection(catalog.maps.lieux, "dynMapLieux")
      : createStudioEmptyState("Aucun lieu", "Ajoute tes lieux speciaux, intérieurs ou scenes d'exploration depuis le studio.")
    if (byId("mapMondeTab")) {
      const mondeItems = catalog.maps.monde.flatMap(group => group[1]).map(item => `<button onclick="changeMap('${esc(item[1])}')" class="map-simple-btn">${esc(item[0])}</button>`).join("")
      byId("mapMondeTab").innerHTML = mondeItems
        ? mondeItems + `<button onclick="toggleWorldMapFogTopLeft()" class="map-simple-btn">Fog haut-gauche</button>`
        : createStudioEmptyState("Aucune map monde", "Ajoute une carte globale ou une vue strategique depuis le studio MJ.")
    }
    try {
      if (typeof syncOnboardingStartMapMenuButton === "function") syncOnboardingStartMapMenuButton()
    } catch (_) {}
  }

  function renderPNJMenu() {
    const catalog = getCatalog()
    const pnjButtons = catalog.pnjs.map((group, index) => createCategoryBlock(`dynPnj_${index}`, group[0], group[1].map(item => `<button onclick="setPNJImage('${esc(item[1])}')">${esc(item[0])}</button>`).join(""))).join("")
    const slotControls = `<div style="margin-top:6px;border-top:1px solid rgba(30,90,102,0.3);padding-top:6px;"><div style="font-family:Cinzel;font-size:10px;color:#1e8a9a;text-align:center;margin-bottom:4px;letter-spacing:1px;">SLOT PNJ</div><div style="display:flex;gap:4px;justify-content:center;margin-bottom:4px;"><button id="slot1Btn" onclick="setPNJSlot(1)" style="flex:1;padding:4px;font-family:Cinzel;font-size:10px;background:rgba(30,90,102,0.4);color:#a0d8e0;border:1px solid #1e5a66;border-radius:3px;cursor:pointer;">1 Centre</button><button id="slot2Btn" onclick="setPNJSlot(2)" style="flex:1;padding:4px;font-family:Cinzel;font-size:10px;background:rgba(30,90,102,0.15);color:#6a9aaa;border:1px solid rgba(30,90,102,0.3);border-radius:3px;cursor:pointer;">2 Gauche</button><button id="slot3Btn" onclick="setPNJSlot(3)" style="flex:1;padding:4px;font-family:Cinzel;font-size:10px;background:rgba(30,90,102,0.15);color:#6a9aaa;border:1px solid rgba(30,90,102,0.3);border-radius:3px;cursor:pointer;">3 Droite</button></div><div style="display:flex;gap:4px;"><button onclick="closePNJBySlot(1)" style="flex:1;padding:3px;font-family:Cinzel;font-size:9px;background:rgba(180,40,40,0.3);color:#ffaaaa;border:1px solid rgba(200,60,60,0.4);border-radius:3px;cursor:pointer;">X C</button><button onclick="closePNJBySlot(2)" style="flex:1;padding:3px;font-family:Cinzel;font-size:9px;background:rgba(180,40,40,0.3);color:#ffaaaa;border:1px solid rgba(200,60,60,0.4);border-radius:3px;cursor:pointer;">X G</button><button onclick="closePNJBySlot(3)" style="flex:1;padding:3px;font-family:Cinzel;font-size:9px;background:rgba(180,40,40,0.3);color:#ffaaaa;border:1px solid rgba(200,60,60,0.4);border-radius:3px;cursor:pointer;">X D</button></div></div>`
    if (byId("pnjTab")) byId("pnjTab").innerHTML = (pnjButtons || createStudioEmptyState("Aucun PNJ", "Ajoute tes PNJ dans le studio pour construire ton casting.")) + slotControls
    if (byId("highPnjTab")) byId("highPnjTab").innerHTML = (catalog.highPnjs.length ? catalog.highPnjs.map((group, index) => {
      const buttons = group[1].map(item => `<button onclick="showHighPNJ('${esc(item[1])}', '${esc(item[2])}')">${esc(item[0])}</button>`).join("")
      return index === 0 ? buttons : createCategoryBlock(`dynHighPnj_${index}`, group[0], buttons)
    }).join("") : createStudioEmptyState("Aucun High PNJ", "Ajoute tes portraits ou personnages importants depuis le studio MJ."))
  }

  function renderMobsMenu() {
    const catalog = getCatalog()
    const renderMobBtn = item => item[2] === "boss"
      ? `<button onclick="startCombat('${esc(item[1])}','boss')">${esc(item[0])}</button>`
      : `<button onclick="openMobDiff('${esc(item[1])}', event)" style="width:100%;text-align:left;">${esc(item[0])}</button>`
    if (byId("mobTab")) {
      const normalHtml = catalog.mobs.normal.map((group, index) => createCategoryBlock(`dynMob_${index}`, group[0], group[1].map(renderMobBtn).join(""))).join("")
      byId("mobTab").innerHTML = normalHtml || createStudioEmptyState("Aucun mob", "Ajoute tes ennemis et creatures dans le studio pour remplir cette liste.")
    }
    if (byId("pnjCombatTab")) {
      const combatHtml = catalog.mobs.combat.map((group, index) => createCategoryBlock(`dynCombatMob_${index}`, group[0], group[1].map(renderMobBtn).join(""))).join("")
      byId("pnjCombatTab").innerHTML = combatHtml || createStudioEmptyState("Aucun PNJ combat", "Ajoute des PNJ orientés combat ou des boss depuis le studio MJ.")
    }
  }

  function renderDocumentsMenu() {
    const docs = getCatalog().documents.flatMap(group => group[1])
    if (byId("elemIndices")) {
      byId("elemIndices").innerHTML = `<div class="elem-title">DOCUMENTS</div>` + (docs.length
        ? docs.map(item => `<button onclick="showDocument('${esc(item[1])}','${esc(item[2])}')" class="elem-doc-btn">${esc(item[0])}</button>`).join("")
        : createStudioEmptyState("Aucun document", "Ajoute notes, images et visuels dans le studio pour les retrouver ici.")) + `<div class="panel-divider-tight"><button onclick="clearAllElements()" class="elem-clear-btn">Tout effacer</button></div>`
    }
    ;["elemObjets", "elemEffets", "elemCartes", "elemJeu", "elemFolie", "elemWanted"].forEach(id => {
      const panel = byId(id)
      if (!panel) return
      panel.innerHTML = createStudioEmptyState("Module conserve", "Cette partie du moteur est gardee, mais aucun contenu n'est preconfigure. Tu pourras la brancher progressivement depuis le studio.")
    })
  }

  function applyCustomizationToUI() {
    stopStudioMenuMusic()
    ensureCustomMobsRegistered()
    refreshProjectTitle()
    refreshThemePresentation()
    refreshPlayerLabels()
    refreshAuthSelect()
    renderMapMenu()
    renderPNJMenu()
    renderMobsMenu()
    renderDocumentsMenu()
    const projectCount = getSandboxVisiblePlayerCount(getExtendedCustomization().project.playerCount)
    ensureSandboxExtraTokens(projectCount)
    if (document.body) {
      document.body.setAttribute("data-sandbox-player-count", String(projectCount))
    }
    const customization = getExtendedCustomization()
    const startMapAsset = String((customization.project && customization.project.startMapAsset) || window.__onboardingStartMapAsset || "").trim()
    const startMapId = String((customization.project && customization.project.startMapId) || window.__onboardingStartMapId || "").trim()
    const startMapLabel = String((customization.project && customization.project.startMapLabel) || "").trim() || "Map de depart"
    const map = byId("map")
    if (map && startMapAsset) {
      const startMapLayer = byId("sandboxStartMapLayer")
      if (startMapLayer) {
        startMapLayer.src = startMapAsset
        startMapLayer.style.display = "block"
      }
      map.style.setProperty("background", `url('${startMapAsset.replace(/'/g, "\\'")}') center / cover no-repeat`, "important")
      if (startMapId) {
        try {
          window.__latestMapValue = startMapId
          currentMap = startMapId
        } catch (_) {}
      }
      if (typeof showLocation === "function" && startMapLabel) {
        try { showLocation(startMapLabel) } catch (_) {}
      }
    }
    syncSandboxPlayerCountControls(projectCount)
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ""))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function renderCustomList() {
    const list = byId("customContentList")
    if (!list) return
    const custom = getExtendedCustomization().content
    const items = []
    custom.maps.forEach((item, index) => items.push(["maps", index, item.label, (item.section || "lieux") + " / " + (item.category || "Custom")]))
    custom.pnjs.forEach((item, index) => items.push(["pnjs", index, item.label, item.category || "Custom"]))
    custom.highPnjs.forEach((item, index) => items.push(["highPnjs", index, item.label, item.category || "Custom"]))
    custom.mobs.forEach((item, index) => items.push(["mobs", index, item.label, (item.category || "Custom") + " / " + (item.tier || "weak")]))
    custom.documents.forEach((item, index) => items.push(["documents", index, item.label, item.category || "Custom"]))
    list.innerHTML = items.length ? items.map(item => `<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 10px;background:rgba(0,0,0,0.2);border:1px solid rgba(160,130,80,0.22);border-radius:8px;"><div><div style="font-size:12px;color:#f5e6c8;">${esc(item[2])}</div><div style="font-size:11px;color:#bfae8b;">${esc(item[3])}</div></div><button data-remove-bucket="${item[0]}" data-remove-index="${item[1]}" style="padding:8px 10px;background:#311819;color:#ffd5d5;border:1px solid #6a3434;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Supprimer</button></div>`).join("") : `<div style="font-size:12px;color:#bfae8b;">Aucun contenu custom pour le moment.</div>`
    list.querySelectorAll("[data-remove-bucket]").forEach(button => {
      button.onclick = () => {
        const next = getExtendedCustomization()
        next.content[button.dataset.removeBucket].splice(Number(button.dataset.removeIndex), 1)
        saveExtendedCustomization(next)
        renderCustomList()
        applyCustomizationToUI()
      }
    })
  }

  function renderAssetOverrides() {
    const list = byId("assetOverrideList")
    if (!list) return
    const items = Object.entries(getExtendedCustomization().assets || {})
    list.innerHTML = items.length ? items.map(([key, value]) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 10px;background:rgba(0,0,0,0.2);border:1px solid rgba(160,130,80,0.22);border-radius:8px;"><div style="display:flex;align-items:center;gap:10px;"><img src="${esc(value)}" style="width:42px;height:42px;object-fit:cover;border-radius:6px;"><div style="font-size:12px;color:#f5e6c8;">${esc(key)}</div></div><button data-remove-asset="${esc(key)}" style="padding:8px 10px;background:#311819;color:#ffd5d5;border:1px solid #6a3434;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Supprimer</button></div>`).join("") : `<div style="font-size:12px;color:#bfae8b;">Aucun override d'image.</div>`
    list.querySelectorAll("[data-remove-asset]").forEach(button => {
      button.onclick = () => {
        const next = getExtendedCustomization()
        delete next.assets[button.dataset.removeAsset]
        saveExtendedCustomization(next)
        renderAssetOverrides()
        applyCustomizationToUI()
      }
    })
  }

  function getStudioSummary() {
    const customization = getExtendedCustomization()
    const catalog = getCatalog()
    const visibleCount = getSandboxVisiblePlayerCount(customization.project.playerCount)
    return {
      title: String(customization.project.title || "Roleplay It Yourself").trim() || "Roleplay It Yourself",
      themeLabel: typeof getProjectThemeLabel === "function"
        ? getProjectThemeLabel(customization.project.theme)
        : String(customization.project.theme || "Medieval fantasy"),
      playerCount: visibleCount,
      players: Array.from({ length: visibleCount }, (_, index) => {
        const slotIndex = index + 1
        return { id: getSandboxPlayerKey(slotIndex), name: getSandboxPlayerName(slotIndex) }
      }),
      customCounts: {
        maps: customization.content.maps.length,
        pnjs: customization.content.pnjs.length + customization.content.highPnjs.length,
        mobs: customization.content.mobs.length,
        documents: customization.content.documents.length,
        assets: Object.keys(customization.assets || {}).length
      },
      totalCounts: {
        maps: Object.values(catalog.maps).flat().reduce((sum, group) => sum + group[1].length, 0),
        pnjs: catalog.pnjs.reduce((sum, group) => sum + group[1].length, 0) + catalog.highPnjs.reduce((sum, group) => sum + group[1].length, 0),
        mobs: catalog.mobs.normal.reduce((sum, group) => sum + group[1].length, 0) + catalog.mobs.combat.reduce((sum, group) => sum + group[1].length, 0),
        documents: catalog.documents.reduce((sum, group) => sum + group[1].length, 0)
      },
      latestCustom: [
        ...customization.content.maps.map(item => ({ type: "Map", label: item.label, meta: (item.section || "lieux") + " / " + (item.category || "Custom") })),
        ...customization.content.pnjs.map(item => ({ type: "PNJ", label: item.label, meta: item.category || "Custom" })),
        ...customization.content.highPnjs.map(item => ({ type: "High PNJ", label: item.label, meta: item.category || "Custom" })),
        ...customization.content.mobs.map(item => ({ type: "Mob", label: item.label, meta: (item.category || "Custom") + " / " + (item.tier || "weak") })),
        ...customization.content.documents.map(item => ({ type: "Document", label: item.label, meta: item.category || "Custom" }))
      ].slice(-8).reverse()
    }
  }

  function closeStudioOverlay() {
    const existing = byId("creatorStudioOverlay")
    if (existing) existing.remove()
  }

  function buildPlayerEditorCards(customization) {
    const visibleCount = getSandboxVisiblePlayerCount(customization.project.playerCount)
    let markup = ""
    for (let slotIndex = 1; slotIndex <= visibleCount; slotIndex += 1) {
      const playerKey = getSandboxPlayerKey(slotIndex)
      const player = customization.players[playerKey] || getPlayerCustomization(playerKey)
      const previewName = player.name || getDefaultPlayerSlotLabel(playerKey)
      const previewImage = player.image || getDefaultPlayerSlotImage(playerKey)
      markup += `<div style="padding:12px;border:1px solid rgba(160,130,80,0.22);border-radius:10px;background:rgba(0,0,0,0.18);display:grid;gap:12px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;"><div style="font-size:11px;color:#d7c39c;letter-spacing:2px;">SLOT ${slotIndex}</div><label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#e8d8b6;"><input data-custom-enabled="${esc(playerKey)}" type="checkbox" ${player.enabled !== false ? "checked" : ""}> Actif</label></div><div style="display:grid;grid-template-columns:72px 1fr;gap:12px;align-items:center;"><div style="width:72px;height:72px;border-radius:16px;overflow:hidden;border:1px solid rgba(214,180,106,0.32);background:linear-gradient(180deg,rgba(245,236,214,0.98),rgba(213,194,158,0.98));box-shadow:0 8px 18px rgba(0,0,0,0.22);"><img data-custom-preview="${esc(playerKey)}" src="${esc(previewImage)}" alt="${esc(previewName)}" style="width:100%;height:100%;object-fit:cover;display:block;"></div><div style="display:grid;gap:6px;"><div data-custom-preview-name="${esc(playerKey)}" style="font-size:14px;color:#f5e6c8;font-family:Cinzel,serif;">${esc(previewName)}</div><div style="font-size:11px;line-height:1.5;color:#bfae8b;">Nom et portrait affiches sur le token du board.</div></div></div><label style="display:grid;gap:6px;"><span style="font-size:12px;color:#bfae8b;">Nom affiche</span><input data-custom-name="${esc(playerKey)}" type="text" value="${esc(previewName)}" style="width:100%;padding:10px 12px;background:rgba(8,8,8,0.9);border:1px solid rgba(180,150,90,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:13px;box-sizing:border-box;"></label><label style="display:grid;gap:6px;"><span style="font-size:12px;color:#bfae8b;">URL image</span><input data-custom-image="${esc(playerKey)}" type="text" value="${esc(player.image || "")}" placeholder="https://... ou data:image/..." style="width:100%;padding:10px 12px;background:rgba(8,8,8,0.9);border:1px solid rgba(180,150,90,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:13px;box-sizing:border-box;"></label><label style="display:grid;gap:6px;"><span style="font-size:12px;color:#bfae8b;">Uploader une image</span><input data-custom-upload="${esc(playerKey)}" type="file" accept="image/*" style="font-size:12px;color:#e8d6b3;"></label></div>`
    }
    return markup
  }

  function openStudioGameMenu(menuId) {
    const targetMenuId = String(menuId || "").trim()
    if (!targetMenuId) return
    const bootDelay = ensureGameStartedForHub()
    const openMenu = () => {
      if (!isGMValue() && typeof activateGM === "function") activateGM()
      if (typeof toggleGMSection === "function") toggleGMSection(targetMenuId)
    }
    setTimeout(openMenu, 180 + bootDelay)
  }

  function openStudioCustomization(type) {
    closeStudioOverlay()
    const action = String(type || "").trim()
    if (!action) {
      openCustomizationPanel()
      return
    }
    const panelTabs = ["project", "players", "content", "assets"]
    if (panelTabs.includes(action)) {
      openCustomizationPanel({ tab: action })
      return
    }
    openCustomizationPanel({ focusType: action, tab: "content" })
  }

  function showCreatorStudioHome() {
    if (typeof closeStudioMenusBeforeOpen === "function") closeStudioMenusBeforeOpen("creatorStudioOverlay")
    closeStudioOverlay()
    const summary = getStudioSummary()
    const studioPresentation = typeof getProjectThemePresentation === "function"
      ? getProjectThemePresentation(getExtendedCustomization().project.theme)
      : { studioLead: "Tableau de bord de creation pour construire ton bac a sable, organiser le contenu et ouvrir les outils de jeu." }
    const overlay = document.createElement("div")
    overlay.id = "creatorStudioOverlay"
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(5,5,5,0.82);display:flex;align-items:center;justify-content:center;z-index:1000000011;padding:18px;"
    overlay.addEventListener("mousedown", event => { if (event.target === overlay) overlay.remove() })
    const panel = document.createElement("div")
    panel.style.cssText = "width:min(1220px,96vw);max-height:92vh;overflow:auto;background:linear-gradient(180deg,rgba(18,14,10,0.98),rgba(6,6,6,0.98));border:1px solid rgba(214,180,106,0.45);border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,0.7);padding:24px;color:#f3e7cf;font-family:Cinzel,serif;"
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px;">
        <div>
          <div style="font-size:26px;letter-spacing:2px;color:#f0d087;">Studio MJ</div>
          <div style="font-size:13px;line-height:1.6;color:#cdbb96;margin-top:6px;">${esc(studioPresentation.studioLead)}</div>
        </div>
        <button id="creatorStudioClose" style="padding:10px 14px;background:#222;color:#f3e7cf;border:1px solid #555;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Fermer</button>
      </div>
      <div style="display:grid;grid-template-columns:minmax(320px,1.05fr) minmax(420px,1.35fr);gap:18px;align-items:start;">
        <div style="display:grid;gap:18px;">
          <section style="padding:18px;background:rgba(255,255,255,0.03);border:1px solid rgba(214,180,106,0.22);border-radius:14px;">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px;">
              <div>
                <div style="font-size:12px;letter-spacing:2px;color:#cdbb96;">BAC A SABLE</div>
                <div style="font-size:22px;color:#f0d087;margin-top:4px;">${esc(summary.title)}</div>
                <div style="font-size:12px;color:#bfae8b;margin-top:6px;">Ambiance : ${esc(summary.themeLabel)}</div>
                <div style="font-size:12px;color:#bfae8b;margin-top:4px;">Joueurs : ${esc(String(summary.playerCount))}</div>
              </div>
              <button data-studio-open="project" style="padding:10px 14px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Configurer</button>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
              <button data-studio-open="players" style="padding:10px 14px;background:rgba(15,40,56,0.72);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Regler les slots</button>
              <button data-studio-open="project" style="padding:10px 14px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Projet</button>
            </div>
            <div style="display:grid;gap:8px;margin-bottom:12px;padding:12px;border:1px solid rgba(214,180,106,0.18);border-radius:12px;background:rgba(0,0,0,0.16);">
              <div style="font-size:12px;letter-spacing:2px;color:#cdbb96;">CHOISIR LE NOMBRE DE JOUEURS</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                ${[1,2,3,4].map(count => `<button type="button" data-home-player-count="${count}" style="padding:10px 14px;border-radius:999px;border:1px solid ${count === summary.playerCount ? "#caa46b" : "rgba(214,180,106,0.24)"};background:${count === summary.playerCount ? "linear-gradient(#7a5533,#4b321c)" : "rgba(255,255,255,0.06)"};color:#f5e6c8;cursor:pointer;font-family:Cinzel,serif;">${count}</button>`).join("")}
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
              ${summary.players.map(player => `<div style="padding:10px 12px;border:1px solid rgba(160,130,80,0.22);border-radius:10px;background:rgba(0,0,0,0.18);"><div style="font-size:10px;letter-spacing:2px;color:#bfae8b;margin-bottom:4px;">${esc(player.id.toUpperCase())}</div><div style="font-size:14px;color:#f5e6c8;">${esc(player.name)}</div></div>`).join("")}
            </div>
          </section>
          <section style="padding:18px;background:rgba(255,255,255,0.03);border:1px solid rgba(214,180,106,0.22);border-radius:14px;">
            <div style="font-size:12px;letter-spacing:2px;color:#cdbb96;margin-bottom:12px;">OUTILS DE JEU</div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
              <button data-studio-open-menu="mapMenu" style="padding:12px 14px;background:rgba(15,40,56,0.7);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:10px;cursor:pointer;font-family:Cinzel,serif;">Maps</button>
              <button data-studio-open-menu="pnjMenu" style="padding:12px 14px;background:rgba(15,40,56,0.7);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:10px;cursor:pointer;font-family:Cinzel,serif;">PNJ</button>
              <button data-studio-open-menu="mobMenu2" style="padding:12px 14px;background:rgba(15,40,56,0.7);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:10px;cursor:pointer;font-family:Cinzel,serif;">Mobs</button>
              <button data-studio-open-menu="elementsMenu" style="padding:12px 14px;background:rgba(15,40,56,0.7);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:10px;cursor:pointer;font-family:Cinzel,serif;">Documents</button>
              <button id="creatorStudioOpenBoard" style="padding:12px 14px;background:rgba(18,60,42,0.85);color:#d5ffe4;border:1px solid rgba(90,180,120,0.45);border-radius:10px;cursor:pointer;font-family:Cinzel,serif;">Ouvrir le board</button>
            </div>
          </section>
        </div>
        <div style="display:grid;gap:18px;">
          <section style="padding:18px;background:rgba(255,255,255,0.03);border:1px solid rgba(214,180,106,0.22);border-radius:14px;">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px;">
              <div>
                <div style="font-size:12px;letter-spacing:2px;color:#cdbb96;">BIBLIOTHEQUE</div>
                <div style="font-size:20px;color:#f0d087;margin-top:4px;">Contenu du jeu</div>
              </div>
              <button data-studio-open="project" style="padding:10px 14px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Edition complete</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
              <div style="padding:14px;border:1px solid rgba(214,180,106,0.22);border-radius:12px;background:rgba(0,0,0,0.18);"><div style="font-size:16px;color:#f5e6c8;">Maps</div><div style="font-size:28px;color:#f0d087;margin:6px 0 4px;">${summary.totalCounts.maps}</div><div style="font-size:12px;color:#bfae8b;margin-bottom:10px;">${summary.customCounts.maps} custom</div><div style="display:flex;gap:8px;"><button data-studio-open="map" style="flex:1;padding:9px 10px;background:rgba(15,40,56,0.72);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Ajouter</button><button data-studio-open-menu="mapMenu" style="flex:1;padding:9px 10px;background:rgba(15,40,56,0.72);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Ouvrir</button></div></div>
              <div style="padding:14px;border:1px solid rgba(214,180,106,0.22);border-radius:12px;background:rgba(0,0,0,0.18);"><div style="font-size:16px;color:#f5e6c8;">PNJ</div><div style="font-size:28px;color:#f0d087;margin:6px 0 4px;">${summary.totalCounts.pnjs}</div><div style="font-size:12px;color:#bfae8b;margin-bottom:10px;">${summary.customCounts.pnjs} custom</div><div style="display:flex;gap:8px;"><button data-studio-open="pnj" style="flex:1;padding:9px 10px;background:rgba(15,40,56,0.72);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Ajouter</button><button data-studio-open-menu="pnjMenu" style="flex:1;padding:9px 10px;background:rgba(15,40,56,0.72);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Ouvrir</button></div></div>
              <div style="padding:14px;border:1px solid rgba(214,180,106,0.22);border-radius:12px;background:rgba(0,0,0,0.18);"><div style="font-size:16px;color:#f5e6c8;">Mobs</div><div style="font-size:28px;color:#f0d087;margin:6px 0 4px;">${summary.totalCounts.mobs}</div><div style="font-size:12px;color:#bfae8b;margin-bottom:10px;">${summary.customCounts.mobs} custom</div><div style="display:flex;gap:8px;"><button data-studio-open="mob" style="flex:1;padding:9px 10px;background:rgba(15,40,56,0.72);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Ajouter</button><button data-studio-open-menu="mobMenu2" style="flex:1;padding:9px 10px;background:rgba(15,40,56,0.72);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Ouvrir</button></div></div>
              <div style="padding:14px;border:1px solid rgba(214,180,106,0.22);border-radius:12px;background:rgba(0,0,0,0.18);"><div style="font-size:16px;color:#f5e6c8;">Documents</div><div style="font-size:28px;color:#f0d087;margin:6px 0 4px;">${summary.totalCounts.documents}</div><div style="font-size:12px;color:#bfae8b;margin-bottom:10px;">${summary.customCounts.documents} custom</div><div style="display:flex;gap:8px;"><button data-studio-open="document" style="flex:1;padding:9px 10px;background:rgba(15,40,56,0.72);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Ajouter</button><button data-studio-open-menu="elementsMenu" style="flex:1;padding:9px 10px;background:rgba(15,40,56,0.72);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Ouvrir</button></div></div>
            </div>
          </section>
          <section style="padding:18px;background:rgba(255,255,255,0.03);border:1px solid rgba(214,180,106,0.22);border-radius:14px;">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px;">
              <div>
                <div style="font-size:12px;letter-spacing:2px;color:#cdbb96;">ACTIVITE</div>
                <div style="font-size:20px;color:#f0d087;margin-top:4px;">Derniers contenus custom</div>
              </div>
              <div style="font-size:12px;color:#bfae8b;">Assets custom : ${summary.customCounts.assets}</div>
            </div>
            <div style="display:grid;gap:8px;">
              ${summary.latestCustom.length
                ? summary.latestCustom.map(item => `<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid rgba(160,130,80,0.18);border-radius:10px;background:rgba(0,0,0,0.18);"><div><div style="font-size:14px;color:#f5e6c8;">${esc(item.label)}</div><div style="font-size:11px;color:#bfae8b;">${esc(item.type)} • ${esc(item.meta)}</div></div><button data-studio-open="${String(item.type).toLowerCase().includes("document") ? "document" : String(item.type).toLowerCase().includes("mob") ? "mob" : String(item.type).toLowerCase().includes("pnj") ? "pnj" : "map"}" style="padding:8px 12px;background:rgba(15,40,56,0.72);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Editer</button></div>`).join("")
                : `<div style="padding:14px;border:1px dashed rgba(214,180,106,0.28);border-radius:12px;color:#bfae8b;">Aucun contenu custom pour l’instant. Commence par ajouter une map, un PNJ, un mob ou un document.</div>`
              }
            </div>
          </section>
        </div>
      </div>
      `
    overlay.appendChild(panel)
    document.body.appendChild(overlay)
    byId("creatorStudioClose").onclick = () => overlay.remove()
    byId("creatorStudioOpenBoard").onclick = () => overlay.remove()
    panel.querySelectorAll("[data-studio-open]").forEach(button => {
      button.onclick = () => {
        const action = String(button.dataset.studioOpen || "")
        openStudioCustomization(action === "project" ? "" : action)
      }
    })
    panel.querySelectorAll("[data-studio-open-menu]").forEach(button => {
      button.onclick = () => {
        const menuId = String(button.dataset.studioOpenMenu || "")
        overlay.remove()
        openStudioGameMenu(menuId)
      }
    })
    panel.querySelectorAll("[data-home-player-count]").forEach(button => {
      button.onclick = () => {
        const next = getExtendedCustomization()
        next.project.playerCount = Math.max(1, Math.min(4, parseInt(button.dataset.homePlayerCount, 10) || 4))
        saveExtendedCustomization(next)
        applyCustomizationToUI()
        showCreatorStudioHome()
      }
    })
  }

  function openCustomizationPanel(options) {
    if (typeof closeStudioMenusBeforeOpen === "function") closeStudioMenusBeforeOpen("customizationOverlay")
    const existing = byId("customizationOverlay")
    if (existing) existing.remove()
    const customization = getExtendedCustomization()
    const visiblePlayerCount = getSandboxVisiblePlayerCount(customization.project.playerCount)
    const playerEditorCardsMarkup = buildPlayerEditorCards(customization)
    const themeOptionsMarkup = getProjectThemeOptions().map(option => `<option value="${esc(option.value)}"${option.value === customization.project.theme ? " selected" : ""}>${esc(option.label)}</option>`).join("")
    const focusType = options && typeof options === "object" ? String(options.focusType || "") : ""
    const preferredTab = options && typeof options === "object" ? String(options.tab || "") : ""
    const overlay = document.createElement("div")
    overlay.id = "customizationOverlay"
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;z-index:1000000010;padding:18px;"
    overlay.addEventListener("mousedown", event => { if (event.target === overlay) overlay.remove() })
    const panel = document.createElement("div")
    panel.style.cssText = "width:min(1080px,96vw);max-height:92vh;overflow:auto;background:linear-gradient(180deg,rgba(20,16,12,0.98),rgba(8,8,8,0.98));border:1px solid rgba(214,180,106,0.45);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,0.85);padding:22px;color:#f3e7cf;font-family:Cinzel,serif;"
    overlay.appendChild(panel)
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px;"><div><div style="font-size:22px;letter-spacing:2px;color:#f0d087;">Regler le bac a sable</div><div style="font-size:12px;line-height:1.5;color:#cdbb96;margin-top:6px;">Les listes maps, PNJ, mobs et documents sont generees, et tu peux ajouter les tiens.</div></div><button id="customizationClose" style="padding:10px 14px;background:#222;color:#f3e7cf;border:1px solid #555;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Fermer</button></div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px;">
        <button type="button" data-custom-tab-btn="project" style="padding:10px 14px;background:rgba(255,255,255,0.06);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:999px;cursor:pointer;font-family:Cinzel,serif;">Bac a sable</button>
        <button type="button" data-custom-tab-btn="players" style="padding:10px 14px;background:rgba(255,255,255,0.06);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:999px;cursor:pointer;font-family:Cinzel,serif;">Joueurs</button>
        <button type="button" data-custom-tab-btn="content" style="padding:10px 14px;background:rgba(255,255,255,0.06);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:999px;cursor:pointer;font-family:Cinzel,serif;">Contenu</button>
        <button type="button" data-custom-tab-btn="assets" style="padding:10px 14px;background:rgba(255,255,255,0.06);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:999px;cursor:pointer;font-family:Cinzel,serif;">Assets</button>
      </div>
      <div style="display:grid;gap:18px;">
        <section data-custom-tab="project" style="padding:16px;border:1px solid rgba(214,180,106,0.25);border-radius:12px;background:rgba(255,255,255,0.03);display:grid;gap:14px;"><div><div style="font-size:13px;letter-spacing:2px;color:#f0d087;margin-bottom:10px;">Titre</div><input id="customProjectTitle" type="text" value="${esc(customization.project.title)}" style="width:100%;padding:12px 14px;background:rgba(8,8,8,0.9);border:1px solid rgba(180,150,90,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:14px;box-sizing:border-box;"></div><div><div style="font-size:13px;letter-spacing:2px;color:#f0d087;margin-bottom:10px;">Ambiance</div><select id="customProjectTheme" style="width:100%;padding:12px 14px;background:rgba(8,8,8,0.9);border:1px solid rgba(180,150,90,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:14px;box-sizing:border-box;">${themeOptionsMarkup}</select></div><div><div style="font-size:13px;letter-spacing:2px;color:#f0d087;margin-bottom:10px;">Nombre de slots joueurs</div><input id="customProjectPlayerCount" type="number" min="1" max="12" value="${visiblePlayerCount}" style="width:100%;padding:12px 14px;background:rgba(8,8,8,0.9);border:1px solid rgba(180,150,90,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:14px;box-sizing:border-box;"></div><div style="display:flex;flex-wrap:wrap;gap:8px;">${[1,2,3,4,6,8,12].map(count => `<button type="button" data-player-count-choice="${count}" style="padding:10px 14px;border-radius:999px;border:1px solid ${count === visiblePlayerCount ? "#caa46b" : "rgba(214,180,106,0.24)"};background:${count === visiblePlayerCount ? "linear-gradient(#7a5533,#4b321c)" : "rgba(255,255,255,0.06)"};color:#f5e6c8;cursor:pointer;font-family:Cinzel,serif;">${count}</button>`).join("")}</div><div style="font-size:12px;line-height:1.6;color:#bfae8b;">Choisis ici combien de slots joueurs doivent etre visibles sur le board.</div></section>
        <section data-custom-tab="players" style="padding:16px;border:1px solid rgba(214,180,106,0.25);border-radius:12px;background:rgba(255,255,255,0.03);display:grid;gap:14px;"><div><div style="font-size:13px;letter-spacing:2px;color:#f0d087;margin-bottom:10px;">Nombre de slots joueurs visibles</div><div style="display:flex;flex-wrap:wrap;gap:8px;">${[1,2,3,4,6,8,12].map(count => `<button type="button" data-player-count-choice="${count}" style="padding:10px 14px;border-radius:999px;border:1px solid ${count === visiblePlayerCount ? "#caa46b" : "rgba(214,180,106,0.24)"};background:${count === visiblePlayerCount ? "linear-gradient(#7a5533,#4b321c)" : "rgba(255,255,255,0.06)"};color:#f5e6c8;cursor:pointer;font-family:Cinzel,serif;">${count}</button>`).join("")}</div><div style="margin-top:8px;font-size:12px;line-height:1.6;color:#bfae8b;">Les slots visibles jusqu'au nombre choisi peuvent etre renommes, actives ou personnalises ici.</div></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">${playerEditorCardsMarkup}</div></section>
        <section data-custom-tab="content" style="padding:16px;border:1px solid rgba(214,180,106,0.25);border-radius:12px;background:rgba(255,255,255,0.03);"><div style="font-size:13px;letter-spacing:2px;color:#f0d087;margin-bottom:10px;">Ajouter du contenu custom</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;align-items:end;"><label style="display:grid;gap:6px;"><span style="font-size:12px;color:#bfae8b;">Type</span><select id="customItemType" style="width:100%;padding:10px 12px;background:rgba(8,8,8,0.9);border:1px solid rgba(180,150,90,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:13px;box-sizing:border-box;"><option value="map">Map</option><option value="pnj">PNJ</option><option value="highPnj">High PNJ</option><option value="mob">Mob</option><option value="document">Document</option></select></label><label style="display:grid;gap:6px;"><span style="font-size:12px;color:#bfae8b;">Categorie</span><input id="customItemCategory" type="text" placeholder="Ex : Mon univers" style="width:100%;padding:10px 12px;background:rgba(8,8,8,0.9);border:1px solid rgba(180,150,90,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:13px;box-sizing:border-box;"></label><label style="display:grid;gap:6px;"><span style="font-size:12px;color:#bfae8b;">Titre</span><input id="customItemLabel" type="text" placeholder="Ex : Temple du feu" style="width:100%;padding:10px 12px;background:rgba(8,8,8,0.9);border:1px solid rgba(180,150,90,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:13px;box-sizing:border-box;"></label><label style="display:grid;gap:6px;"><span style="font-size:12px;color:#bfae8b;">Image / nom de map / id</span><input id="customItemAsset" type="text" placeholder="Ex : temple.jpg" style="width:100%;padding:10px 12px;background:rgba(8,8,8,0.9);border:1px solid rgba(180,150,90,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:13px;box-sizing:border-box;"></label><label style="display:grid;gap:6px;"><span style="font-size:12px;color:#bfae8b;">Upload image</span><input id="customItemUpload" type="file" accept="image/*" style="font-size:12px;color:#e8d6b3;"></label><label style="display:grid;gap:6px;"><span style="font-size:12px;color:#bfae8b;">Section map</span><select id="customItemSection" style="width:100%;padding:10px 12px;background:rgba(8,8,8,0.9);border:1px solid rgba(180,150,90,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:13px;box-sizing:border-box;"><option value="villes">Villes</option><option value="landscape">Landscape</option><option value="lieux">Lieux</option><option value="monde">Mapmonde</option></select></label><label style="display:grid;gap:6px;"><span style="font-size:12px;color:#bfae8b;">Audio map / tier mob</span><input id="customItemExtra" type="text" placeholder="Ex : maMusique ou weak" style="width:100%;padding:10px 12px;background:rgba(8,8,8,0.9);border:1px solid rgba(180,150,90,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:13px;box-sizing:border-box;"></label><button id="addCustomItem" style="padding:10px 16px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Ajouter</button></div><div id="customContentList" style="display:grid;gap:8px;margin-top:14px;"></div></section>
        <section data-custom-tab="assets" style="padding:16px;border:1px solid rgba(214,180,106,0.25);border-radius:12px;background:rgba(255,255,255,0.03);"><div style="font-size:13px;letter-spacing:2px;color:#f0d087;margin-bottom:10px;">Override d'image cible</div><div style="display:grid;grid-template-columns:1.4fr 1fr auto;gap:10px;align-items:end;"><label style="display:grid;gap:6px;"><span style="font-size:12px;color:#bfae8b;">Nom du fichier existant</span><input id="assetOverrideKey" type="text" placeholder="Ex : taverne.jpg" style="width:100%;padding:10px 12px;background:rgba(8,8,8,0.9);border:1px solid rgba(180,150,90,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:13px;box-sizing:border-box;"></label><label style="display:grid;gap:6px;"><span style="font-size:12px;color:#bfae8b;">Image de remplacement</span><input id="assetOverrideFile" type="file" accept="image/*" style="font-size:12px;color:#e8d6b3;"></label><button id="assetOverrideSave" style="padding:10px 16px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Ajouter</button></div><div id="assetOverrideList" style="display:grid;gap:8px;margin-top:14px;"></div></section>
        <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;"><button id="customizationLaunch" style="padding:10px 16px;background:rgba(15,40,56,0.72);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Lancer la partie</button><button id="customizationExport" style="padding:10px 16px;background:rgba(69,52,23,0.78);color:#f0d8ab;border:1px solid rgba(202,164,107,0.4);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Exporter une version jouable</button><button id="customizationReset" style="padding:10px 14px;background:#3a0000;color:#ffd1d1;border:1px solid #6e2e2e;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Reinitialiser le bac a sable</button><button id="customizationSave" style="padding:10px 16px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Sauvegarder le bac a sable</button></div>
      </div>`
    document.body.appendChild(overlay)
    byId("customizationClose").onclick = () => overlay.remove()
    const availableTabs = ["project", "players", "content", "assets"]
    const initialTab = availableTabs.includes(preferredTab) ? preferredTab : (focusType ? "content" : "project")
    function activateTab(tabName) {
      const wanted = availableTabs.includes(tabName) ? tabName : "project"
      panel.querySelectorAll("[data-custom-tab]").forEach(section => {
        section.style.display = section.dataset.customTab === wanted ? "grid" : "none"
      })
      panel.querySelectorAll("[data-custom-tab-btn]").forEach(button => {
        const active = button.dataset.customTabBtn === wanted
        button.style.background = active ? "linear-gradient(#7a5533,#4b321c)" : "rgba(255,255,255,0.06)"
        button.style.borderColor = active ? "#caa46b" : "rgba(214,180,106,0.24)"
        button.style.color = active ? "#f5e6c8" : "#e8d8b6"
      })
    }
    panel.querySelectorAll("[data-custom-tab-btn]").forEach(button => {
      button.onclick = () => activateTab(button.dataset.customTabBtn)
    })
    activateTab(initialTab)
    if (focusType && byId("customItemType")) byId("customItemType").value = focusType
    panel.querySelectorAll("[data-custom-upload]").forEach(input => {
      input.addEventListener("change", async event => {
        const file = event.target.files && event.target.files[0]
        if (!file) return
        const dataUrl = await readFileAsDataURL(file)
        const playerId = event.target.dataset.customUpload
        const target = panel.querySelector(`[data-custom-image="${playerId}"]`)
        if (target) target.value = dataUrl
        const preview = panel.querySelector(`[data-custom-preview="${playerId}"]`)
        if (preview) preview.src = dataUrl
        liveApplyProjectSettings()
      })
    })
    byId("addCustomItem").onclick = async () => {
      const next = getExtendedCustomization()
      const type = String(byId("customItemType").value || "")
      const category = String(byId("customItemCategory").value || "").trim() || "Custom"
      const label = String(byId("customItemLabel").value || "").trim()
      let asset = String(byId("customItemAsset").value || "").trim()
      const file = byId("customItemUpload").files && byId("customItemUpload").files[0]
      const section = String(byId("customItemSection").value || "lieux")
      const extra = String(byId("customItemExtra").value || "").trim()
      if (!label) return
      if (file) asset = await readFileAsDataURL(file)
      if (!asset) return
      if (type === "map") next.content.maps.push({ label, category, map: asset, audio: extra, section })
      if (type === "pnj") next.content.pnjs.push({ label, category, image: asset })
      if (type === "highPnj") next.content.highPnjs.push({ label, category, image: asset, title: label })
      if (type === "document") next.content.documents.push({ label, category, image: asset, title: label })
      if (type === "mob") {
        const mobId = slugify(label)
        next.content.mobs.push({ label, category, id: mobId, action: extra === "boss" ? "boss" : "diff", tier: extra || "weak", baseHP: 30, combatOnly: false })
        next.assets[mobId + ".png"] = /^(https?:|data:|blob:|\/|images\/)/i.test(asset) ? asset : ("images/" + asset.replace(/^images\//i, ""))
      }
      saveExtendedCustomization(next)
      ;["customItemCategory", "customItemLabel", "customItemAsset", "customItemExtra"].forEach(id => byId(id).value = "")
      byId("customItemUpload").value = ""
      renderCustomList()
      applyCustomizationToUI()
    }
    byId("assetOverrideSave").onclick = async () => {
      const key = String(byId("assetOverrideKey").value || "").trim()
      const file = byId("assetOverrideFile").files && byId("assetOverrideFile").files[0]
      if (!key || !file) return
      const next = getExtendedCustomization()
      next.assets[key] = await readFileAsDataURL(file)
      saveExtendedCustomization(next)
      byId("assetOverrideKey").value = ""
      byId("assetOverrideFile").value = ""
      renderAssetOverrides()
      applyCustomizationToUI()
    }
    function collectCustomizationFromPanel() {
      const next = getExtendedCustomization()
      next.project.title = String(byId("customProjectTitle").value || "").trim() || "Roleplay It Yourself"
      next.project.theme = String(byId("customProjectTheme").value || "").trim() || getDefaultCustomization().project.theme
      next.project.playerCount = getSandboxVisiblePlayerCount(byId("customProjectPlayerCount").value)
      for (let slotIndex = 1; slotIndex <= next.project.playerCount; slotIndex += 1) {
        const playerKey = getSandboxPlayerKey(slotIndex)
        next.players[playerKey] = next.players[playerKey] || { name: getDefaultPlayerSlotLabel(playerKey), image: "", enabled: true }
        const nameField = panel.querySelector(`[data-custom-name="${playerKey}"]`)
        const imageField = panel.querySelector(`[data-custom-image="${playerKey}"]`)
        const enabledField = panel.querySelector(`[data-custom-enabled="${playerKey}"]`)
        next.players[playerKey].name = String(nameField && nameField.value || "").trim() || getDefaultPlayerSlotLabel(playerKey)
        next.players[playerKey].image = String(imageField && imageField.value || "").trim()
        next.players[playerKey].enabled = !!(enabledField && enabledField.checked)
      }
      return next
    }

    function liveApplyProjectSettings() {
      const next = collectCustomizationFromPanel()
      saveExtendedCustomization(next)
      applyCustomizationToUI()
    }

    ;["customProjectTitle", "customProjectTheme", "customProjectPlayerCount"].forEach(id => {
      const field = byId(id)
      if (!field) return
      field.addEventListener("input", liveApplyProjectSettings)
      field.addEventListener("change", liveApplyProjectSettings)
    })
    panel.querySelectorAll("[data-custom-name]").forEach(field => {
      const syncPreview = () => {
        const playerId = field.dataset.customName
        const previewName = panel.querySelector(`[data-custom-preview-name="${playerId}"]`)
        if (previewName) previewName.textContent = String(field.value || "").trim() || getDefaultPlayerSlotLabel(playerId)
        liveApplyProjectSettings()
      }
      field.addEventListener("input", syncPreview)
      field.addEventListener("change", syncPreview)
    })
    panel.querySelectorAll("[data-custom-image]").forEach(field => {
      const syncPreview = () => {
        const playerId = field.dataset.customImage
        const preview = panel.querySelector(`[data-custom-preview="${playerId}"]`)
        if (preview) preview.src = String(field.value || "").trim() || getDefaultPlayerSlotImage(playerId)
        liveApplyProjectSettings()
      }
      field.addEventListener("input", syncPreview)
      field.addEventListener("change", syncPreview)
    })
    panel.querySelectorAll("[data-custom-enabled]").forEach(field => {
      field.addEventListener("change", liveApplyProjectSettings)
    })
    panel.querySelectorAll("[data-player-count-choice]").forEach(button => {
      button.onclick = () => {
        const field = byId("customProjectPlayerCount")
        if (!field) return
        field.value = button.dataset.playerCountChoice
        liveApplyProjectSettings()
        panel.querySelectorAll("[data-player-count-choice]").forEach(btn => {
          const active = btn === button
          btn.style.background = active ? "linear-gradient(#7a5533,#4b321c)" : "rgba(255,255,255,0.06)"
          btn.style.borderColor = active ? "#caa46b" : "rgba(214,180,106,0.24)"
        })
      }
    })

    byId("customizationSave").onclick = () => {
      const next = collectCustomizationFromPanel()
      saveExtendedCustomization(next)
      applyCustomizationToUI()
      overlay.remove()
      if (typeof showNotification === "function") showNotification("Bac a sable mis a jour")
    }

    byId("customizationExport").onclick = () => {
      const next = collectCustomizationFromPanel()
      saveExtendedCustomization(next)
      applyCustomizationToUI()
      if (typeof window !== "undefined" && typeof window.exportSandboxFromMenu === "function") window.exportSandboxFromMenu()
    }

    byId("customizationLaunch").onclick = () => {
      const next = collectCustomizationFromPanel()
      saveExtendedCustomization(next)
      applyCustomizationToUI()
      overlay.remove()
      if (typeof launchSessionFromSandbox === "function") launchSessionFromSandbox()
    }
    byId("customizationReset").onclick = () => {
      localStorage.removeItem(CUSTOMIZATION_STORAGE_KEY)
      applyCustomizationToUI()
      overlay.remove()
      if (typeof showNotification === "function") showNotification("Bac a sable reinitialise")
    }
    renderCustomList()
    renderAssetOverrides()
  }

  function injectCustomizationButton() {
    if (byId("customizationLauncher")) return
    const button = document.createElement("button")
    button.id = "customizationLauncher"
    button.type = "button"
    button.innerText = "Studio MJ"
    button.style.cssText = "position:fixed;right:14px;top:14px;z-index:1000000002;padding:10px 14px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:10px;cursor:pointer;font-family:Cinzel,serif;box-shadow:0 8px 22px rgba(0,0,0,0.45);"
    button.onclick = openCustomizationPanel
    document.body.appendChild(button)
  }

  function isGameStartedValue() {
    try {
      return typeof gameStarted !== "undefined" ? !!gameStarted : !!window.gameStarted
    } catch (e) {
      return !!window.gameStarted
    }
  }

  function isGMValue() {
    try {
      return typeof isGM !== "undefined" ? !!isGM : !!window.isGM
    } catch (e) {
      return !!window.isGM
    }
  }

  function ensureGameStartedForHub() {
    if (!isGameStartedValue() && typeof startGame === "function") {
      startGame()
      return 1650
    }
    return 0
  }

  function openCreatorStudio() {
    try {
      showCreatorStudioHome()
    } catch (error) {
      console.warn("Studio MJ fallback:", error)
      try {
        openCustomizationPanel()
      } catch (fallbackError) {
        console.error("Studio MJ unavailable:", fallbackError)
        if (typeof showNotification === "function") {
          showNotification("Studio MJ indisponible pour le moment.")
        }
      }
    }
  }

  function openPlayerStudio() {
    const bootDelay = ensureGameStartedForHub()
    setTimeout(() => {
      if (typeof openJoinSessionOverlay === "function") {
        openJoinSessionOverlay()
        return
      }
      if (typeof openPlayerMenuOnStart === "function") openPlayerMenuOnStart()
      const playerMenu = byId("playerMenu")
      if (playerMenu) playerMenu.classList.add("open")
    }, 220 + bootDelay)
  }

  function patchRuntimeFunctions() {
    if (typeof window.choosePlayer === "function" && !window.__customChoosePlayerPatched) {
      const original = window.choosePlayer
      window.choosePlayer = function () {
        const result = original.apply(this, arguments)
        setTimeout(applyCustomizationToUI, 20)
        return result
      }
      window.__customChoosePlayerPatched = true
    }
    if (typeof window.openCharacterSheet === "function" && !window.__customSheetPatched) {
      const original = window.openCharacterSheet
      window.openCharacterSheet = function (id) {
        const result = original.apply(this, arguments)
        const playerId = id || (window.myToken && window.myToken.id) || ""
        const title = byId("sheetTitle")
        if (title && playerId) title.innerText = getPlayerDisplayName(playerId)
        const image = byId("sheetImage")
        const playerImage = getPlayerCustomization(playerId).image
        if (image && playerImage) image.src = playerImage
        return result
      }
      window.__customSheetPatched = true
    }
    if (typeof window.animateGameTitle === "function" && !window.__customTitlePatched) {
      const original = window.animateGameTitle
      window.animateGameTitle = function () {
        const result = original.apply(this, arguments)
        setTimeout(refreshProjectTitle, 0)
        return result
      }
      window.__customTitlePatched = true
    }
    if (typeof window.activateGM === "function" && !window.__customActivateGMPatched) {
      const original = window.activateGM
      window.activateGM = function () {
        const result = original.apply(this, arguments)
        if (window.__pendingStudioMenuId) {
          const pendingMenuId = String(window.__pendingStudioMenuId)
          window.__pendingStudioMenuId = ""
          setTimeout(() => openStudioGameMenu(pendingMenuId), 180)
        }
        if (window.__openBuilderAfterGMAuth) {
          window.__openBuilderAfterGMAuth = false
          setTimeout(showCreatorStudioHome, 180)
        }
        return result
      }
      window.__customActivateGMPatched = true
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureCustomMobsRegistered()
    injectCustomizationButton()
    applyCustomizationToUI()
    setTimeout(patchRuntimeFunctions, 300)
    setTimeout(applyCustomizationToUI, 700)
    document.addEventListener("mousedown", event => {
      const root = event.target && event.target.closest ? event.target.closest(".sandboxPlayersMenu") : null
      if (!root) closeSandboxPlayerMenu()
    })
  })

  function closeSandboxPlayerMenu() {
    const menu = byId("sandboxPlayersMenu")
    if (menu) menu.open = false
  }

  function forceSandboxPlayerCountUI(count) {
    const safeCount = getSandboxVisiblePlayerCount(count)
    if (document.body) {
      document.body.setAttribute("data-sandbox-player-count", String(safeCount))
    }
    ensureSandboxExtraTokens(safeCount)
    PLAYER_IDS.forEach((playerId, index) => {
      const token = byId(playerId)
      const isVisible = index < safeCount
      if (token) {
        token.hidden = !isVisible
        token.style.display = isVisible ? "flex" : "none"
        token.style.visibility = isVisible ? "visible" : "hidden"
        token.style.pointerEvents = isVisible ? "auto" : "none"
      }
      document.querySelectorAll(`[data-player-choice="${playerId}"]`).forEach(button => {
        button.hidden = !isVisible
        button.style.display = isVisible ? "" : "none"
      })
    })
    const gmCharacters = byId("gmCharacters")
    if (gmCharacters) {
      gmCharacters.innerHTML = buildSandboxCharacterButtonsMarkup(safeCount)
    }
    syncSandboxPlayerCountControls(safeCount)
  }

  function syncSandboxPlayerCountControls(count) {
    const safeCount = getSandboxVisiblePlayerCount(count)
    if (document.body) {
      document.body.setAttribute("data-sandbox-player-count", String(safeCount))
    }
    const input = byId("sandboxPlayersCustomInput")
    if (input) input.value = String(safeCount)
    const button = byId("sandboxPlayersBtn")
    if (button) button.textContent = safeCount > 1 ? `Joueurs (${safeCount})` : "Joueurs (1)"
  }

  function applySandboxPlayerCountToBoard(count) {
    const next = getExtendedCustomization()
    next.project.playerCount = getSandboxVisiblePlayerCount(count)
    saveExtendedCustomization(next)
    forceSandboxPlayerCountUI(next.project.playerCount)
    forceSandboxPlayerVisibility(next.project.playerCount)
    applyCustomizationToUI()
    syncSandboxPlayerCountControls(next.project.playerCount)
    if (typeof showNotification === "function") showNotification("Slots joueurs : " + next.project.playerCount)
  }

  function setSandboxPlayerCount(count) {
    applySandboxPlayerCountToBoard(count)
    closeSandboxPlayerMenu()
  }

  function applyCustomSandboxPlayerCount() {
    const input = byId("sandboxPlayersCustomInput")
    applySandboxPlayerCountToBoard(input ? input.value : 4)
    closeSandboxPlayerMenu()
  }

  window.applyCustomizationToUI = applyCustomizationToUI
  window.openCustomizationPanel = openCustomizationPanel
  window.openCreatorStudio = openCreatorStudio
  window.openPlayerStudio = openPlayerStudio
  window.setSandboxPlayerCount = setSandboxPlayerCount
  window.applyCustomSandboxPlayerCount = applyCustomSandboxPlayerCount
  window.closeSandboxPlayerMenu = closeSandboxPlayerMenu
  window.forceSandboxPlayerCountUI = forceSandboxPlayerCountUI
})()
