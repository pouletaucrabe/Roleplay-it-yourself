"use strict"

/* ========================= */
/* FICHE PERSONNAGE          */
/* ========================= */

function openCharacterSheet(id = null) {
  if (typeof openSimpleCharacterSheet === "function") {
    let playerID
    if (isGM) { if (!id) return; playerID = id }
    else {
      if (!myToken) { showNotification("Choisissez un personnage"); return }
      playerID = id === "bibi" ? "bibi" : myToken.id
    }
    currentSheetPlayer = playerID
    return openSimpleCharacterSheet(playerID)
  }
  let playerID
  if (isGM) { if (!id) return; playerID = id }
  else {
    if (!myToken) { showNotification("Choisissez un personnage"); return }
    playerID = id === "bibi" ? "bibi" : myToken.id
  }
  currentSheetPlayer = playerID
  // Marquer la fiche avec l'ID du joueur pour eviter les sauvegardes croisees
  const sheet = document.getElementById("characterSheet")
  if (sheet) sheet.dataset.playerId = playerID
  const inv = document.getElementById("inventaire")
  if (playerID === "bibi" && myToken && myToken.id !== "greg") inv.setAttribute("readonly", true)
  else inv.removeAttribute("readonly")
  const portraits = { greg:"gregsheet.jpg", ju:"yusheet.jpg", elo:"elosheet.jpg", bibi:"bibisheet.jpg" }
  let portraitSrc = "images/" + (portraits[playerID] || "elosheet.jpg")
  try {
    if (typeof getPlayerCustomization === "function") {
      const customization = getPlayerCustomization(playerID)
      if (customization && customization.image) portraitSrc = customization.image
    }
  } catch (e) {}
  document.getElementById("sheetImage").src = portraitSrc
  document.getElementById("sheetTitle").innerText = getPlayerDisplayName(playerID)
  document.querySelectorAll(".playerOnly").forEach(f => { f.style.display = playerID === "bibi" ? "none" : "block" })
  db.ref("characters/" + playerID).once("value", snapshot => {
    const data = snapshot.val() || {}
    const defaults = {
      characterName: getPlayerDisplayName(playerID),
      characterClass: "",
      origin: "",
      background: "",
      lvl: 1,
      xp: 0,
      initiative: 0,
      armor: 0,
      speed: "",
      passive: 10,
      hp: 100,
      hpMax: 100,
      mana: 0,
      manaMax: 0,
      stamina: 0,
      staminaMax: 0,
      force: 0,
      charme: 0,
      perspi: 0,
      chance: 0,
      defense: 0,
      customStat: 0,
      weaponMain: "",
      weaponOff: "",
      armorName: "",
      signatureItem: "",
      inventaire: "",
      allies: "",
      quests: "",
      traits: "",
      backstory: "",
      notes: ""
    }
    document.querySelectorAll("#characterSheet .sheetField").forEach(el => {
      if (!el || !el.id || el.id === "weight" || el.id === "maxWeight") return
      const fallback = Object.prototype.hasOwnProperty.call(defaults, el.id) ? defaults[el.id] : ""
      el.value = data[el.id] != null ? data[el.id] : fallback
    })
    if (!window._playerMaxPoids) window._playerMaxPoids = {}
    window._playerMaxPoids[playerID] = data.poids || data.maxWeight || 100
    const mw = document.getElementById("maxWeight"); if (mw) mw.value = window._playerMaxPoids[playerID]
    curseLevel = data.curse || 0
    document.querySelectorAll(".curseGem").forEach((g, i) => g.classList.toggle("active", i < curseLevel))
    corruptionLevel = data.corruption || 0
    document.querySelectorAll(".corruptionPoint").forEach((b, i) => b.classList.toggle("active", i < corruptionLevel))
    updateHPBar(); updateManaBar(); updateStaminaBar(); updateWeightBar()
  })
  document.getElementById("characterSheet").style.display = "block"
  loadGold(playerID)
  try { if (typeof syncNotebookDockButtonState === "function") syncNotebookDockButtonState() } catch (_) {}
  // Verifier si des points libres sont disponibles
  if (!isGM || playerID === myToken?.id) setTimeout(() => checkFreePoints(playerID), 300)
}

function closeCharacterSheet() {
  saveCharacter()
  const sheet = document.getElementById("characterSheet"); if (!sheet) return
  sheet.style.display = "none"
  if (pendingLevelUp[currentSheetPlayer]) { triggerLevelUp(currentSheetPlayer); pendingLevelUp[currentSheetPlayer] = false }
  try { if (typeof syncNotebookDockButtonState === "function") syncNotebookDockButtonState() } catch (_) {}
}

function forceCloseCharacterSheetWithoutSave() {
  const sheet = document.getElementById("characterSheet")
  if (!sheet) return
  sheet.style.display = "none"
  sheet.dataset.playerId = ""
  currentSheetPlayer = null
  const title = document.getElementById("sheetTitle")
  if (title) title.innerText = ""
  const img = document.getElementById("sheetImage")
  if (img) img.removeAttribute("src")
  document.querySelectorAll("#characterSheet .sheetField").forEach(f => {
    if ("value" in f) f.value = ""
  })
}

function saveCharacter() {
  if (!myToken && !isGM) return
  if (!isGM && currentSheetPlayer === "bibi" && myToken && myToken.id !== "greg") return
  const id = currentSheetPlayer, data = {}
  document.querySelectorAll("#characterSheet .sheetField").forEach(f => {
    if (f.offsetParent !== null && f.id !== "weight" && f.id !== "maxWeight") data[f.id] = f.value
  })
  const maxWeightField = document.getElementById("maxWeight")
  data.poids = parseInt(maxWeightField && maxWeightField.value, 10) || 100
  if (!window._playerMaxPoids) window._playerMaxPoids = {}
  window._playerMaxPoids[id] = data.poids
  db.ref("characters/" + id).update(data).catch(console.error)
  showNotification("Fiche sauvegardee")
}

function autoSaveCharacter() {
  if (!myToken && !isGM) return
  const id = currentSheetPlayer; if (!id) return

  // Securite - verifier que l'ID de la fiche ouverte correspond bien
  const sheet = document.getElementById("characterSheet")
  const sheetId = sheet?.dataset.playerId
  if (sheetId && sheetId !== id) return
  if (!isGM && myToken && myToken.id !== id && !(myToken.id === "greg" && id === "bibi")) return

  const data = {}
  document.querySelectorAll("#characterSheet .sheetField").forEach(f => {
    if (f.offsetParent !== null && f.id !== "weight" && f.id !== "maxWeight") {
      const v = f.value.trim(); if (v !== "") data[f.id] = isNaN(v) ? v : parseInt(v)
    }
  })
  const maxWeightField = document.getElementById("maxWeight")
  data.poids = parseInt(maxWeightField && maxWeightField.value, 10) || 100
  if (!window._playerMaxPoids) window._playerMaxPoids = {}
  window._playerMaxPoids[id] = data.poids
  if (Object.keys(data).length > 0) db.ref("characters/" + id).update(data).then(() => ["greg","ju","elo","bibi"].forEach(p => updateTokenStats(p)))
}

function updateHPBar() {
  const hp = parseInt(document.getElementById("hp").value, 10) || 0
  const hpMax = Math.max(1, parseInt(document.getElementById("hpMax").value, 10) || 100)
  document.getElementById("hpBar").style.width = Math.max(0, Math.min(100, (hp / hpMax) * 100)) + "%"
}

function updateManaBar() {
  const mana = parseInt(document.getElementById("mana").value, 10) || 0
  const manaMax = Math.max(1, parseInt(document.getElementById("manaMax").value, 10) || 1)
  document.getElementById("manaBar").style.width = Math.max(0, Math.min(100, (mana / manaMax) * 100)) + "%"
}

function updateStaminaBar() {
  const stamina = parseInt(document.getElementById("stamina").value, 10) || 0
  const staminaMax = Math.max(1, parseInt(document.getElementById("staminaMax").value, 10) || 1)
  document.getElementById("staminaBar").style.width = Math.max(0, Math.min(100, (stamina / staminaMax) * 100)) + "%"
}

function _parseInventoryWeight(text) {
  let total = 0
  text.split("\n").forEach(line => {
    const wm = line.match(/\(([^)]+)\)/); if (!wm) return
    // Retirer "kg" et espaces, remplacer virgule par point
    const cleaned = wm[1].replace(/[kg\s]/gi, "").replace(",", ".")
    const w = parseFloat(cleaned); if (isNaN(w)) return
    const qm = line.match(/x(\d+)/i)
    total += w * (qm ? parseInt(qm[1]) : 1)
  })
  return Math.round(total * 10) / 10  // arrondi Ã  1 dÃ©cimale
}

function updateWeightBar() {
  if (!currentSheetPlayer) return
  const text = document.getElementById("inventaire").value
  const total = _parseInventoryWeight(text)
  // Utiliser le max dÃ©jÃ  chargÃ© en mÃ©moire, fallback Firebase si absent
  const cachedMax = window._playerMaxPoids && window._playerMaxPoids[currentSheetPlayer]
  const applyMax = max => {
    document.getElementById("weight").value    = total
    document.getElementById("maxWeight").value = max
    const pct = Math.min(100, (total / max) * 100)
    const bar = document.getElementById("weightBar")
    bar.style.width = pct + "%"
    bar.style.background = pct < 70 ? "lime" : pct < 100 ? "orange" : "red"
  }
  if (cachedMax) {
    applyMax(cachedMax)
  } else {
    db.ref("characters/" + currentSheetPlayer + "/poids").once("value", snap => {
      const max = snap.val() || 100
      if (!window._playerMaxPoids) window._playerMaxPoids = {}
      window._playerMaxPoids[currentSheetPlayer] = max
      applyMax(max)
    })
  }
}

document.addEventListener("input", event => {
  const target = event.target
  if (!target || !target.id) return
  if (target.id === "hp" || target.id === "hpMax") updateHPBar()
  if (target.id === "mana" || target.id === "manaMax") updateManaBar()
  if (target.id === "stamina" || target.id === "staminaMax") updateStaminaBar()
  if (target.id === "inventaire" || target.id === "maxWeight") updateWeightBar()
})

/* ========================= */
/* COMBAT UI                 */
/* ========================= */

function loadPlayerCombatStats() {
  if (!myToken) return
  if (window.__combatStatsRef && window.__combatStatsCb) {
    window.__combatStatsRef.off("value", window.__combatStatsCb)
  }
  const ref = db.ref("characters/" + myToken.id)
  const cb = snap => {
    const d = snap.val(); if (!d) return
    ;["force","charme","perspi","chance","defense","hp"].forEach(k => { const el = document.getElementById("combat_"+k); if (el) el.value = d[k] || 0 })
    updateCombatHPBar(d.hp || 0)
    if (!isGM && (combatActive || gameState === "COMBAT") && (parseInt(d.hp, 10) || 0) <= 0 && !window.__combatOutcomeShowing) {
      if (typeof triggerLocalDefeat === "function") triggerLocalDefeat("hp")
    }
  }
  window.__combatStatsRef = ref
  window.__combatStatsCb = cb
  ref.on("value", cb)
}

function saveCombatStats() {
  if (!myToken) return
  const hp = parseInt(document.getElementById("combat_hp").value) || 0
  const data = {}
  ;["force","charme","perspi","chance","defense"].forEach(k => { data[k] = document.getElementById("combat_"+k).value })
  data.hp = hp
  db.ref("characters/" + myToken.id).update(data).catch(console.error)
  const bar = document.getElementById("hp_" + myToken.id); if (bar) bar.style.width = Math.max(0, Math.min(100, hp)) + "%"
  updateTokenGlow(myToken.id, hp); updateTokenStats(myToken.id); updateCombatHPBar(hp)
}

function updateCombatHPBar(hp) {
  const bar = document.getElementById("combatHPBar"); if (!bar) return
  const pct = Math.max(0, Math.min(100, hp)); bar.style.width = pct + "%"
  if (pct > 60)      { bar.style.background = "linear-gradient(90deg,#3cff6b,#0b8a3a)"; bar.style.boxShadow = "0 0 8px lime"; bar.style.animation = "none" }
  else if (pct > 30) { bar.style.background = "linear-gradient(90deg,#ffb347,#ff7b00)"; bar.style.boxShadow = "0 0 8px orange"; bar.style.animation = "none" }
  else               { bar.style.background = "linear-gradient(90deg,#ff4040,#8b0000)"; bar.style.boxShadow = "0 0 10px red"; bar.style.animation = "hpDangerPulse 0.7s infinite alternate" }
}

function appendAttackLine(container, label, value) {
  if (value == null || value === "") return
  const line = document.createElement("div")
  line.className = "attackLine"
  const labelEl = document.createElement("span")
  labelEl.className = "attackLabel"
  labelEl.innerText = label + " :"
  line.appendChild(labelEl)
  line.appendChild(document.createTextNode(" " + value))
  container.appendChild(line)
}

function appendAttackDiceLine(container, dice, stat) {
  if (!dice) return
  const line = document.createElement("div")
  line.className = "attackLine"
  const labelEl = document.createElement("span")
  labelEl.className = "attackLabel"
  labelEl.innerText = "Jet :"
  const diceEl = document.createElement("span")
  diceEl.className = "attackDice"
  diceEl.innerText = "d" + dice
  line.appendChild(labelEl)
  line.appendChild(document.createTextNode(" ðŸŽ² "))
  line.appendChild(diceEl)
  if (stat) {
    const statEl = document.createElement("span")
    statEl.className = "attackStat"
    statEl.innerText = String(stat).toUpperCase()
    line.appendChild(document.createTextNode(" + "))
    line.appendChild(statEl)
  }
  container.appendChild(line)
}

function populateAttackBlock(block, attack) {
  const t = document.createElement("div")
  t.className = "combatAttack"
  t.innerText = attack.name
  block.appendChild(t)
  appendAttackLine(block, "Type", attack.type)
  appendAttackDiceLine(block, attack.dice, attack.stat)
  appendAttackLine(block, "Effet", attack.effect)
  appendAttackLine(block, "Crit", attack.crit)
}

function getVisibleCombatPlayerIds() {
  const rawCount = document.body && document.body.getAttribute("data-sandbox-player-count")
  const count = Math.max(1, Math.min(12, parseInt(rawCount, 10) || 4))
  return Array.from({ length: count }, function(_, index) {
    const slotIndex = index + 1
    if (slotIndex === 1) return "greg"
    if (slotIndex === 2) return "ju"
    if (slotIndex === 3) return "elo"
    if (slotIndex === 4) return "bibi"
    return "slot_" + slotIndex
  })
}

function getCombatPlayerPortraitPath(playerID) {
  try {
    if (typeof resolveImagePath === "function") {
      return resolveImagePath(playerID + ".png")
    }
  } catch (_) {}
  return "images/" + sanitizeAssetName(playerID + ".png")
}

function cloneCombatAttack(attack) {
  return {
    name: String(attack && attack.name || "Nouvelle attaque"),
    type: String(attack && attack.type || "Attaque"),
    dice: Math.max(2, parseInt(attack && attack.dice, 10) || 12),
    stat: String(attack && attack.stat || "Force"),
    effect: String(attack && attack.effect || ""),
    crit: String(attack && attack.crit || "")
  }
}

function getPlayerCombatAttacks(playerID) {
  try {
    const customization = typeof getCustomization === "function" ? getCustomization() : null
    const player = customization && customization.players && customization.players[playerID]
      ? customization.players[playerID]
      : null
    if (player && Array.isArray(player.combatAttacks) && player.combatAttacks.length) {
      return player.combatAttacks.map(cloneCombatAttack)
    }
  } catch (_) {}
  const legacy = attacks && Array.isArray(attacks[playerID]) ? attacks[playerID] : []
  return legacy.map(cloneCombatAttack)
}

function savePlayerCombatAttacks(playerID, items) {
  try {
    if (typeof getCustomization !== "function" || typeof saveCustomization !== "function") return false
    const next = getCustomization()
    next.players = next.players && typeof next.players === "object" ? next.players : {}
    next.players[playerID] = next.players[playerID] && typeof next.players[playerID] === "object"
      ? next.players[playerID]
      : { name: typeof getPlayerDisplayName === "function" ? getPlayerDisplayName(playerID) : playerID, image: "", enabled: true }
    next.players[playerID].combatAttacks = (Array.isArray(items) ? items : []).map(cloneCombatAttack)
    saveCustomization(next)
    return true
  } catch (_) {}
  return false
}

function movePlayerCombatAttack(playerID, attackIndex, direction) {
  const items = getPlayerCombatAttacks(playerID)
  const sourceIndex = Number(attackIndex)
  const destIndex = sourceIndex + Number(direction || 0)
  if (sourceIndex < 0 || sourceIndex >= items.length || destIndex < 0 || destIndex >= items.length) return false
  const moved = items.splice(sourceIndex, 1)[0]
  items.splice(destIndex, 0, moved)
  if (!savePlayerCombatAttacks(playerID, items)) return false
  const old = document.getElementById("gmMini_" + playerID)
  if (old) { cleanupGMPlayerSheetListener(playerID); old.remove() }
  openGMPlayerSheet(playerID)
  return false
}

function deletePlayerCombatAttack(playerID, attackIndex) {
  const items = getPlayerCombatAttacks(playerID)
  const sourceIndex = Number(attackIndex)
  if (sourceIndex < 0 || sourceIndex >= items.length) return false
  items.splice(sourceIndex, 1)
  if (!savePlayerCombatAttacks(playerID, items)) return false
  const old = document.getElementById("gmMini_" + playerID)
  if (old) { cleanupGMPlayerSheetListener(playerID); old.remove() }
  openGMPlayerSheet(playerID)
  return false
}

function addPlayerCombatAttack(playerID) {
  const items = getPlayerCombatAttacks(playerID)
  items.push(cloneCombatAttack(null))
  if (!savePlayerCombatAttacks(playerID, items)) return false
  const old = document.getElementById("gmMini_" + playerID)
  if (old) { cleanupGMPlayerSheetListener(playerID); old.remove() }
  openGMPlayerSheet(playerID)
  return false
}

function updatePlayerCombatAttackField(playerID, attackIndex, field, value) {
  const items = getPlayerCombatAttacks(playerID)
  const target = items[Number(attackIndex)]
  if (!target) return false
  if (field === "dice") target[field] = Math.max(2, parseInt(value, 10) || 12)
  else target[field] = String(value || "").trim()
  return savePlayerCombatAttacks(playerID, items)
}

function buildGMEditableAttackBlock(playerID, attack, attackIndex) {
  const block = document.createElement("div")
  block.className = "combatBlock gmEditableAttackBlock"
  block.innerHTML =
    `<label class="gmAttackField"><span>Nom</span><input type="text" value="${String(attack.name || "").replace(/"/g, "&quot;")}"></label>` +
    `<div class="gmAttackRow">` +
      `<label class="gmAttackField"><span>Type</span><input type="text" value="${String(attack.type || "").replace(/"/g, "&quot;")}"></label>` +
      `<label class="gmAttackField gmAttackDiceField"><span>De</span><input type="number" min="2" max="100" value="${Math.max(2, parseInt(attack.dice, 10) || 12)}"></label>` +
      `<label class="gmAttackField"><span>Stat</span><input type="text" value="${String(attack.stat || "").replace(/"/g, "&quot;")}"></label>` +
    `</div>` +
    `<label class="gmAttackField"><span>Effet</span><textarea rows="2">${String(attack.effect || "")}</textarea></label>` +
    `<label class="gmAttackField"><span>Crit</span><textarea rows="2">${String(attack.crit || "")}</textarea></label>` +
    `<div class="gmAttackControls">` +
      `<button type="button">Monter</button>` +
      `<button type="button">Descendre</button>` +
      `<button type="button" class="danger">Supprimer</button>` +
    `</div>`
  const inputs = block.querySelectorAll("input, textarea")
  const fields = ["name", "type", "dice", "stat", "effect", "crit"]
  inputs.forEach(function(input, index) {
    input.addEventListener("change", function() {
      updatePlayerCombatAttackField(playerID, attackIndex, fields[index], input.value)
    })
  })
  const controls = block.querySelectorAll(".gmAttackControls button")
  controls[0].onclick = function() { return movePlayerCombatAttack(playerID, attackIndex, -1) }
  controls[1].onclick = function() { return movePlayerCombatAttack(playerID, attackIndex, 1) }
  controls[2].onclick = function() { return deletePlayerCombatAttack(playerID, attackIndex) }
  return block
}

function cloneMobCombatAttack(attack) {
  return {
    name: String(attack && attack.name || "Attaque"),
    icon: String(attack && attack.icon || "⚔"),
    dmgMin: Math.max(0, parseInt(attack && attack.dmgMin, 10) || 0),
    dmgMax: Math.max(0, parseInt(attack && attack.dmgMax, 10) || 0),
    effect: String(attack && attack.effect || ""),
    desc: String(attack && attack.desc || "")
  }
}

function cloneMobSpecialAttack(attack) {
  return {
    name: String(attack && attack.name || "Attaque speciale"),
    icon: String(attack && attack.icon || "✨"),
    dmgMin: Math.max(0, parseInt(attack && attack.dmgMin, 10) || 0),
    dmgMax: Math.max(0, parseInt(attack && attack.dmgMax, 10) || 0),
    effect: String(attack && attack.effect || ""),
    animation: String(attack && attack.animation || ""),
    flavor: String(attack && attack.flavor || ""),
    special: true
  }
}

function getSandboxCombatMobDefinition(mobId) {
  try {
    const safeId = String(mobId || "").trim()
    if (!safeId || typeof getSimpleSandboxMobs !== "function") return null
    return getSimpleSandboxMobs().find(function(item) {
      return String(item && item.id || "").trim() === safeId
    }) || null
  } catch (_) {}
  return null
}

function getMobCombatAttacks(mobId, mobTier) {
  const mobDefinition = getSandboxCombatMobDefinition(mobId)
  if (mobDefinition && Array.isArray(mobDefinition.attacks) && mobDefinition.attacks.length) {
    return mobDefinition.attacks.map(cloneMobCombatAttack)
  }
  const legacy = typeof getMobAttacksForMob === "function"
    ? getMobAttacksForMob(mobId, mobTier)
    : ((mobAttacks && mobAttacks[mobTier]) || (mobAttacks && mobAttacks.weak) || [])
  return legacy.map(cloneMobCombatAttack)
}

function getMobCombatSpecialAttack(mobId, mobTier) {
  const mobDefinition = getSandboxCombatMobDefinition(mobId)
  if (mobDefinition && mobDefinition.specialAttack) return cloneMobSpecialAttack(mobDefinition.specialAttack)
  return typeof getMobSpecialAttack === "function" ? cloneMobSpecialAttack(getMobSpecialAttack(mobId, mobTier)) : null
}

function saveMobCombatAttackSet(mobId, nextAttacks, nextSpecialAttack) {
  try {
    if (typeof getSimpleSandboxMobs !== "function" || typeof saveSimpleSandboxMobs !== "function") return false
    const items = getSimpleSandboxMobs()
    const targetIndex = items.findIndex(function(item) {
      return String(item && item.id || "").trim() === String(mobId || "").trim()
    })
    if (targetIndex >= 0 && !(items[targetIndex] && items[targetIndex].__syntheticSource === "pnj")) {
      items[targetIndex].attacks = (Array.isArray(nextAttacks) ? nextAttacks : []).map(cloneMobCombatAttack)
      items[targetIndex].specialAttack = nextSpecialAttack ? cloneMobSpecialAttack(nextSpecialAttack) : null
      return saveSimpleSandboxMobs(items)
    }
    if (typeof getSimpleSandboxPnjs !== "function" || typeof saveSimpleSandboxPnjs !== "function") return false
    const pnjs = getSimpleSandboxPnjs()
    const pnjIndex = pnjs.findIndex(function(item) {
      return ("pnjmob_" + String(item && item.id || "").trim()) === String(mobId || "").trim()
    })
    if (pnjIndex < 0) return false
    pnjs[pnjIndex].combatAsMob = true
    pnjs[pnjIndex].attacks = (Array.isArray(nextAttacks) ? nextAttacks : []).map(cloneMobCombatAttack)
    pnjs[pnjIndex].specialAttack = nextSpecialAttack ? cloneMobSpecialAttack(nextSpecialAttack) : null
    return saveSimpleSandboxPnjs(pnjs)
  } catch (_) {}
  return false
}

function addMobCombatAttack(mobId) {
  const attacks = getMobCombatAttacks(mobId, "weak")
  attacks.push(cloneMobCombatAttack(null))
  return saveMobCombatAttackSet(mobId, attacks, getMobCombatSpecialAttack(mobId, "weak"))
}

function moveMobCombatAttack(mobId, attackIndex, direction) {
  const attacks = getMobCombatAttacks(mobId, "weak")
  const sourceIndex = Number(attackIndex)
  const destIndex = sourceIndex + Number(direction || 0)
  if (sourceIndex < 0 || sourceIndex >= attacks.length || destIndex < 0 || destIndex >= attacks.length) return false
  const moved = attacks.splice(sourceIndex, 1)[0]
  attacks.splice(destIndex, 0, moved)
  return saveMobCombatAttackSet(mobId, attacks, getMobCombatSpecialAttack(mobId, "weak"))
}

function deleteMobCombatAttack(mobId, attackIndex) {
  const attacks = getMobCombatAttacks(mobId, "weak")
  const sourceIndex = Number(attackIndex)
  if (sourceIndex < 0 || sourceIndex >= attacks.length) return false
  attacks.splice(sourceIndex, 1)
  return saveMobCombatAttackSet(mobId, attacks, getMobCombatSpecialAttack(mobId, "weak"))
}

function updateMobCombatAttackField(mobId, attackIndex, field, value) {
  const attacks = getMobCombatAttacks(mobId, "weak")
  const target = attacks[Number(attackIndex)]
  if (!target) return false
  if (field === "dmgMin" || field === "dmgMax") target[field] = Math.max(0, parseInt(value, 10) || 0)
  else target[field] = String(value || "").trim()
  return saveMobCombatAttackSet(mobId, attacks, getMobCombatSpecialAttack(mobId, "weak"))
}

function updateMobCombatSpecialField(mobId, field, value) {
  const attacks = getMobCombatAttacks(mobId, "weak")
  const special = getMobCombatSpecialAttack(mobId, "weak") || cloneMobSpecialAttack(null)
  if (field === "dmgMin" || field === "dmgMax") special[field] = Math.max(0, parseInt(value, 10) || 0)
  else special[field] = String(value || "").trim()
  return saveMobCombatAttackSet(mobId, attacks, special)
}

function buildGMEditableMobAttackBlock(mobId, attack, attackIndex) {
  const block = document.createElement("div")
  block.className = "combatBlock gmEditableAttackBlock"
  block.innerHTML =
    `<label class="gmAttackField"><span>Nom</span><input type="text" value="${String(attack.name || "").replace(/"/g, "&quot;")}"></label>` +
    `<div class="gmAttackRow">` +
      `<label class="gmAttackField"><span>Icone</span><input type="text" value="${String(attack.icon || "").replace(/"/g, "&quot;")}"></label>` +
      `<label class="gmAttackField gmAttackDiceField"><span>Min</span><input type="number" min="0" max="999" value="${Math.max(0, parseInt(attack.dmgMin, 10) || 0)}"></label>` +
      `<label class="gmAttackField gmAttackDiceField"><span>Max</span><input type="number" min="0" max="999" value="${Math.max(0, parseInt(attack.dmgMax, 10) || 0)}"></label>` +
    `</div>` +
    `<label class="gmAttackField"><span>Effet</span><input type="text" value="${String(attack.effect || "").replace(/"/g, "&quot;")}"></label>` +
    `<label class="gmAttackField"><span>Description</span><textarea rows="2">${String(attack.desc || "")}</textarea></label>` +
    `<div class="gmAttackControls">` +
      `<button type="button">Monter</button>` +
      `<button type="button">Descendre</button>` +
      `<button type="button" class="danger">Supprimer</button>` +
    `</div>`
  const fields = ["name", "icon", "dmgMin", "dmgMax", "effect", "desc"]
  block.querySelectorAll("input, textarea").forEach(function(input, index) {
    input.addEventListener("change", function() {
      updateMobCombatAttackField(mobId, attackIndex, fields[index], input.value)
      renderAllMobPanels()
    })
  })
  const controls = block.querySelectorAll(".gmAttackControls button")
  controls[0].onclick = function() { const result = moveMobCombatAttack(mobId, attackIndex, -1); renderAllMobPanels(); return result }
  controls[1].onclick = function() { const result = moveMobCombatAttack(mobId, attackIndex, 1); renderAllMobPanels(); return result }
  controls[2].onclick = function() { const result = deleteMobCombatAttack(mobId, attackIndex); renderAllMobPanels(); return result }
  return block
}

function buildGMEditableMobSpecialBlock(mobId, attack) {
  const special = attack || cloneMobSpecialAttack(null)
  const block = document.createElement("div")
  block.className = "combatBlock gmEditableAttackBlock gmEditableSpecialAttackBlock"
  block.innerHTML =
    `<div class="gmMiniTitle">Attaque speciale</div>` +
    `<label class="gmAttackField"><span>Nom</span><input type="text" value="${String(special.name || "").replace(/"/g, "&quot;")}"></label>` +
    `<div class="gmAttackRow">` +
      `<label class="gmAttackField"><span>Icone</span><input type="text" value="${String(special.icon || "").replace(/"/g, "&quot;")}"></label>` +
      `<label class="gmAttackField gmAttackDiceField"><span>Min</span><input type="number" min="0" max="999" value="${Math.max(0, parseInt(special.dmgMin, 10) || 0)}"></label>` +
      `<label class="gmAttackField gmAttackDiceField"><span>Max</span><input type="number" min="0" max="999" value="${Math.max(0, parseInt(special.dmgMax, 10) || 0)}"></label>` +
    `</div>` +
    `<label class="gmAttackField"><span>Effet</span><input type="text" value="${String(special.effect || "").replace(/"/g, "&quot;")}"></label>` +
    `<label class="gmAttackField"><span>Animation</span><input type="text" value="${String(special.animation || "").replace(/"/g, "&quot;")}"></label>` +
    `<label class="gmAttackField"><span>Texte</span><textarea rows="2">${String(special.flavor || "")}</textarea></label>`
  const fields = ["name", "icon", "dmgMin", "dmgMax", "effect", "animation", "flavor"]
  block.querySelectorAll("input, textarea").forEach(function(input, index) {
    input.addEventListener("change", function() {
      updateMobCombatSpecialField(mobId, fields[index], input.value)
      renderAllMobPanels()
    })
  })
  return block
}

function cleanupGMPlayerSheetListener(playerID) {
  if (!window.__gmMiniRefs || !window.__gmMiniRefs[playerID]) return
  const binding = window.__gmMiniRefs[playerID]
  binding.ref.off("value", binding.cb)
  delete window.__gmMiniRefs[playerID]
}

function showCombatHUD() {
  if (!myToken) return
  const player = myToken.id
  const playerAttacks = getPlayerCombatAttacks(player)
  document.getElementById("combatHUDPortrait").src = getCombatPlayerPortraitPath(player)
  document.getElementById("combatHUDName").innerText = typeof getPlayerDisplayName === "function" ? getPlayerDisplayName(player) : player.toUpperCase()
  const box = document.getElementById("combatHUDAttacks"); box.innerHTML = ""
  if (playerAttacks) playerAttacks.forEach(a => {
    const block = document.createElement("div"); block.className = "combatBlock"
    populateAttackBlock(block, a)
    box.appendChild(block)
  })
  document.getElementById("combatHUD").style.display = "none"
  const btn = document.getElementById("playerAttackBtn"); if (btn && myToken) btn.style.display = "flex"
}

function togglePlayerAttacks() {
  const hud = document.getElementById("combatHUD"); if (!hud) return
  if (hud.style.display === "none" || !hud.style.display) { hud.style.display = "flex"; hud.style.alignItems = "flex-start" }
  else hud.style.display = "none"
}

function showGMCombatPanel() {
  if (!isGM) return
  if (window.__gmMiniRefs) Object.keys(window.__gmMiniRefs).forEach(cleanupGMPlayerSheetListener)
  const panel = document.getElementById("gmCombatPanel"); panel.innerHTML = ""
  panel.dataset.activePlayer = ""
  const buttonRow = document.createElement("div")
  buttonRow.className = "gmCombatPlayerRow"
  const detailHost = document.createElement("div")
  detailHost.id = "gmCombatDetailHost"
  getVisibleCombatPlayerIds().forEach(function(playerId) {
    const p = { id: playerId, name: typeof getPlayerDisplayName === "function" ? getPlayerDisplayName(playerId) : playerId }
    const btn = document.createElement("button"); btn.className = "gmAttackButton"; btn.innerText = p.name
    btn.dataset.playerId = p.id
    btn.onclick = function() { return openGMPlayerSheet(p.id) }
    buttonRow.appendChild(btn)
  })
  panel.appendChild(buttonRow)
  panel.appendChild(detailHost)
  panel.style.display = "flex"
}

function openGMPlayerSheet(playerID) {
  const panel = document.getElementById("gmCombatPanel")
  if (!panel) return false
  const host = document.getElementById("gmCombatDetailHost") || panel
  const currentActive = String(panel.dataset.activePlayer || "").trim().toLowerCase()
  const wantedPlayer = String(playerID || "").trim().toLowerCase()
  host.innerHTML = ""
  panel.querySelectorAll(".gmAttackButton").forEach(function(button) {
    const active = String(button.dataset.playerId || "").trim().toLowerCase() === wantedPlayer && currentActive !== wantedPlayer
    button.classList.toggle("is-active", active)
    button.setAttribute("aria-pressed", active ? "true" : "false")
  })
  if (currentActive === wantedPlayer) {
    cleanupGMPlayerSheetListener(playerID)
    panel.dataset.activePlayer = ""
    return false
  }
  panel.dataset.activePlayer = playerID
  const box = document.createElement("div"); box.className = "gmMiniSheet"; box.id = "gmMini_" + playerID
  const title = document.createElement("div"); title.className = "gmMiniTitle"
  const titleImg = document.createElement("img")
  titleImg.className = "gmMiniToken"
  titleImg.src = getCombatPlayerPortraitPath(playerID)
  title.appendChild(titleImg)
  title.appendChild(document.createTextNode(getPlayerDisplayName(playerID)))
  box.appendChild(title)
  const hpc = document.createElement("div"); hpc.className = "gmMiniHPContainer"
  const hpb = document.createElement("div"); hpb.className = "gmMiniHPBar"; hpb.id = "gmHPBar_"+playerID; hpc.appendChild(hpb); box.appendChild(hpc)
  const stats = document.createElement("div"); stats.className = "gmMiniStats"; stats.id = "gmStats_"+playerID; box.appendChild(stats)
  const pa = getPlayerCombatAttacks(playerID)
  const isSandboxStudio = !!(document.body && document.body.classList.contains("sandbox-studio-mode"))
  if (isSandboxStudio) {
    const addBtn = document.createElement("button")
    addBtn.type = "button"
    addBtn.className = "gmAttackAddButton"
    addBtn.innerText = "+ Ajouter une attaque"
    addBtn.onclick = function() { return addPlayerCombatAttack(playerID) }
    box.appendChild(addBtn)
  }
  if (pa) pa.forEach(function(a, attackIndex) {
    if (isSandboxStudio) box.appendChild(buildGMEditableAttackBlock(playerID, a, attackIndex))
    else {
      const block = document.createElement("div"); block.className = "combatBlock"
      populateAttackBlock(block, a)
      box.appendChild(block)
    }
  })
  host.appendChild(box)
  if (!isSandboxStudio) makeDraggable(box)
  const ref = db.ref("characters/" + playerID)
  const cb = snap => {
    const d = snap.val(); if (!d) return
    const hp = d.hp||0, curse = d.curse||0, corruption = d.corruption||0
    let ci = ""; for (let i=0;i<curse;i++) ci+="â˜ "
    const sb = document.getElementById("gmStats_"+playerID)
    if (sb) {
      sb.replaceChildren()
      const lvlEl = document.createElement("div")
      lvlEl.className = "gmMiniLvl"
      lvlEl.innerText = "â­ " + (d.lvl || 1)
      const hpEl = document.createElement("div")
      hpEl.className = "gmMiniHP"
      hpEl.innerText = "â¤ï¸ " + hp
      const curseEl = document.createElement("div")
      curseEl.className = "gmMiniCurse"
      curseEl.innerText = ci
      const powerEl = document.createElement("div")
      powerEl.className = "gmMiniPower"
      powerEl.innerText = corruption >= 10 ? "âœ¨" : ""
      sb.appendChild(lvlEl)
      sb.appendChild(hpEl)
      sb.appendChild(curseEl)
      sb.appendChild(powerEl)
    }
    const hpBar = document.getElementById("gmHPBar_"+playerID)
    if (hpBar) { const pct=Math.max(0,Math.min(100,hp)); hpBar.style.width=pct+"%"; hpBar.style.background=pct>60?"linear-gradient(90deg,#3cff6b,#0b8a3a)":pct>30?"linear-gradient(90deg,#ffb347,#ff7b00)":"linear-gradient(90deg,#ff4040,#8b0000)" }
  }
  if (!window.__gmMiniRefs) window.__gmMiniRefs = {}
  cleanupGMPlayerSheetListener(playerID)
  window.__gmMiniRefs[playerID] = { ref, cb }
  ref.on("value", cb)
}

/* ========================= */
/* MULTI-MOBS                */
/* ========================= */

// Ciblage intelligent selon le type d'attaque
function _smartTarget(attack) {
  const players = ["greg","ju","elo","bibi"]
  const alivePlayers = players.filter(p => {
    const tok = document.getElementById(p)
    return tok && !tok.classList.contains("playerDead")
  })
  if (!alivePlayers.length) return players[0]

  const effect = attack.effect || ""
  const name   = (attack.name || "").toLowerCase()

  // Attaque de zone â€” tous les joueurs
  if (effect === "all") return "all"

  // Attaque corps Ã  corps â€” joueur le plus proche du token mob
  if (effect === "melee" || name.includes("coup") || name.includes("frappe") || name.includes("morsure") || name.includes("griffe")) {
    const mobTok = document.getElementById("mobToken")
    if (mobTok) {
      const mobX = parseInt(mobTok.style.left)||600, mobY = parseInt(mobTok.style.top)||200
      let closest = alivePlayers[0], minDist = Infinity
      alivePlayers.forEach(pid => {
        const tok = document.getElementById(pid); if (!tok) return
        const dx = (parseInt(tok.style.left)||0) - mobX
        const dy = (parseInt(tok.style.top)||0)  - mobY
        const dist = Math.sqrt(dx*dx + dy*dy)
        if (dist < minDist) { minDist = dist; closest = pid }
      })
      return closest
    }
  }

  // Attaque de malÃ©diction â€” joueur avec le moins de malÃ©dictions actives
  if (effect === "curse") {
    // Cibler celui qui a le moins de malÃ©dictions (pire cible = celle qu'on veut affaiblir)
    return alivePlayers[Math.floor(Math.random() * alivePlayers.length)]
  }

  // Attaque Ã  distance / magie â€” joueur avec le plus de HP (menace principale)
  if (effect === "ranged" || effect === "magic" || name.includes("flÃ¨che") || name.includes("magie") || name.includes("sort")) {
    // Lecture des HP depuis les tokens stats si dispo, sinon alÃ©atoire
    const hpEls = alivePlayers.map(pid => {
      const el = document.querySelector("#stats_" + pid + " .hpText, #stats_" + pid + " .lowHPText")
      const txt = el ? el.innerText : ""
      const m = txt.match(/(\d+)\//)
      return { pid, hp: m ? parseInt(m[1]) : 50 }
    })
    hpEls.sort((a,b) => b.hp - a.hp)
    // 60% chance de cibler le plus fort, 40% alÃ©atoire
    return Math.random() < 0.6 ? hpEls[0].pid : alivePlayers[Math.floor(Math.random()*alivePlayers.length)]
  }

  // Par dÃ©faut â€” alÃ©atoire avec lÃ©gÃ¨re prÃ©fÃ©rence pour les HP bas
  return alivePlayers[Math.floor(Math.random() * alivePlayers.length)]
}

function renderAllMobPanels() {
  const ex=document.getElementById("mobAttackPanel"); if(ex) ex.remove()
  const exT=document.getElementById("mobAttackToggle"); if(exT) exT.remove()
  const active = MOB_SLOTS.filter(s => activeMobSlots[s]); if (!active.length || !combatActive) return

  const container = document.createElement("div"); container.id = "mobAttackPanel"
  container.style.cssText = "position:fixed;top:50%;right:20px;transform:translateY(-50%);width:min(360px,28vw);display:flex;flex-direction:column;gap:10px;z-index:9999999;max-height:72vh;overflow-y:auto;padding:10px;border-radius:18px;background:linear-gradient(180deg,rgba(22,6,6,0.94),rgba(10,0,0,0.96));border:1px solid rgba(180,40,40,0.35);box-shadow:0 20px 60px rgba(0,0,0,0.4);"
  active.forEach(slot => { db.ref("combat/"+slot).once("value", snap => { const md=snap.val(); if(md) container.appendChild(buildMobSubPanel(md,slot)) }) })
  document.body.appendChild(container)
}

function buildMobSubPanel(mobData, slot) {
  const panel = document.createElement("div"); panel.style.cssText = "background:rgba(10,0,0,0.78);border:1px solid rgba(180,40,40,0.5);border-radius:14px;padding:12px;"
  const header = document.createElement("div"); header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"
  const tEl = document.createElement("div"); tEl.style.cssText = "font-family:Cinzel,serif;font-size:12px;color:#ff8888;font-weight:bold;"; tEl.innerText = "⚔ " + (mobData.name||"MOB").toUpperCase() + "  Niv " + (mobData.lvl||1); header.appendChild(tEl)

  if (isGM) {
    const xBtn = document.createElement("button"); xBtn.style.cssText = "padding:2px 8px;font-size:11px;background:rgba(120,0,0,0.5);color:#ff8888;border:1px solid rgba(180,0,0,0.4);border-radius:3px;cursor:pointer;"; xBtn.innerText = "✕"; xBtn.onclick=()=>removeMobSlot(slot); header.appendChild(xBtn)
  }
  panel.appendChild(header)

  const pct = Math.max(0,Math.min(100,((mobData.hp||0)/(mobData.maxHP||1))*100))
  const hpWrap = document.createElement("div"); hpWrap.style.cssText = "width:100%;height:6px;background:rgba(80,0,0,0.5);border-radius:3px;margin-bottom:8px;"
  const hpFill = document.createElement("div"); hpFill.style.cssText = `width:${pct}%;height:100%;background:${pct>50?"#44ff44":pct>25?"#ffaa00":"#ff3333"};border-radius:3px;transition:width 0.3s;`; hpWrap.appendChild(hpFill); panel.appendChild(hpWrap)

  const tier = mobData.tier||"weak", atks = getMobCombatAttacks(mobData.name, tier), mobLvl = mobData.lvl||1
  const getRange = (attack, lvl, mobTier) => {
    if (typeof getMobDamageRange === "function") return getMobDamageRange(attack, lvl, mobTier)
    const factor = 1 + Math.max(0, (lvl || 1) - 1) * 0.15
    return {
      min: Math.round((attack?.dmgMin || 0) * factor),
      max: Math.round((attack?.dmgMax || 0) * factor)
    }
  }
  const specialAtk = getMobCombatSpecialAttack(mobData.name, tier)
  const specialUsed = !!mobData.specialUsed
  const isSandboxStudio = !!(document.body && document.body.classList.contains("sandbox-studio-mode"))
  const mobDefinition = getSandboxCombatMobDefinition(mobData.name)

  if (isSandboxStudio && isGM && mobDefinition) {
    const addBtn = document.createElement("button")
    addBtn.type = "button"
    addBtn.className = "gmAttackAddButton"
    addBtn.innerText = "+ Ajouter une attaque de mob"
    addBtn.onclick = function() { addMobCombatAttack(mobData.name); renderAllMobPanels(); return false }
    panel.appendChild(addBtn)
    atks.forEach(function(atk, attackIndex) {
      panel.appendChild(buildGMEditableMobAttackBlock(mobData.name, atk, attackIndex))
    })
    panel.appendChild(buildGMEditableMobSpecialBlock(mobData.name, specialAtk))
    return panel
  }

  if (isGM) {
    const rBtn = document.createElement("button"); rBtn.style.cssText = "width:100%;padding:5px;margin-bottom:5px;font-family:Cinzel,serif;font-size:10px;background:rgba(80,30,120,0.5);color:#cc88ff;border:1px solid rgba(120,50,200,0.5);border-radius:4px;cursor:pointer;"
    rBtn.innerText = "🎲 Aleatoire (ciblage auto)"
    rBtn.onclick = () => {
      const av = atks.filter(a=>a.name!==panel._lastAttack)
      const atk = (av.length?av:atks)[Math.floor(Math.random()*(av.length||atks.length))]
      const target = _smartTarget(atk)
      panel._currentTarget = target === "all" ? null : target
      launchMobAttackFromSlot(atk, mobData, panel, target)
    }
    panel.appendChild(rBtn)

    atks.forEach(atk => {
      const isCD = panel._lastAttack===atk.name
      const btn = document.createElement("div")
      const range = getRange(atk, mobLvl, tier)
      const min = range.min, max = range.max
      btn.style.cssText = `padding:6px 8px;margin-bottom:4px;background:rgba(120,10,10,${isCD?"0.2":"0.4"});border:1px solid rgba(180,40,40,${isCD?"0.2":"0.4"});border-radius:4px;cursor:${isCD?"not-allowed":"pointer"};opacity:${isCD?"0.5":"1"};`
      btn.innerHTML = `<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:14px;">${atk.icon}</span><span style="font-family:Cinzel,serif;font-size:10px;color:${isCD?"#666":"#ffcccc"};font-weight:bold;">${atk.name}${isCD?" ⏱":""}</span><span style="font-size:9px;color:#ff8888;margin-left:auto;">${min}-${max}</span></div>`
      if (!isCD) {
        btn.onmouseenter=()=>btn.style.background="rgba(180,20,20,0.6)"
        btn.onmouseleave=()=>btn.style.background="rgba(120,10,10,0.4)"
        btn.onclick=()=>{
          const target = _smartTarget(atk)
          panel._currentTarget = target === "all" ? null : target
          launchMobAttackFromSlot(atk, mobData, panel, target)
        }
      }
      panel.appendChild(btn)
    })

    if (specialAtk) {
      const specialRange = getRange(specialAtk, mobLvl, tier)
      const sMin = specialRange.min, sMax = specialRange.max
      const sBtn = document.createElement("div")
      sBtn.style.cssText = `padding:8px 10px;margin:8px 0 4px;background:${specialUsed?"rgba(60,30,30,0.35)":"linear-gradient(135deg,rgba(120,20,20,0.88),rgba(40,0,0,0.96))"};border:1px solid ${specialUsed?"rgba(140,80,80,0.3)":"rgba(255,180,110,0.55)"};border-radius:6px;cursor:${specialUsed?"not-allowed":"pointer"};opacity:${specialUsed?"0.55":"1"};box-shadow:${specialUsed?"none":"0 0 24px rgba(255,120,60,0.18)"};`
      sBtn.innerHTML = `<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:16px;">${specialAtk.icon}</span><span style="font-family:Cinzel,serif;font-size:10px;color:${specialUsed?"#aa8888":"#ffd6a0"};font-weight:bold;letter-spacing:0.5px;">${specialAtk.name}${specialUsed?" — UNIQUE DEJA UTILISEE":""}</span><span style="font-size:9px;color:${specialUsed?"#9a6a6a":"#ffb37a"};margin-left:auto;">${sMin}-${sMax}</span></div><div style="font-size:9px;color:${specialUsed?"#8a6a6a":"#ffb988"};margin-top:4px;line-height:1.35;">${specialAtk.flavor || "Attaque signature a usage unique."}</div>`
      if (!specialUsed) {
        sBtn.onmouseenter=()=>sBtn.style.filter="brightness(1.08)"
        sBtn.onmouseleave=()=>sBtn.style.filter=""
        sBtn.onclick=()=>{
          const target = specialAtk.effect === "all" ? "all" : (_smartTarget(specialAtk) || panel._currentTarget)
          panel._currentTarget = target === "all" ? null : target
          launchMobAttackFromSlot(specialAtk, mobData, panel, target, slot)
        }
      }
      panel.appendChild(sBtn)
    }

    // SÃ©lection manuelle de cible (override)
    const targetRow = document.createElement("div"); targetRow.style.cssText = "display:flex;gap:3px;margin-top:6px;flex-wrap:wrap;border-top:1px solid rgba(180,40,40,0.2);padding-top:6px;"
    const label = document.createElement("div"); label.style.cssText = "width:100%;font-family:Cinzel,serif;font-size:9px;color:#5a3a3a;margin-bottom:3px;"; label.innerText = "Forcer la cible :"
    targetRow.appendChild(label)
    getVisibleCombatPlayerIds().forEach(pid => {
      const btn = document.createElement("button"); btn.dataset.target=pid; btn.style.cssText = "padding:2px 6px;font-family:Cinzel,serif;font-size:9px;border-radius:2px;cursor:pointer;border:1px solid rgba(180,40,40,0.4);background:rgba(60,10,10,0.6);color:#ffaaaa;"; btn.innerText = typeof getPlayerDisplayName === "function" ? getPlayerDisplayName(pid) : pid.toUpperCase()
      btn.onclick=()=>{ targetRow.querySelectorAll("button[data-target]").forEach(b=>{ b.style.background=b.dataset.target===pid?"rgba(180,40,40,0.6)":"rgba(60,10,10,0.6)" }); panel._currentTarget=pid }
      targetRow.appendChild(btn)
    })
    panel.appendChild(targetRow)
  } else {
    // Vue lecture seule pour les joueurs
    atks.forEach(atk => {
      const range = getRange(atk, mobLvl, tier)
      const min = range.min, max = range.max
      const row = document.createElement("div"); row.style.cssText = "padding:5px 8px;margin-bottom:3px;background:rgba(60,5,5,0.5);border:1px solid rgba(120,20,20,0.3);border-radius:3px;opacity:0.85;"
      row.innerHTML = `<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:13px;">${atk.icon}</span><span style="font-family:Cinzel,serif;font-size:10px;color:#ffaaaa;">${atk.name}</span><span style="font-size:9px;color:#884444;margin-left:auto;">${min}-${max}</span></div>`
      panel.appendChild(row)
    })
    if (specialAtk) {
      const specialRange = getRange(specialAtk, mobLvl, tier)
      const sMin = specialRange.min, sMax = specialRange.max
      const sRow = document.createElement("div")
      sRow.style.cssText = `padding:6px 8px;margin-top:6px;background:${specialUsed?"rgba(55,35,35,0.45)":"rgba(96,28,12,0.5)"};border:1px solid ${specialUsed?"rgba(140,80,80,0.28)":"rgba(255,180,110,0.32)"};border-radius:4px;opacity:0.92;`
      sRow.innerHTML = `<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:13px;">${specialAtk.icon}</span><span style="font-family:Cinzel,serif;font-size:10px;color:${specialUsed?"#b48b8b":"#ffd3a0"};">${specialAtk.name}</span><span style="font-size:9px;color:${specialUsed?"#8e6767":"#c9855f"};margin-left:auto;">${specialUsed ? "UNIQUE âœ“" : (sMin + "-" + sMax)}</span></div>`
      panel.appendChild(sRow)
    }
  }

  return panel
}

function applyMobDamageToPlayer(pid, dmg, attack, mobData, slot) {
  db.ref("characters/" + pid + "/hp").once("value", s => {
    db.ref("characters/" + pid + "/hp").set(Math.max(0, (s.val() || 0) - dmg))
    if (attack.effect === "curse") {
      db.ref("characters/" + pid + "/curse").once("value", cs => {
        db.ref("characters/" + pid + "/curse").set(Math.min(8, (cs.val() || 0) + 1))
      })
    }
    if (attack.special && attack.healSelfRatio && slot) {
      const heal = Math.max(1, Math.round(dmg * attack.healSelfRatio))
      db.ref("combat/" + slot).once("value", mobSnap => {
        const mob = mobSnap.val()
        if (!mob) return
        db.ref("combat/" + slot + "/hp").set(Math.min(mob.maxHP || mob.hp || 0, (mob.hp || 0) + heal))
      })
    }
  })
}

function launchMobAttackFromSlot(attack, mobData, panel, forcedTarget, slot) {
  const target = forcedTarget || panel._currentTarget
  if (!target && attack.effect !== "all") { showNotification("Choisissez une cible !"); return }
  if (attack.special && mobData.specialUsed) { showNotification("Attaque speciale deja utilisee"); return }
  panel._lastAttack = attack.name
  animateMobDice(() => {
    const dmg = getMobDamage(attack, mobData.lvl||1, mobData.tier||"weak")
    const mobLabel = (mobData.name || "MOB").toUpperCase()
    const targetLabel = (attack.effect === "all" || target === "all") ? "TOUS" : String(target || "").toUpperCase()
    const specialTag = attack.special ? " ✦ SPECIALE" : ""
    if (attack.special && slot) db.ref("combat/" + slot + "/specialUsed").set(true)
    if (attack.effect === "all" || target === "all") {
      getVisibleCombatPlayerIds().forEach(pid => applyMobDamageToPlayer(pid, dmg, attack, mobData, slot))
      db.ref("game/mobAttackEvent").set({ attackName:attack.name, icon:attack.icon, dmg, target:"TOUS", mobName:(mobData.name||"MOB").toUpperCase(), time:Date.now(), special:!!attack.special, animation:attack.animation || "", flavor:attack.flavor || "" })
      addMJLog(`${attack.icon} ${mobLabel} -> ${attack.name}${specialTag} -> TOUS : ${dmg} degats`)
    } else {
      applyMobDamageToPlayer(target, dmg, attack, mobData, slot)
      db.ref("game/mobAttackEvent").set({ attackName:attack.name, icon:attack.icon, dmg, target:target.toUpperCase(), mobName:(mobData.name||"MOB").toUpperCase(), time:Date.now(), special:!!attack.special, animation:attack.animation || "", flavor:attack.flavor || "" })
      addMJLog(`${attack.icon} ${mobLabel} -> ${attack.name}${specialTag} -> ${targetLabel} : ${dmg} degats`)
      showNotification(attack.name + " -> " + target.toUpperCase() + " -> " + dmg + " degats !"); screenShake()
    }
    setTimeout(() => renderAllMobPanels(), 200)
  })
}

function animateMobDice(cb) {
  const d20=document.getElementById("mobD20"); if(!d20){ cb(); return }
  let spins=0; const iv=setInterval(()=>{ d20.style.transform=`rotate(${Math.random()*360}deg) scale(1.3)`; if(++spins>8){ clearInterval(iv); d20.style.transform=""; cb() } },120)
}

function addMobToFight(mobId, forceTier) {
  if (!isGM) return
  const freeSlot=MOB_SLOTS.find(s=>!activeMobSlots[s]); if(!freeSlot){ showNotification("âš  Maximum 3 mobs !"); return }
  const tier=forceTier||(mobStats[mobId]?mobStats[mobId].tier:"weak")
  getPartyLevel(level => {
    const base=mobStats[mobId]?mobStats[mobId].baseHP:10
    const tMults={weak:1.0,medium:1.6,high:2.8,boss:5.0},tScales={weak:0.12,medium:0.18,high:0.25,boss:0.35},tLvl={weak:-1,medium:1,high:3,boss:8}
    const effLvl=(tier==="boss"&&level>10)?10+(level-10)*0.65:level
    const hp=Math.round(base*(tMults[tier]||1.0)*Math.pow(1+effLvl*(tScales[tier]||0.12),1.6))
    const lvl=Math.max(1,level+(tLvl[tier]||0))
    const lifeProfile = typeof buildBossLifeProfile === "function"
      ? buildBossLifeProfile(lvl, hp, tier, null)
      : { totalLives: 1, livesRemaining: 1, phaseHP: hp, encounterHP: hp }
    const idx=freeSlot==="mob2"?1:2, startX=Math.round((window.innerWidth-4*110)/2)
    db.ref("combat/"+freeSlot).set({ name:mobId, hp:lifeProfile.phaseHP, maxHP:lifeProfile.phaseHP, phaseHP:lifeProfile.phaseHP, lvl, tier, slot:freeSlot, x:startX+(idx+4)*90, y:Math.round(window.innerHeight*0.25), totalLives:lifeProfile.totalLives, livesRemaining:lifeProfile.livesRemaining, encounterHP:lifeProfile.encounterHP }); activeMobSlots[freeSlot]=true
    showNotification("âš” "+mobId.toUpperCase()+" rejoint le combat !")
  })
}

function removeMobSlot(slot) {
  db.ref("combat/"+slot).remove(); activeMobSlots[slot]=false
  const tok=document.getElementById("mobToken_"+slot); if(tok) tok.remove()
  renderAllMobPanels()
}

function spawnExtraMobToken(mobData, slot) {
  const container=document.getElementById("combatTokens"); if(!container){ if(!mobData._retryCount) mobData._retryCount=0; if(++mobData._retryCount<10) setTimeout(()=>spawnExtraMobToken(mobData,slot),300); return }
  const existing=document.getElementById("mobToken_"+slot); if(existing) existing.remove()
  const tok=document.createElement("div"); tok.id="mobToken_"+slot; tok.className="token"
  const idx=slot==="mob2"?1:2, startX=Math.round((window.innerWidth-4*110)/2)
  const startLeft = Math.max(80, Number(mobData && mobData.x) || (startX+(idx+4)*90))
  const startTop = Math.max(80, Number(mobData && mobData.y) || Math.round(window.innerHeight*0.25))
  tok.style.cssText=`position:absolute;width:70px;height:70px;left:${startLeft}px;top:${startTop}px;z-index:200;display:flex;flex-direction:column;align-items:center;cursor:grab;`
  const img=document.createElement("img"); img.style.cssText="width:60px;height:60px;object-fit:contain;border-radius:50%;border:2px solid #cc2200;box-shadow:0 0 10px rgba(200,0,0,0.5);"; img.src=(typeof getCombatMobImagePath === "function" ? getCombatMobImagePath(mobData.name) : ("images/"+mobData.name+".png")); img.onerror=()=>img.style.display="none"; tok.appendChild(img)
  const label=document.createElement("div"); label.style.cssText="font-family:Cinzel,serif;font-size:9px;color:#ff8888;margin-top:2px;text-align:center;background:rgba(0,0,0,0.7);padding:1px 4px;border-radius:2px;"; label.innerText=(mobData.name||"MOB").toUpperCase()+" "+mobData.hp+"/"+mobData.maxHP; tok.appendChild(label)
  db.ref("combat/"+slot).on("value",s=>{ const d=s.val(); if(d&&label) { label.innerText=(d.name||"MOB").toUpperCase()+" "+d.hp+"/"+d.maxHP; if (Number.isFinite(Number(d.x))) tok.style.left = Number(d.x) + "px"; if (Number.isFinite(Number(d.y))) tok.style.top = Number(d.y) + "px" } })
  tok.addEventListener("mousedown",e=>{ if(!isGM) return; selected=tok; lastX=tok.offsetLeft; _state.tokenDragStart={x:e.clientX,y:e.clientY}; _state.tokenDragging=false; tok._fbSlot=slot; e.preventDefault() })
  container.appendChild(tok)
}

/* ========================= */
/* PNJ                       */
/* ========================= */

function setPNJSlot(slot) {
  currentPNJSlot=slot
  ;["slot1Btn","slot2Btn","slot3Btn"].forEach((id,i)=>{ const btn=document.getElementById(id); if(!btn) return; const a=(i+1)===slot; btn.style.background=a?"rgba(200,160,50,0.3)":"rgba(80,80,80,0.2)"; btn.style.color=a?"#c8a050":"#aaa"; btn.style.borderColor=a?"gold":"#555" })
}

function getPNJSlotRef(slot) {
  return slot === 2 ? "game/storyImage2" : slot === 3 ? "game/storyImage3" : "game/storyImage"
}

function resolvePNJTargetSlot(slots, preferredSlot, forceSlot) {
  if (forceSlot) return preferredSlot || 1
  let targetSlot = preferredSlot || 1
  if (!slots[targetSlot]) return targetSlot
  const freeSlot = [1, 2, 3].find(slot => !slots[slot])
  return freeSlot || targetSlot
}

function openPNJ(image, options) {
  const opts = options || {}
  const preferredSlot = opts.slot || currentPNJSlot || 1
  const forceSlot = !!opts.forceSlot
  const displayName = opts.name || getPNJDisplayName(image)
  document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" })

  Promise.all([
    db.ref("game/storyImage").once("value"),
    db.ref("game/storyImage2").once("value"),
    db.ref("game/storyImage3").once("value")
  ]).then(([s1, s2, s3]) => {
    const slots = {
      1: s1.val(),
      2: s2.val(),
      3: s3.val()
    }

    const targetSlot = resolvePNJTargetSlot(slots, preferredSlot, forceSlot)
    const targetRef = getPNJSlotRef(targetSlot)

    storyType = "pnj"
    if (slots[targetSlot] === image) {
      if (targetSlot === 1) showStoryImage(image)
      else {
        db.ref(targetRef).remove().then(() => db.ref(targetRef).set(image)).catch(() => {})
      }
    } else {
      db.ref(targetRef).set(image)
    }
    if (!pnjSlotOrder.includes(targetSlot)) pnjSlotOrder.push(targetSlot)

    if (displayName) {
      db.ref("game/highPNJName").set({ name: displayName, time: Date.now() })
    }
  })
}

function setPNJImage(img) {
  openPNJ(img, { slot: currentPNJSlot || 1 })
}

function updatePNJPositions() {
  const b1=document.getElementById("storyImage"), b2=document.getElementById("storyImage2"), b3=document.getElementById("storyImage3")
  const v1=b1&&b1.style.display==="flex", v2=b2&&b2.style.display==="flex", v3=b3&&b3.style.display==="flex"
  const count=[v1,v2,v3].filter(Boolean).length, nt=el=>{el.style.transition="opacity 0.5s ease"}
  if(count===1){ if(v1){nt(b1);b1.style.left="50%";b1.style.right="auto";b1.style.transform="translateX(-50%)"} if(v2){nt(b2);b2.style.left="50%";b2.style.right="auto";b2.style.transform="translateX(-50%)"} if(v3){nt(b3);b3.style.left="50%";b3.style.right="auto";b3.style.transform="translateX(-50%)"} }
  else if(count===2){ const boxes=[[v1,b1],[v2,b2],[v3,b3]].filter(([v])=>v).map(([,b])=>b); nt(boxes[0]);boxes[0].style.left="0";boxes[0].style.right="auto";boxes[0].style.transform=""; nt(boxes[1]);boxes[1].style.right="0";boxes[1].style.left="auto";boxes[1].style.transform="" }
  else if(count===3){ nt(b2);b2.style.left="0";b2.style.right="auto";b2.style.transform=""; nt(b1);b1.style.left="50%";b1.style.right="auto";b1.style.transform="translateX(-50%)"; nt(b3);b3.style.right="0";b3.style.left="auto";b3.style.transform="" }
}

function hideHighPNJScrollImmediate() {
  const scroll=document.getElementById("highPNJScroll")
  if (scroll) {
    scroll.style.opacity="0"
    setTimeout(()=>{ if(scroll.parentNode) scroll.remove() },180)
  }
}

function closePNJBySlot(slot) {
  const r={1:"game/storyImage",2:"game/storyImage2",3:"game/storyImage3"}
  db.ref(r[slot]).remove()
  pnjSlotOrder=pnjSlotOrder.filter(s=>s!==slot)
}
function closeLastPNJ() { if(!pnjSlotOrder.length) return false; closePNJBySlot(pnjSlotOrder[pnjSlotOrder.length-1]); return true }

const PNJ_NAMES = {
  "tavernier.png":         "Bjorn le Tavernier",
  "serveuse.png":          "Astrid",
  "marchand.png":          "Egil le Marchand",
  "voyantepnj.png":        "SigrÃºn la Voyante",
  "soulard.png":           "Gunnar l'Ivrogne",
  "garde.png":             "Halvard",
  "forgeron.png":          "Ulfrik le Forgeron",
  "child baldur.png":      "Leif",
  "forgeron1.png":         "Thormund",
  "garde baldur.png":      "Sigmar",
  "marchand2.png":         "Ragnhild la Marchande",
  "gardedunord.png":       "Ivar du Nord",
  "garde2.png":            "Ketill",
  "conseillerroinord.png": "Conseiller HÃ¡kon",
  "pretre.png":            "FrÃ¨re Osvald",
  "pnj1.png":              "Un passant",
  "pnj2.png":              "Une villageoise",
  "femmepnj.png":          "Solveig",
  "femmepnj1.png":         "Ingrid",
  "femmepnj2.png":         "Brynja",
  "femmepnj3.png":         "Runa",
  "oldmessager.png":       "Orm le Vieux Messager",
  "capitaine.png":         "Capitaine Tobias",
  "serveusebrume.png":     "Lana",
  "aubergistebrume.png":   "Aubergiste Etchebest",
  "soulard1.png":          "Ren le bon",
  "pirat.png":             "Capitaine Quince",
  "mysterefemme.png":      "Femme mysterieuse",
  "mysterefemme1.png":     "Glinda",
  "heimdall.png":          "Heimdall",
  "witch.png":             "Witch",
  "ELO PION.png":          "ELO PION",
  "ju pion.png":           "JU PION",
  "greg pion.png":         "GREG PION",
}

function getPNJDisplayName(image) {
  const base = String(image || "").replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "")
  if (!base) return ""
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function resolvePNJImageSrc(image) {
  const src = String(image || "")
  if (!src) return ""
  if (typeof resolveImagePath === "function") return resolveImagePath(src)
  if (/^(https?:|data:|blob:|\/|images\/)/i.test(src)) return src
  return "images/" + src
}

function showStoryImage(image) {
  const box=document.getElementById("storyImage"), img=document.getElementById("storyImageContent")
  if(!image){ box.style.display="none"; return }
  img.src=resolvePNJImageSrc(image); box.style.opacity="0"; box.style.left="50%"; box.style.transform="translateX(-50%)"; box.style.right="auto"; box.style.display="flex"
  if(!pnjSlotOrder.includes(1)) pnjSlotOrder.push(1); setTimeout(updatePNJPositions,50); setTimeout(()=>box.style.opacity="1",60)

  // Afficher le nom si dÃ©fini â€” dÃ©lai pour laisser passer le set(null) initial
  const pnjName = getPNJDisplayName(image)
  if (pnjName) {
    document.querySelectorAll("[id^='pnjNameTag']").forEach(el => el.remove())
    const tag = document.createElement("div")
    tag.id = "pnjNameTag_" + image.replace(/[^a-z0-9]/g, "")
    tag.innerText = pnjName
    tag.style.cssText = "position:fixed;bottom:12%;left:50%;transform:translateX(-50%);font-family:'Cinzel Decorative','Cinzel',serif;font-size:20px;color:#f0e8c8;letter-spacing:3px;text-shadow:0 0 8px rgba(30,160,180,0.6),1px 1px 4px black;pointer-events:none;z-index:2147483647;opacity:0;transition:opacity 0.6s ease;background:rgba(8,20,24,0.9);border:1px solid rgba(30,90,102,0.5);border-radius:3px;padding:6px 20px;white-space:nowrap;"
    document.body.appendChild(tag)
    setTimeout(() => { tag.style.opacity = "1" }, 100)
  }

  const soundKey = String(image || "").replace(/^.*[\\/]/, "")
  const pnjSounds = { "generalmelenchon.png": "generalmelenchon.mp3", "intendantbrume.png": "macron.mp3" }
  if (pnjSounds[soundKey]) {
    const sid = "pnjSound_" + soundKey.replace(/[^a-z]/gi, "")
    let snd = document.getElementById(sid)
    if (!snd) {
      snd = document.createElement("audio")
      snd.id = sid
      snd.src = "audio/" + pnjSounds[soundKey]
      snd.volume = 1.0
      document.body.appendChild(snd)
    }
    snd.currentTime = 0
    snd.play().catch(() => {})
    setTimeout(() => {
      let iv = setInterval(() => {
        if (snd.volume > 0.05) snd.volume -= 0.05
        else { snd.pause(); snd.volume = 1.0; clearInterval(iv) }
      }, 100)
    }, 2000)
  }
}

function hideStoryImage() {
  const box=document.getElementById("storyImage"); if(!box) return
  box.style.opacity="0"
  // Retirer le tag nom seulement si aucun autre PNJ n'est affichÃ©
  setTimeout(() => {
    const b2 = document.getElementById("storyImage2")
    const b3 = document.getElementById("storyImage3")
    if ((!b2 || b2.style.display === "none") && (!b3 || b3.style.display === "none")) {
      document.querySelectorAll("[id^='pnjNameTag']").forEach(tag=>{ tag.style.opacity="0"; setTimeout(()=>{ if(tag.parentNode) tag.remove() },600) })
    }
  }, 300)
  setTimeout(()=>{ box.style.display="none"; updatePNJPositions() },500); pnjSlotOrder=pnjSlotOrder.filter(s=>s!==1)
}

function showHighPNJ(image, name) {
  openPNJ(image, { slot: 1, forceSlot: true, name, scrollName: true })
}
function showHighPNJScroll(name) {
  const old=document.getElementById("highPNJScroll"); if(old) old.remove()
  const scroll=document.createElement("div"); scroll.id="highPNJScroll"; scroll.style.cssText="position:fixed;bottom:8%;left:50%;transform:translateX(-50%);pointer-events:none;z-index:99999999;"
  const el=document.createElement("div"); el.innerText=name; el.style.cssText="font-family:'Cinzel Decorative','Cinzel',serif;font-size:32px;letter-spacing:4px;font-weight:900;color:#f5e6c8;text-shadow:0 0 10px rgba(0,0,0,0.9),2px 2px 4px black;text-align:center;opacity:0;transition:opacity 0.5s ease;"; scroll.appendChild(el); document.body.appendChild(scroll)
  setTimeout(()=>el.style.opacity="1",20); setTimeout(()=>{ el.style.opacity="0"; setTimeout(()=>{ scroll.remove(); db.ref("game/highPNJName").remove() },500) },5000)
}

/* ========================= */
/* SHOP                      */
/* ========================= */

function openShop(type) {
  if(!isGM) return
  getPartyLevel(p=>{
    const shopType = type || "marche"
    const existing = document.getElementById("shopOverlay")
    if (existing) existing.remove()
    renderShop(p, shopType)
    db.ref("game/shop").set({ open:true, type:shopType, partyLvl:p, time:Date.now() })
    document.querySelectorAll(".gmSection").forEach(s=>s.style.display="none")
  })
}
function closeShop() {
  const existing = document.getElementById("shopOverlay")
  if (existing) existing.remove()
  db.ref("game/shop").remove()
}

function renderShop(partyLvl, shopType) {
  shopType=shopType||"marche"
  if (!window.__shopRenderSoundLock) window.__shopRenderSoundLock = 0
  const now = Date.now()
  if (now - window.__shopRenderSoundLock > 500) {
    window.__shopRenderSoundLock = now
    const shopSfx = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath("shop.mp3") : "audio/shop.mp3")
    setManagedAudioBaseVolume(shopSfx, 0.82, "effects")
    shopSfx.play().catch(() => {})
  }
  const activeItems=shopType==="armurerie"?shopItemsArmurerie:shopItems, shopTitle=shopType==="armurerie"?"âš” Armurerie":"ðŸ›’ MarchÃ©"
  _buildShop(partyLvl,null,activeItems,shopTitle)
}

function _buildShop(partyLvl, runeCard, activeItems, shopTitle) {
  const overlay=document.createElement("div"); overlay.id="shopOverlay"; overlay.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;z-index:9999990;opacity:0;transition:opacity 0.5s ease;"
  const box=document.createElement("div"); box.style.cssText="background:url('images/shelf.png') center/100% 100% no-repeat;width:min(900px,92vw);max-height:85vh;overflow-y:auto;padding:50px 50px 40px 50px;min-height:400px;position:relative;font-family:'IM Fell English',serif;"
  const t=document.createElement("div"); t.style.cssText="text-align:center;font-family:'Cinzel Decorative','Cinzel',serif;font-size:28px;color:#1a0a04;margin-bottom:6px;letter-spacing:3px;"; t.innerText=shopTitle; box.appendChild(t)
  if(runeCard){ const rc=document.createElement("div"); rc.style.cssText="position:relative;background:rgba(200,160,80,0.15);border:2px solid rgba(200,160,80,0.6);border-radius:6px;padding:16px;text-align:center;margin-bottom:16px;"; rc.innerHTML=`<div style="font-family:'Cinzel',serif;font-size:12px;color:#8a6830;margin-bottom:8px;">âœ¦ OBJET MYSTÃ‰RIEUX âœ¦</div><div style="font-size:28px;color:#c8a050;text-shadow:0 0 10px gold;">${runeCard.rune}</div><div style="font-family:'Cinzel',serif;font-size:14px;color:#7a3800;font-weight:bold;margin-top:8px;">ðŸ’° 50 po</div>`; if(isGM){ const x=document.createElement("div"); x.style.cssText="position:absolute;top:-8px;right:-8px;width:22px;height:22px;background:#8b2000;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;z-index:10;"; x.innerText="âœ•"; x.onclick=()=>rc.remove(); rc.appendChild(x) }; box.appendChild(rc) }
  const sub=document.createElement("div"); sub.style.cssText="text-align:center;font-family:'Cinzel',serif;font-size:13px;color:#3a1a04;margin-bottom:24px;font-weight:bold;"; sub.innerText="Niveau du groupe : "+partyLvl; box.appendChild(sub)
  const cats={}, catOrder=[]; activeItems.forEach(item=>{ if(!cats[item.category]){ cats[item.category]=[]; catOrder.push(item.category) }; cats[item.category].push(item) })
  let currentCat=0
  const navBar=document.createElement("div"); navBar.style.cssText="display:flex;justify-content:center;gap:8px;margin-bottom:20px;flex-wrap:wrap;"
  catOrder.forEach((cat,idx)=>{ const btn=document.createElement("button"); btn.style.cssText="font-family:'Cinzel',serif;font-size:11px;padding:5px 12px;background:"+(idx===0?"rgba(100,60,20,0.3)":"rgba(100,60,20,0.08)")+";color:#2b1a10;border:1px solid rgba(100,60,20,"+(idx===0?"0.6":"0.2")+");border-radius:3px;cursor:pointer;"; btn.innerText=categoryLabels[cat]; btn.onclick=()=>{ currentCat=idx; navBar.querySelectorAll("button").forEach((b,i)=>{ b.style.background=i===idx?"rgba(100,60,20,0.3)":"rgba(100,60,20,0.08)" }); showCat(idx) }; navBar.appendChild(btn) })
  box.appendChild(navBar)
  const zone=document.createElement("div"); zone.id="shopItemsZone"; box.appendChild(zone)
  const catTitleEl=document.createElement("div"); catTitleEl.id="shopCatTitle"; catTitleEl.style.cssText="font-family:'Cinzel',serif;font-size:14px;color:#4a2a0a;letter-spacing:2px;font-weight:bold;"
  function showCat(idx) { const cat=catOrder[idx],items=cats[cat]; if(catTitleEl) catTitleEl.innerText=categoryLabels[cat]; zone.innerHTML=""; const grid=document.createElement("div"); grid.style.cssText="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;"; items.forEach(item=>{ const prix=getShopPrice(item,partyLvl),stats=getShopStats(item,partyLvl); const card=document.createElement("div"); card.style.cssText="background:rgba(80,45,12,0.07);border:1px solid rgba(100,60,20,0.3);border-radius:4px;padding:12px;display:flex;flex-direction:column;gap:6px;"; const iHtml=item.img?`<img src="images/${item.img}" style="width:40px;height:40px;object-fit:contain;">`:""; card.innerHTML=`<div style="display:flex;align-items:center;gap:10px;">${iHtml}<span style="font-family:'Cinzel',serif;font-size:14px;color:#1a0e04;font-weight:bold;">${item.name}</span></div><div style="font-size:12px;color:#5a3010;font-style:italic;">${stats}</div><div style="font-family:'Cinzel',serif;font-size:14px;color:#7a3800;font-weight:bold;">ðŸ’° ${prix} po</div>`; grid.appendChild(card) }); zone.appendChild(grid) }
  const navRow=document.createElement("div"); navRow.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-top:16px;"
  const prev=document.createElement("button"); prev.innerHTML="â—€ PrÃ©cÃ©dent"; prev.style.cssText="font-family:'Cinzel',serif;font-size:12px;padding:8px 16px;background:rgba(100,60,20,0.15);color:#2b1a10;border:1px solid rgba(100,60,20,0.3);border-radius:3px;cursor:pointer;"; prev.onclick=()=>{ if(currentCat>0){ currentCat--; navBar.querySelectorAll("button")[currentCat].click() } }
  const next=document.createElement("button"); next.innerHTML="Suivant â–¶"; next.style.cssText="font-family:'Cinzel',serif;font-size:12px;padding:8px 16px;background:rgba(100,60,20,0.15);color:#2b1a10;border:1px solid rgba(100,60,20,0.3);border-radius:3px;cursor:pointer;"; next.onclick=()=>{ if(currentCat<catOrder.length-1){ currentCat++; navBar.querySelectorAll("button")[currentCat].click() } }
  navRow.appendChild(prev); navRow.appendChild(catTitleEl); navRow.appendChild(next); box.appendChild(navRow)
  if(isGM){ const cb=document.createElement("button"); cb.style.cssText="display:block;margin:20px auto 0;padding:10px 40px;font-family:'Cinzel',serif;font-size:14px;background:linear-gradient(#5a0000,#2a0000);color:#ffaaaa;border:1px solid #aa0000;border-radius:4px;cursor:pointer;"; cb.innerText="âœ• Fermer la boutique"; cb.onclick=closeShop; box.appendChild(cb) }
  overlay.appendChild(box); document.body.appendChild(overlay); showCat(0); catTitleEl.innerText=categoryLabels[catOrder[0]]; setTimeout(()=>overlay.style.opacity="1",20)
}

/* ========================= */
/* RUNE CHALLENGE            */
/* ========================= */

function encodeToRunes(text, rev) { const r=rev||[]; return text.split("").map(c=>{ if(r.includes(c.toUpperCase())) return c; return runeAlphabet[c]||(c===" "?" ":c===","?"á›«":c==="."?"á›¬":c==="'"?"'":c) }).join("") }
function openRuneChallenge() {
  if(!isGM) return
  _state.runeJustOpened=false
  const existing = window.activeRuneChallengeData
  if (existing && existing.active) {
    renderRuneChallenge(existing)
    document.querySelectorAll(".gmSection").forEach(s=>s.style.display="none")
    return
  }
  db.ref("game/runeChallenge").set({ active:true, unlockedHints:[], revealedLetters:[], time:Date.now() })
  document.querySelectorAll(".gmSection").forEach(s=>s.style.display="none")
}
function decodeRuneProgress(text, rev) {
  const revealed = rev || []
  return String(text || "").split("").map(c => {
    const up = c.toUpperCase()
    if (/[A-ZÃ€Ã‚Ã‡Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Ã†Å’]/i.test(c)) return revealed.includes(up) ? c : "Â·"
    if (c === " " || c === "," || c === "." || c === "'") return c
    return c
  }).join("")
}
function closeRuneChallenge() {
  const ov=document.getElementById("runeChallengeOverlay")
  if(ov) ov.remove()
  _state.runeJustOpened = false
}
function endRuneChallenge() {
  db.ref("game/runeChallenge").remove()
  closeRuneChallenge()
  const btn=document.getElementById("playerCodeBtn")
  if(btn) btn.remove()
}
function toggleRuneOverlay(data) { const ov=document.getElementById("runeChallengeOverlay"); if(ov) ov.remove(); else renderRuneChallenge(data) }
function updateRuneMenuBtn(active) { const l=document.getElementById("runeLaunchBtn"),c=document.getElementById("runeContinueBtn"); if(!l) return; if(active){ l.style.display="none"; if(c) c.style.display="block" } else { l.style.display="block"; if(c) c.style.display="none"; _state.runeJustOpened=false } }

function renderRuneChallenge(data) {
  const uh=data.unlockedHints||[], rev=data.revealedLetters||[], enc=encodeToRunes(secretMessage,rev), dec=decodeRuneProgress(secretMessage,rev)
  const ov=document.createElement("div"); ov.id="runeChallengeOverlay"; ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,5,2,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999990;opacity:0;transition:opacity 0.6s ease;overflow-y:auto;padding:20px 0;"
  const t=document.createElement("div"); t.style.cssText="font-family:'Cinzel Decorative','Cinzel',serif;font-size:26px;color:#c8a050;letter-spacing:6px;margin-bottom:6px;text-shadow:0 0 20px gold;"; t.innerText="áš±áš¢áš¾á›–á›Š á›žá›– á›š'áš¨áš¾áš²á›á›–áš¾"; ov.appendChild(t)
  const st=document.createElement("div"); st.style.cssText="font-family:'IM Fell English',serif;font-size:14px;color:#8a6830;margin-bottom:24px;letter-spacing:2px;"; st.innerText="DÃ©chiffrez le message des anciens..."; ov.appendChild(st)
  const mb=document.createElement("div"); mb.style.cssText="background:url('images/roc.png') center/100% 100% no-repeat;padding:50px 70px;max-width:700px;width:90vw;text-align:center;margin-bottom:24px;border-radius:4px;"
  const rt=document.createElement("div"); rt.style.cssText="font-size:32px;color:#ffe8a0;line-height:2.2;letter-spacing:6px;font-family:serif;word-break:break-word;font-weight:bold;"; rt.innerText=enc; mb.appendChild(rt); ov.appendChild(mb)
  const dbx=document.createElement("div"); dbx.style.cssText="max-width:720px;width:90vw;text-align:center;margin:-6px 0 20px;"
  const dtitle=document.createElement("div"); dtitle.style.cssText="font-family:Cinzel,serif;font-size:11px;color:#8a6830;letter-spacing:3px;margin-bottom:8px;"; dtitle.innerText="â€” TRADUCTION EN COURS â€”"
  const dline=document.createElement("div"); dline.style.cssText="font-family:'Cinzel',serif;font-size:24px;color:#f5e6c8;line-height:1.8;letter-spacing:4px;word-break:break-word;text-shadow:0 0 10px rgba(0,0,0,0.8);"
  dline.innerText=dec
  dbx.appendChild(dtitle)
  dbx.appendChild(dline)
  ov.appendChild(dbx)
  if(uh.length){ const hb=document.createElement("div"); hb.style.cssText="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:700px;margin-bottom:16px;"; uh.forEach(hid=>{ const h=runeHints.find(x=>x.id===hid); if(!h) return; const card=document.createElement("div"); card.style.cssText="background:rgba(200,160,80,0.12);border:1px solid rgba(200,160,80,0.4);border-radius:6px;padding:8px 16px;font-family:serif;font-size:16px;color:#c8a050;letter-spacing:2px;"; card.innerHTML=`<div style="font-size:10px;color:#8a6830;font-family:Cinzel;margin-bottom:4px;">${h.desc}</div>${h.runes}`; hb.appendChild(card) }); ov.appendChild(hb) }
  if(rev.length){ const rb=document.createElement("div"); rb.style.cssText="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:700px;margin-bottom:16px;"; const revT=document.createElement("div"); revT.style.cssText="width:100%;text-align:center;font-family:Cinzel;font-size:11px;color:#8a6830;letter-spacing:2px;margin-bottom:4px;"; revT.innerText="â€” LETTRES RÃ‰VÃ‰LÃ‰ES â€”"; rb.appendChild(revT); rev.forEach(l=>{ const r=runeAlphabet[l]||"?"; const p=document.createElement("div"); p.style.cssText="background:rgba(200,160,80,0.2);border:1px solid gold;border-radius:20px;padding:4px 12px;font-size:18px;color:#f5e6c8;"; p.innerHTML=`<span style="font-family:serif;">${r}</span> <span style="font-family:Cinzel;font-size:12px;color:#c8a050;">${l}</span>`; rb.appendChild(p) }); ov.appendChild(rb) }
  if(isGM){ const as=document.createElement("div"); as.style.cssText="display:flex;flex-direction:column;align-items:center;gap:10px;width:90vw;max-width:600px;"; const ai=document.createElement("input"); ai.placeholder="Tapez votre rÃ©ponse ici..."; ai.style.cssText="width:100%;padding:12px 20px;font-family:'Cinzel',serif;font-size:14px;background:rgba(200,160,80,0.1);border:1px solid rgba(200,160,80,0.4);border-radius:4px;color:#f5e6c8;text-align:center;outline:none;"; const sb=document.createElement("button"); sb.innerText="âš” Valider la rÃ©ponse"; sb.style.cssText="padding:10px 30px;font-family:'Cinzel',serif;font-size:14px;background:linear-gradient(#7a5520,#3a2508);color:#c8a050;border:1px solid #c8a050;border-radius:4px;cursor:pointer;"; sb.onclick=()=>{ const ans=ai.value.toLowerCase().replace(/[^a-zÃ©Ã¨Ã Ã¢ÃªÃ´Ã®Ã»Ã§Å“ ]/g,"").replace(/\s+/g," ").trim(), tgt=secretAnswer.replace(/[^a-zÃ©Ã¨Ã Ã¢ÃªÃ´Ã®Ã»Ã§Å“ ]/g,"").replace(/\s+/g," ").trim(); if(ans===tgt) showRuneVictory(); else{ ai.style.borderColor="red"; setTimeout(()=>ai.style.borderColor="rgba(200,160,80,0.4)",1000); screenShakeHard() } }; as.appendChild(ai); as.appendChild(sb); ov.appendChild(as)
    const br=document.createElement("div"); br.style.cssText="display:flex;gap:10px;margin-top:16px;"; const xb=document.createElement("button"); xb.innerText="âœ• Quitter"; xb.style.cssText="padding:8px 24px;font-family:'Cinzel',serif;font-size:12px;background:rgba(80,20,20,0.4);color:#ff8080;border:1px solid rgba(180,40,40,0.4);border-radius:4px;cursor:pointer;"; xb.onclick=closeRuneChallenge; br.appendChild(xb); ov.appendChild(br) }
  document.body.appendChild(ov); setTimeout(()=>ov.style.opacity="1",20)
}

function unlockRuneHint(hintId) { db.ref("game/runeChallenge/unlockedHints").once("value",snap=>{ const c=snap.val()||[]; if(!c.includes(hintId)){ c.push(hintId); db.ref("game/runeChallenge/unlockedHints").set(c); showNotification("ðŸ”“ Fragment runique dÃ©couvert !"); flashGold() } }) }
function revealRuneLetter(letter) { if(!isGM) return; db.ref("game/runeChallenge/revealedLetters").once("value",snap=>{ const c=snap.val()||[], u=letter.toUpperCase(); if(!c.includes(u)){ c.push(u); db.ref("game/runeChallenge/revealedLetters").set(c); showNotification("áš± Lettre rÃ©vÃ©lÃ©e : "+u+" = "+(runeAlphabet[u]||"?")) } }) }
function showRuneVictory() { playSound("critSound"); flashGold(); flashGold(); screenShakeHard(); powerExplosion(); const w=document.createElement("div"); w.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel Decorative','Cinzel',serif;font-size:40px;color:gold;text-shadow:0 0 20px gold;text-align:center;pointer-events:none;z-index:99999999;"; const title=document.createElement("div"); title.innerText="âš” MESSAGE DÃ‰CHIFFRÃ‰ âš”"; const sub=document.createElement("span"); sub.style.cssText="font-size:18px;color:#c8a050;"; sub.innerText="Les runes rÃ©vÃ¨lent leur secret !"; w.appendChild(title); w.appendChild(sub); document.body.appendChild(w); setTimeout(()=>{ w.style.transition="opacity 1s"; w.style.opacity="0"; setTimeout(()=>w.remove(),1000) },4000) }
function tryRuneEventOnDice() { const sb=document.getElementById("storyImage"); if(!sb||sb.style.display!=="flex") return; db.ref("game/runeChallenge").once("value",snap=>{ const data=snap.val(); if(!data||!data.active) return; if(Math.random()>0.25) return; const rev=data.revealedLetters||[], ml=[...new Set("ALUERDSBVTIN OPQCM".split("").filter(c=>c.trim()))], unrev=ml.filter(l=>!rev.includes(l)); if(!unrev.length) return; const l=unrev[Math.floor(Math.random()*unrev.length)], r=runeAlphabet[l]||"?", d=runeEventDialogues[Math.floor(Math.random()*runeEventDialogues.length)]; showRuneBubble(d,l,r); setTimeout(()=>revealRuneLetter(l),3000) }) }
function showRuneBubble(dialogue, letter, rune) { const ex=document.getElementById("runeBubble"); if(ex) ex.remove(); const b=document.createElement("div"); b.id="runeBubble"; b.style.cssText="position:fixed;bottom:30%;left:55%;max-width:320px;background:url('images/paper.png') center/100% 100% no-repeat;padding:24px 30px;font-family:'IM Fell English',serif;font-size:15px;color:#2b1a10;line-height:1.6;z-index:9999999;opacity:0;transition:opacity 0.6s ease;pointer-events:none;"; const tx=document.createElement("div"); tx.innerText=dialogue; tx.style.cssText="margin-bottom:12px;font-style:italic;"; b.appendChild(tx); const rd=document.createElement("div"); rd.style.cssText="text-align:center;font-size:32px;color:#c8a050;text-shadow:0 0 10px gold;font-family:serif;margin:8px 0 4px;"; rd.innerText=rune; b.appendChild(rd); const ld=document.createElement("div"); ld.style.cssText="text-align:center;font-family:'Cinzel',serif;font-size:14px;color:#8b4000;letter-spacing:2px;"; ld.innerText="= "+letter; b.appendChild(ld); document.body.appendChild(b); setTimeout(()=>b.style.opacity="1",50); playSound("parcheminSound"); setTimeout(()=>{ b.style.opacity="0"; setTimeout(()=>b.remove(),600) },6000) }

/* ========================= */
/* MALÃ‰DICTION               */
/* ========================= */

function toggleCurse(level) { if(level===8) addMJLog("â˜  MalÃ©diction complÃ¨te !"); curseLevel=level; document.querySelectorAll(".curseGem").forEach((g,i)=>g.classList.toggle("active",i<level)); if(level===8){ flashRed(); screenShakeHard(); showNotification("â˜  La malÃ©diction est complÃ¨te !"); if(myToken){ myToken.classList.add("cursed"); startBloodEffect(myToken); triggerCurseWheel(myToken.id) } }; if(level<8&&myToken){ myToken.classList.remove("cursed"); stopBloodEffect(myToken) }; saveCurse() }
function saveCurse() { if(!myToken) return; db.ref("characters/"+myToken.id+"/curse").set(curseLevel) }
function setCorruption(level) { corruptionLevel=level; document.querySelectorAll(".corruptionPoint").forEach((b,i)=>b.classList.toggle("active",i<level)); if(level===10){ addMJLog("âœ¨ Pouvoir activÃ© pour "+(myToken?myToken.id:"")); flashGold(); screenShake(); powerExplosion(); showNotification("âœ¨ Pouvoir disponible !"); if(myToken){ myToken.classList.add("powerReady"); activatePowerMode(myToken.id) } }; if(level<10&&myToken) myToken.classList.remove("powerReady"); saveCorruption() }
function saveCorruption() { if(!myToken) return; db.ref("characters/"+myToken.id+"/corruption").set(corruptionLevel) }
function triggerCurseWheel(playerID) { db.ref("curse/wheel").set({ player:playerID, state:"intro", time:Date.now() }) }

function showCurseIntro(playerID) {
  playSound("curseSound"); playSound("curse1Sound"); let s=document.getElementById("curseIntroScreen"); if(!s){ s=document.createElement("div"); s.id="curseIntroScreen"; document.body.appendChild(s) }; s.innerHTML=""; s.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:999999999;animation:cursePulse 0.5s ease-in-out infinite alternate;"
  const t=document.createElement("div"); t.innerText="â˜  VOUS ÃŠTES MAUDIT â˜ "; t.style.cssText="font-family:Cinzel;font-size:60px;color:#ff0000;text-shadow:0 0 20px red;animation:curseShake 0.1s infinite;text-align:center;margin-bottom:30px;"; s.appendChild(t)
  const sub=document.createElement("div"); sub.innerText=playerID.toUpperCase()+" doit affronter son destin..."; sub.style.cssText="font-family:IM Fell English;font-size:24px;color:#cc4444;text-align:center;opacity:0.8;"; s.appendChild(sub)
  screenShakeHard(); flashRed(); setTimeout(()=>{ if(s) s.remove(); db.ref("curse/wheel/state").set("wheel") },3000)
}

function showCurseWheelScreen(playerID) {
  const isCursed=myToken&&myToken.id===playerID; let s=document.getElementById("curseWheelScreen"); if(!s){ s=document.createElement("div"); s.id="curseWheelScreen"; document.body.appendChild(s) }; s.innerHTML=""; s.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:999999999;"
  const t=document.createElement("div"); t.innerText="â˜  La Roue du Destin â˜ "; t.style.cssText="font-family:Cinzel;font-size:36px;color:#cc0000;text-shadow:0 0 20px red;margin-bottom:30px;"; s.appendChild(t)
  const canvas=document.createElement("canvas"); canvas.id="curseWheelCanvas"; canvas.width=500; canvas.height=500; canvas.style.cssText="filter:drop-shadow(0 0 20px darkred);"; s.appendChild(canvas)
  const btn=document.createElement("button"); btn.innerText=isCursed?"âš  Tourner la Roue âš ":"En attente de "+playerID.toUpperCase()+"..."; btn.style.cssText="margin-top:30px;padding:14px 40px;font-family:Cinzel;font-size:18px;background:linear-gradient(#5a0000,#2a0000);color:#ff6060;border:2px solid #aa0000;border-radius:8px;cursor:"+(isCursed?"pointer":"default")+";opacity:"+(isCursed?"1":"0.4")+";"; if(isCursed) btn.onclick=()=>{ btn.disabled=true; btn.style.opacity="0.4"; spinCurseWheel(playerID) }; s.appendChild(btn); drawCurseWheel(canvas,0)
}

function drawCurseWheel(canvas, rotation) {
  const ctx=canvas.getContext("2d"),cx=250,cy=250,radius=190,n=curseWheelChoices.length,arc=(Math.PI*2)/n
  ctx.clearRect(0,0,500,500); ctx.beginPath(); ctx.arc(cx,cy,radius+14,0,Math.PI*2); ctx.fillStyle="#3a0000"; ctx.fill(); ctx.strokeStyle="#ff4040"; ctx.lineWidth=3; ctx.stroke()
  curseWheelChoices.forEach((ch,i)=>{ const start=rotation+i*arc-Math.PI/2,end=start+arc,mid=start+arc/2; const gx=cx+Math.cos(mid)*radius*0.5,gy=cy+Math.sin(mid)*radius*0.5; const grad=ctx.createRadialGradient(gx,gy,0,cx,cy,radius); grad.addColorStop(0,shadeColor(ch.color,40)); grad.addColorStop(1,ch.color); ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,radius,start,end); ctx.closePath(); ctx.fillStyle=grad; ctx.fill(); ctx.strokeStyle="rgba(255,80,80,0.8)"; ctx.lineWidth=2; ctx.stroke(); ctx.save(); ctx.translate(cx,cy); ctx.rotate(mid); ctx.shadowColor="black"; ctx.shadowBlur=8; ctx.font="32px serif"; ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(ch.icon,radius*0.65,-18); ctx.font="bold 16px serif"; ctx.fillText(ch.label.split(" ").slice(0,2).join(" "),radius*0.65,8); if(ch.label.split(" ").length>2){ ctx.font="bold 14px serif"; ctx.fillText(ch.label.split(" ").slice(2).join(" "),radius*0.65,26) }; ctx.shadowBlur=0; ctx.restore() })
  ctx.beginPath(); ctx.arc(cx,cy,36,0,Math.PI*2); const cg=ctx.createRadialGradient(cx-8,cy-8,0,cx,cy,36); cg.addColorStop(0,"#ff4040"); cg.addColorStop(1,"#330000"); ctx.fillStyle=cg; ctx.fill(); ctx.strokeStyle="#ff6060"; ctx.lineWidth=3; ctx.stroke(); ctx.font="26px serif"; ctx.fillStyle="white"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("â˜ ",cx,cy)
  ctx.save(); ctx.translate(cx,cy-radius-20); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-16,-26); ctx.lineTo(16,-26); ctx.closePath(); ctx.fillStyle="#cc0000"; ctx.fill(); ctx.restore()
}

function spinCurseWheel(playerID) {
  const canvas=document.getElementById("curseWheelCanvas"); if(!canvas) return
  const n=curseWheelChoices.length,arc=(Math.PI*2)/n,ri=Math.floor(Math.random()*n)
  let total=(Math.PI*2*(5+Math.random()*3))+(-(ri*arc)-arc/2), start=null, cur=0
  function animate(ts) { if(!start) start=ts; const p=Math.min((ts-start)/4000,1); cur=total*(1-Math.pow(1-p,3)); drawCurseWheel(canvas,cur); if(p<1) requestAnimationFrame(animate); else setTimeout(()=>db.ref("curse/wheel").update({ state:"result",result:ri,player:playerID }),500) }
  requestAnimationFrame(animate)
}

function showCurseResult(playerID, resultIndex) {
  const ch=curseWheelChoices[resultIndex]; const ws=document.getElementById("curseWheelScreen"); if(ws) ws.remove(); playSound("curseSound"); playSound("curse2Sound")
  const s=document.createElement("div"); s.id="curseResultScreen"; s.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:999999999;"; document.body.appendChild(s); flashRed(); screenShakeHard()
  const ic=document.createElement("div"); ic.innerText=ch.icon; ic.style.cssText="font-size:100px;margin-bottom:20px;animation:curseResultPop 0.5s ease-out;"; s.appendChild(ic)
  const t=document.createElement("div"); t.innerText=ch.label; t.style.cssText="font-family:Cinzel;font-size:56px;color:#ff0000;text-shadow:0 0 20px red;margin-bottom:16px;text-align:center;animation:curseResultPop 0.6s ease-out;"; s.appendChild(t)
  const d=document.createElement("div"); d.innerText=ch.description; d.style.cssText="font-family:IM Fell English;font-size:22px;color:#cc6666;text-align:center;margin-bottom:40px;"; s.appendChild(d)
  if(myToken&&myToken.id===playerID) applyCurseEffect(playerID,resultIndex)
  setTimeout(()=>{ s.remove(); db.ref("curse/wheel").remove(); if(myToken&&myToken.id===playerID){ db.ref("characters/"+playerID+"/curse").set(0); if(currentSheetPlayer===playerID){ curseLevel=0; document.querySelectorAll(".curseGem").forEach(g=>g.classList.remove("active")) }; const tok=document.getElementById(playerID); if(tok){ tok.classList.remove("cursed"); stopBloodEffect(tok) } } },5000)
}

function applyCurseEffect(playerID, ri) {
  db.ref("characters/"+playerID).once("value",snap=>{ const d=snap.val(); if(!d) return; const u={}
    switch(ri){
      case 0:{ const nh=Math.max(1,Math.floor((d.hp||100)*0.6)); u.hp=nh; const hf=document.getElementById("hp"); if(hf&&currentSheetPlayer===playerID){ hf.value=nh; updateHPBar() }; break }
      case 1:{ const ms={greg:"force",ju:"perspi",elo:"charme",bibi:"chance"},stat=ms[playerID]; if(stat){ u[stat]=Math.max(0,(d[stat]||0)-4); const sf=document.getElementById(stat); if(sf&&currentSheetPlayer===playerID) sf.value=u[stat] }; break }
      case 2: u.cursedEffect="critOnly"; break
      case 3:{ const ls=(d.inventaire||"").split("\n").filter(l=>l.trim()!==""); if(ls.length>0) ls.pop(); u.inventaire=ls.join("\n"); break }
    }
    db.ref("characters/"+playerID).update(u)
  })
}

/* ========================= */
/* POUVOIR                   */
/* ========================= */

function activatePowerMode(playerID) { if(powerModeActive) return; powerModeActive=true; playSound("powerSound",0.75); const tok=document.getElementById(playerID); if(tok) tok.classList.add("powerReady","powerFull"); if(myToken&&myToken.id===playerID) showUsePowerBtn(playerID) }
function showUsePowerBtn(playerID) { const ex=document.getElementById("usePowerBtn"); if(ex) ex.remove(); const btn=document.createElement("button"); btn.id="usePowerBtn"; btn.innerText="âœ¨ USE POWER âœ¨"; btn.style.cssText="position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:14px 40px;font-family:Cinzel;font-size:20px;letter-spacing:2px;background:linear-gradient(180deg,#8a6000,#4a3000);color:gold;border:2px solid gold;border-radius:10px;cursor:pointer;z-index:999999999;box-shadow:0 0 20px gold,0 0 40px orange;animation:powerBtnPulse 1s ease-in-out infinite alternate;text-shadow:0 0 10px gold;"; btn.onclick=()=>usePower(playerID); document.body.appendChild(btn) }

function usePower(playerID) {
  const btn=document.getElementById("usePowerBtn"); if(btn) btn.remove()
  db.ref("game/powerSound").set({ player:playerID, time:Date.now() }); playSound("powerSound",0.9); powerExplosion(); powerExplosion(); flashGold(); flashGold(); screenShakeHard()
  for(let i=0;i<30;i++) setTimeout(()=>{ const p=document.createElement("div"); p.style.cssText=`position:fixed;width:${4+Math.random()*8}px;height:${4+Math.random()*8}px;border-radius:50%;background:gold;left:${Math.random()*100}%;top:${Math.random()*100}%;pointer-events:none;z-index:9999998;box-shadow:0 0 8px gold;animation:goldRise 1.5s ease-out forwards;`; document.body.appendChild(p); setTimeout(()=>p.remove(),1500) },i*60)
  showNotification("âœ¨ "+playerID.toUpperCase()+" LIBÃˆRE SON POUVOIR !"); addMJLog("âœ¨ "+playerID.toUpperCase()+" utilise son pouvoir !"); db.ref("characters/"+playerID+"/corruption").set(0); powerModeActive=false
  const tok=document.getElementById(playerID); if(tok) setTimeout(()=>tok.classList.remove("powerReady","powerFull"),2000)
  if(currentSheetPlayer===playerID){ corruptionLevel=0; document.querySelectorAll(".corruptionPoint").forEach(pt=>pt.classList.remove("active")) }
}

/* ========================= */
/* AURORE BORÃ‰ALE            */
/* ========================= */

function triggerAurora() { if(auroraActive) return; auroraActive=true; db.ref("events/aurora").set({ active:true, time:Date.now() }) }

function clearAuroraTimers() {
  ;["__auroraMsgTimer", "__auroraRemoveMsgTimer", "__auroraAutoEndTimer", "__auroraFinalCleanupTimer"].forEach(key => {
    if (window[key]) {
      clearTimeout(window[key])
      window[key] = null
    }
  })
  if (window.__auroraFadeInInterval) {
    clearInterval(window.__auroraFadeInInterval)
    window.__auroraFadeInInterval = null
  }
  if (window.__auroraFadeOutInterval) {
    clearInterval(window.__auroraFadeOutInterval)
    window.__auroraFadeOutInterval = null
  }
}

function startAuroraMusic() {
  const aurora = document.getElementById("auroraMusic")
  if (!aurora) return
  if (window.__auroraFadeOutInterval) {
    clearInterval(window.__auroraFadeOutInterval)
    window.__auroraFadeOutInterval = null
  }
  try { aurora.pause() } catch (_) {}
  aurora.currentTime = 0
  aurora.volume = 0
  aurora.play().catch(()=>{})
  window.__auroraFadeInInterval = setInterval(() => {
    if (aurora.volume < 0.35) aurora.volume = Math.min(0.35, aurora.volume + 0.03)
    else {
      clearInterval(window.__auroraFadeInInterval)
      window.__auroraFadeInInterval = null
    }
  }, 100)
}

function stopAuroraMusic(fade, onDone) {
  const aurora = document.getElementById("auroraMusic")
  if (!aurora) {
    if (onDone) onDone()
    return
  }
  if (window.__auroraFadeInInterval) {
    clearInterval(window.__auroraFadeInInterval)
    window.__auroraFadeInInterval = null
  }
  if (!fade) {
    try { aurora.pause() } catch (_) {}
    aurora.currentTime = 0
    aurora.volume = 0
    if (onDone) onDone()
    return
  }
  window.__auroraFadeOutInterval = setInterval(() => {
    if (aurora.volume > 0.04) aurora.volume = Math.max(0, aurora.volume - 0.04)
    else {
      clearInterval(window.__auroraFadeOutInterval)
      window.__auroraFadeOutInterval = null
      try { aurora.pause() } catch (_) {}
      aurora.currentTime = 0
      aurora.volume = 0
      if (onDone) onDone()
    }
  }, 100)
}

function resetAuroraPresentation() {
  clearAuroraTimers()
  auroraActive = false
  const overlay = document.getElementById("auroraOverlay")
  if (overlay && overlay.parentNode) overlay.remove()
  const msg = document.getElementById("auroraMessage")
  if (msg && msg.parentNode) msg.remove()
  const bifrostBtn = document.getElementById("bifrostBtn")
  if (bifrostBtn && bifrostBtn.parentNode) bifrostBtn.remove()
  const end = document.getElementById("auroraEndMessage")
  if (end && end.parentNode) end.remove()
  stopAuroraMusic(false)
}

function showAuroraEvent() {
  clearAuroraTimers()
  if(document.getElementById("auroraOverlay")) {
    auroraActive = true
    updateBifrostBtn()
    const aurora = document.getElementById("auroraMusic")
    if (aurora && aurora.paused && currentMap !== "bifrost.jpg") startAuroraMusic()
    return
  }
  auroraActive=true; updateBifrostBtn(); if(isGM) setTimeout(()=>checkOdinVision(),5000)
  const ov=document.createElement("div"); ov.id="auroraOverlay"; ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999990;opacity:0;transition:opacity 3s ease;"; document.body.appendChild(ov)
  const colors=["rgba(0,255,150,0.22)","rgba(0,220,255,0.18)","rgba(120,60,255,0.16)","rgba(0,255,180,0.20)","rgba(40,180,255,0.17)"]
  for(let i=0;i<8;i++){ const b=document.createElement("div"); b.style.cssText=`position:absolute;top:${Math.random()*60}%;left:-20%;width:140%;height:${80+Math.random()*160}px;background:linear-gradient(90deg,transparent,${colors[i%colors.length]},transparent);border-radius:50%;transform:rotate(${-15+Math.random()*30}deg);animation:auroraDance ${4+Math.random()*6}s ease-in-out infinite;animation-delay:${Math.random()*3}s;filter:blur(8px);`; ov.appendChild(b) }
  const msg=document.createElement("div"); msg.id="auroraMessage"; msg.style.cssText="position:fixed;top:12%;left:50%;transform:translateX(-50%);text-align:center;pointer-events:none;z-index:9999995;opacity:0;transition:opacity 2s ease;"; const msgIcon=document.createElement("div"); msgIcon.style.cssText="font-size:42px;margin-bottom:16px;"; msgIcon.innerText="âœ¨"; const msgTitle=document.createElement("div"); msgTitle.style.cssText="font-family:Cinzel Decorative,Cinzel,serif;font-size:28px;letter-spacing:4px;margin-bottom:12px;color:#a0ffcc;text-shadow:0 0 20px #00ffaa;"; msgTitle.innerText="AURORES BORÃ‰ALES"; const msgText=document.createElement("div"); msgText.style.cssText="font-family:IM Fell English,serif;font-size:18px;color:#c0fff0;opacity:0.9;line-height:1.6;max-width:500px;text-align:center;"; msgText.innerText="Les cieux s'embrasent de lumiÃ¨res mystiques..."; msg.appendChild(msgIcon); msg.appendChild(msgTitle); msg.appendChild(msgText); document.body.appendChild(msg)
  setTimeout(()=>{ ov.style.opacity="1"; msg.style.opacity="1" },100)
  startAuroraMusic()
  fadeMusicOut(()=>{})
  window.__auroraMsgTimer = setTimeout(()=>{
    msg.style.opacity="0"
    window.__auroraRemoveMsgTimer = setTimeout(()=>msg.remove(),2000)
  },5000)
  if (isGM) {
    window.__auroraAutoEndTimer = setTimeout(() => db.ref("events/aurora").remove(), 55000)
  }
}

function showAuroraEndSequence() {
  clearAuroraTimers()
  auroraActive = false
  updateBifrostBtn()

  const ov = document.getElementById("auroraOverlay")
  const msg = document.getElementById("auroraMessage")
  if (msg && msg.parentNode) msg.remove()

  let end = document.getElementById("auroraEndMessage")
  if (!end) {
    end = document.createElement("div")
    end.id = "auroraEndMessage"
    const endIcon=document.createElement("div"); endIcon.style.cssText="font-size:34px;margin-bottom:12px;"; endIcon.innerText="âœ¦"
    const endTitle=document.createElement("div"); endTitle.style.cssText="font-family:Cinzel Decorative,Cinzel,serif;font-size:24px;letter-spacing:4px;margin-bottom:10px;color:#d9fff1;text-shadow:0 0 20px rgba(120,255,220,0.8);"; endTitle.innerText="LES AURORES S'Ã‰TEIGNENT"
    const endText=document.createElement("div"); endText.style.cssText="font-family:IM Fell English,serif;font-size:18px;color:#d8fff8;opacity:0.92;line-height:1.6;max-width:520px;text-align:center;"; endText.innerText="Le ciel reprend lentement son souffle."
    end.appendChild(endIcon); end.appendChild(endTitle); end.appendChild(endText)
    end.style.cssText = "position:fixed;top:14%;left:50%;transform:translateX(-50%);text-align:center;pointer-events:none;z-index:99999999;opacity:0;transition:opacity 2s ease;"
    document.body.appendChild(end)
  }

  setTimeout(() => { end.style.opacity = "1" }, 50)
  if (ov) {
    ov.style.transition = "opacity 5s ease"
    ov.style.opacity = "0"
  }
  screenShake()

  stopAuroraMusic(true, () => {
    if (ov && ov.parentNode) ov.remove()
    if (end && end.parentNode) {
      setTimeout(() => {
        end.style.opacity = "0"
        setTimeout(() => { if (end.parentNode) end.remove() }, 2200)
      }, 4000)
    }
    if (currentMap && mapMusic[currentMap]) crossfadeMusic(mapMusic[currentMap])
  })
}

function updateBifrostBtn() {
  const ex=document.getElementById("bifrostBtn"), should=auroraActive&&currentMap==="arbre.jpg"
  if(should&&!ex){ const btn=document.createElement("div"); btn.id="bifrostBtn"; btn.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;cursor:"+(isGM?"pointer":"default")+";pointer-events:"+(isGM?"auto":"none")+";text-align:center;opacity:0;transition:opacity 1.5s ease;"; btn.innerHTML=`<div style="font-family:'Cinzel Decorative','Cinzel',serif;font-size:30px;color:#44ccff;text-shadow:0 0 20px #0099ff;letter-spacing:10px;padding:20px 40px;background:rgba(0,50,100,0.5);border:2px solid rgba(100,200,255,0.5);border-radius:12px;box-shadow:0 0 30px rgba(0,150,255,0.4);">BIFROST<br><span style="font-size:12px;letter-spacing:4px;opacity:0.7;">âœ¦ LE PONT ARC-EN-CIEL âœ¦</span></div>`; if(isGM) btn.onclick=()=>triggerBifrostFlash(); document.body.appendChild(btn); setTimeout(()=>btn.style.opacity="1",50) }
  else if(!should&&ex){ ex.style.transition="opacity 1s"; ex.style.opacity="0"; setTimeout(()=>{ if(ex.parentNode) ex.remove() },1000) }
}

function triggerBifrostFlash() { const btn=document.getElementById("bifrostBtn"); if(btn) btn.style.pointerEvents="none"; db.ref("game/bifrostFlash").set({ time:Date.now() }) }
function stopBifrostFlashSound() {
  const snd = window.__bifrostFlashSound
  if (!snd) return
  try { snd.pause() } catch (_) {}
  try { snd.currentTime = 0 } catch (_) {}
  window.__bifrostFlashSound = null
}
function doBifrostFlash() {
  stopBifrostFlashSound()
  fadeMusicOut(()=>{}); const tremb=new Audio("audio/tremblement.mp3"); let trembBase=0.8; setManagedAudioBaseVolume(tremb,trembBase); tremb.play().catch(()=>{}); setTimeout(()=>{ let iv=setInterval(()=>{ if(trembBase>0.04) { trembBase-=0.05; setManagedAudioBaseVolume(tremb,trembBase) } else{ tremb.pause(); clearInterval(iv) } },100) },4500)
  const snd=new Audio("audio/bifrost.mp3"); setManagedAudioBaseVolume(snd,1.0); window.__bifrostFlashSound = snd; snd.play().catch(()=>{})
  const fl=[{c:"rgba(200,230,255,0.4)",d:80},{c:"rgba(255,255,255,0.5)",d:120},{c:"rgba(100,180,255,0.9)",d:200},{c:"rgba(255,255,255,1.0)",d:400}]
  let delay=0; fl.forEach(f=>{ setTimeout(()=>{ const flash=document.createElement("div"); flash.style.cssText=`position:fixed;top:0;left:0;width:100%;height:100%;background:${f.c};pointer-events:none;z-index:99999998;`; document.body.appendChild(flash); setTimeout(()=>{ flash.style.transition=`opacity ${f.d*1.5}ms ease`; flash.style.opacity="0"; setTimeout(()=>flash.remove(),f.d*2) },f.d*0.3) },delay); delay+=f.d+60 })
  screenShake(); setTimeout(()=>screenShakeHard(),300); setTimeout(()=>screenShakeHard(),700); setTimeout(()=>flashGold(),delay-200); setTimeout(()=>{ if(isGM) changeMap("bifrost.jpg") },delay+400)
}

/* ========================= */
/* ODIN VISION               */
/* ========================= */

function checkOdinVision() { if(odinVisionShown) return; db.ref("events/aurora").once("value",a=>{ if(!a.val()||!a.val().active) return; db.ref("game/runeChallenge").once("value",r=>{ const rc=r.val(); if(!rc||!rc.active) return; odinVisionShown=true; setTimeout(()=>triggerOdinVision(),2000+Math.random()*5000) }) }) }
function triggerOdinVision() { const msg=ODIN_VISIONS[Math.floor(Math.random()*ODIN_VISIONS.length)]; db.ref("game/odinVision").set({ msg, time:Date.now() }); db.ref("game/runeChallenge/revealedLetters").once("value",snap=>{ const l=snap.val()||[], al="ABCDEFGHIJKLMNOPRSTUVWXYZ".split(""), ul=al.filter(x=>!l.includes(x)); if(ul.length){ const p=ul[Math.floor(Math.random()*ul.length)]; l.push(p); db.ref("game/runeChallenge/revealedLetters").set(l) } }) }
function showOdinVision(msg) { const ov=document.createElement("div"); ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999990;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0;transition:opacity 1.5s ease;"; const bg=document.createElement("div"); bg.style.cssText="position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(ellipse at center,rgba(30,0,80,0.7) 0%,rgba(0,0,40,0.5) 100%);"; ov.appendChild(bg); const d=document.createElement("div"); d.style.cssText="position:relative;z-index:1;text-align:center;max-width:560px;padding:36px 40px;background:rgba(10,5,30,0.75);border:1px solid rgba(160,120,255,0.3);border-radius:12px;"; const img=document.createElement("img"); img.src="images/odin.png"; img.style.cssText="width:90px;height:90px;object-fit:contain;border-radius:50%;border:2px solid rgba(180,150,255,0.4);margin-bottom:16px;opacity:0.9;"; img.onerror=()=>img.style.display="none"; d.appendChild(img); const t=document.createElement("div"); t.style.cssText="font-family:'Cinzel Decorative',serif;font-size:14px;color:rgba(220,200,255,0.7);letter-spacing:6px;margin-bottom:16px;"; t.innerText="âœ¦ Odin vous parle âœ¦"; d.appendChild(t); const m=document.createElement("div"); m.style.cssText="font-family:'IM Fell English',serif;font-size:22px;color:rgba(255,245,220,0.97);font-style:italic;line-height:1.7;"; m.innerText=msg; d.appendChild(m); ov.appendChild(d); document.body.appendChild(ov); setTimeout(()=>ov.style.opacity="1",50); setTimeout(()=>{ ov.style.opacity="0"; setTimeout(()=>{ if(ov.parentNode) ov.remove() },1500); if(isGM) db.ref("game/odinVision").remove(); odinVisionShown=false },7000) }

/* ========================= */
/* Ã‰LÃ‰MENTS MAP              */
/* ========================= */

function cleanupMapElementDragHandlers(id) {
  if (!window.__mapElementDragHandlers || !window.__mapElementDragHandlers[id]) return
  const handlers = window.__mapElementDragHandlers[id]
  document.removeEventListener("mousemove", handlers.onMove)
  document.removeEventListener("mouseup", handlers.onUp)
  delete window.__mapElementDragHandlers[id]
}

function clearAllElements() { db.ref("elements").remove() }
function renderMapElement(data) {
  cleanupMapElementDragHandlers(data.id)
  const ex=document.getElementById("elem_"+data.id); if(ex) ex.remove(); if(!document.getElementById("map")) return
  const safeImage = sanitizeAssetName(data.image)
  const el=document.createElement("div"); el.id="elem_"+data.id; el.style.cssText=`position:absolute;left:${data.x}px;top:${data.y}px;width:90px;height:90px;cursor:${isGM?"grab":data.clickable?"pointer":"default"};z-index:5000;user-select:none;transition:opacity 0.4s;opacity:0;`
  if(data.isRune){ const rs=document.createElement("div"); rs.style.cssText="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:40px;color:#c8a050;text-shadow:0 0 15px gold;background:rgba(30,15,5,0.85);border:2px solid rgba(200,160,80,0.6);border-radius:50%;animation:tokenRingPulse 2s ease-in-out infinite;pointer-events:none;"; rs.innerText="áš±"; el.appendChild(rs) }
  else{ const img=document.createElement("img"); img.src="images/"+safeImage; img.style.cssText="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.8));pointer-events:none;"; el.appendChild(img) }
  if(isGM){ const rb=document.createElement("div"); rb.style.cssText="position:absolute;top:-8px;right:-8px;width:20px;height:20px;background:#cc0000;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;cursor:pointer;box-shadow:0 0 6px black;z-index:10;"; rb.innerText="âœ•"; rb.onclick=e=>{ e.stopPropagation(); cleanupMapElementDragHandlers(data.id); db.ref("elements/"+data.id).remove() }; el.appendChild(rb) }
  if(data.clickable){ el.onclick=()=>{ if(data.isRune&&data.runeHint){ unlockRuneHint(data.runeHint); flashGold(); el.style.filter="drop-shadow(0 0 20px gold) brightness(2)"; setTimeout(()=>el.style.filter="",600); cleanupMapElementDragHandlers(data.id); db.ref("elements/"+data.id).remove() } else if(!isGM){ const ov=document.createElement("div"); ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999999;cursor:pointer;"; const bi=document.createElement("img"); bi.src="images/"+safeImage; bi.style.cssText="max-width:80vw;max-height:80vh;object-fit:contain;"; ov.appendChild(bi); ov.onclick=()=>ov.remove(); document.body.appendChild(ov) } } }
  if(isGM){ let dg=false,ox=0,oy=0; const onMove=e=>{ if(!dg) return; data.x=e.clientX-ox; data.y=e.clientY-oy; el.style.left=data.x+"px"; el.style.top=data.y+"px" }; const onUp=()=>{ if(!dg) return; dg=false; el.style.cursor="grab"; db.ref("elements/"+data.id+"/x").set(data.x); db.ref("elements/"+data.id+"/y").set(data.y) }; el.addEventListener("mousedown",e=>{ if(e.target===el.querySelector("div")) return; dg=true; ox=e.clientX-data.x; oy=e.clientY-data.y; el.style.cursor="grabbing"; e.stopPropagation() }); if(!window.__mapElementDragHandlers) window.__mapElementDragHandlers={}; window.__mapElementDragHandlers[data.id]={ onMove, onUp }; document.addEventListener("mousemove",onMove); document.addEventListener("mouseup",onUp) }
  document.body.appendChild(el); setTimeout(()=>el.style.opacity="1",20)
}

/* ========================= */
/* WANTED                    */
/* ========================= */

function openWantedEditor() { const wb=document.getElementById("wantedMobBtn"); if(wb){ wb.innerText="â€” Choisir un mob â€”"; wb.dataset.value="" }; document.getElementById("wantedEditor").style.display="flex" }
function normalizeWantedPosterData(data) {
  const allowedTiers = Object.keys(WANTED_REWARDS || {})
  const mob = WANTED_MOBS.includes(data?.mob) ? data.mob : ""
  const tier = allowedTiers.includes(data?.tier) ? data.tier : "weak"
  const reward = clampInteger(data?.reward, 1, 999999)
  const id = String(data?.id || ("wanted_" + Date.now()))
  if (!mob) return null
  return { mob, tier, reward, id }
}

function removeWantedPosterElement(id) {
  const safeId = String(id || "")
  if (!safeId) return
  cleanupMapElementDragHandlers(safeId)
  const el = document.getElementById("elem_" + safeId)
  if (el) el.remove()
  db.ref("elements/" + safeId).remove().catch(() => {})
}

function cleanupLegacyWantedElements() {
  if (!isGM) return
  db.ref("elements").once("value", snap => {
    const data = snap.val()
    if (!data) return
    Object.entries(data).forEach(([id, item]) => {
      if (!item) return
      if (item.wantedData || String(id).startsWith("wanted_")) removeWantedPosterElement(id)
    })
  })
}

function publishWantedOverlay(data) {
  const normalized = normalizeWantedPosterData(data)
  if (!normalized) return
  db.ref("game/wantedOpen").set({ poster:normalized, time:Date.now() })
}

function createWantedPoster() {
  const normalized = normalizeWantedPosterData({
    mob: document.getElementById("wantedMobBtn")?.dataset.value || "",
    tier: document.getElementById("wantedTierBtn")?.dataset.value || "weak",
    reward: document.getElementById("wantedReward").value,
    id: "wanted_" + Date.now()
  })
  if (!normalized) { showNotification("Affiche invalide"); return }
  document.getElementById("wantedEditor").style.display="none"
  db.ref("game/wantedPosters/" + normalized.id).set(normalized)
  removeWantedPosterElement(normalized.id)
  publishWantedOverlay(normalized)
}

function renderWantedPoster(data) {
  const normalized = normalizeWantedPosterData(data)
  const list=document.getElementById("wantedList")
  if(!list || !normalized) return
  const safeMobImage = sanitizeAssetName(normalized.mob + ".png")
  const card=document.createElement("div")
  card.id="wantedCard_" + normalized.id
  card.style.cssText="display:flex;align-items:center;gap:8px;padding:8px;background:rgba(60,40,10,0.4);border:1px solid rgba(150,100,30,0.4);border-radius:4px;"
  const img=document.createElement("img")
  img.src="images/" + safeMobImage
  img.style.cssText="width:36px;height:36px;object-fit:contain;border-radius:3px;"
  img.onerror=()=>img.style.opacity="0.3"
  card.appendChild(img)
  const info=document.createElement("div")
  info.style.cssText="flex:1;"
  const name=document.createElement("div")
  name.style.cssText="font-family:Cinzel,serif;font-size:11px;color:rgb(255,200,80);"
  name.innerText = normalized.mob.toUpperCase()
  const meta=document.createElement("div")
  meta.style.cssText="font-size:10px;color:rgb(200,160,60);"
  meta.innerText = "ðŸ’° " + normalized.reward + " po â€” " + normalized.tier
  info.appendChild(name)
  info.appendChild(meta)
  card.appendChild(info)
  const open=document.createElement("button")
  open.style.cssText="padding:2px 8px;font-size:10px;background:rgba(90,70,20,0.5);color:#ffd68a;border:1px solid rgba(170,130,40,0.45);border-radius:3px;cursor:pointer;"
  open.innerText="Mettre en avant"
  open.onclick=()=>{ if (isGM) publishWantedOverlay(normalized); else showWantedOverlay(normalized) }
  card.appendChild(open)
  const del=document.createElement("button")
  del.style.cssText="padding:2px 8px;font-size:10px;background:rgba(80,20,0,0.5);color:#ff8888;border:1px solid rgba(150,40,0,0.4);border-radius:3px;cursor:pointer;"
  del.innerText="âœ•"
  del.onclick=()=>{ db.ref("game/wantedPosters/" + normalized.id).remove(); removeWantedPosterElement(normalized.id); db.ref("game/wantedOpen").once("value", snap => { const openData = snap.val(); if (openData?.poster?.id === normalized.id) db.ref("game/wantedOpen").remove() }); card.remove() }
  card.appendChild(del)
  list.appendChild(card)
}

function showWantedOverlay(data) {
  const normalized = normalizeWantedPosterData(data)
  if (!normalized) return
  const existing = document.getElementById("wantedOverlay")
  if (existing) existing.remove()
  const safeMobImage = sanitizeAssetName(normalized.mob + ".png")
  const ov=document.createElement("div")
  ov.id = "wantedOverlay"
  ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:99999999;cursor:pointer;"
  ov.onclick=()=>ov.remove()
  const p=document.createElement("div")
  p.style.cssText="position:relative;width:300px;padding:30px 20px;text-align:center;"
  const bg=document.createElement("img")
  bg.src="images/wanted.png"
  bg.style.cssText="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:fill;opacity:0.9;"
  p.appendChild(bg)
  const inner=document.createElement("div")
  inner.style.cssText="position:relative;z-index:1;padding:20px;"
  const mi=document.createElement("img")
  mi.src="images/" + safeMobImage
  mi.style.cssText="width:100px;height:100px;object-fit:contain;border:3px solid rgb(100,60,10);border-radius:4px;margin:10px auto;display:block;"
  inner.appendChild(mi)
  const n=document.createElement("div")
  n.style.cssText="font-family:'Cinzel Decorative',serif;font-size:18px;color:rgb(80,40,0);letter-spacing:3px;margin-bottom:8px;"
  n.innerText=normalized.mob.toUpperCase()
  inner.appendChild(n)
  const r=document.createElement("div")
  r.style.cssText="font-family:Cinzel,serif;font-size:22px;color:rgb(120,70,0);font-weight:bold;"
  r.innerText="ðŸ’° " + normalized.reward + " po"
  inner.appendChild(r)
  p.appendChild(inner)
  ov.appendChild(p)
  document.body.appendChild(ov)
}

function renderWantedBoardCard(data) {
  const normalized = normalizeWantedPosterData(data)
  if (!normalized) return null
  const safeMobImage = sanitizeAssetName(normalized.mob + ".png")
  const card=document.createElement("button")
  card.type="button"
  card.style.cssText="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;width:190px;min-height:268px;padding:26px 18px 18px;background:url('images/wanted.png') center/100% 100% no-repeat;border:none;color:#5a3410;cursor:pointer;font-family:Cinzel,serif;filter:drop-shadow(0 8px 14px rgba(0,0,0,0.45));transition:transform 0.15s ease,filter 0.15s ease;"
  const pin=document.createElement("div")
  pin.style.cssText="position:absolute;top:10px;left:50%;transform:translateX(-50%) rotate(-8deg);width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#f4e3bf 0%,#a67c34 45%,#5a3c12 100%);box-shadow:0 2px 5px rgba(0,0,0,0.45);"
  const img=document.createElement("img")
  img.src="images/" + safeMobImage
  img.style.cssText="width:82px;height:82px;object-fit:contain;margin-top:18px;border:3px solid rgba(100,60,10,0.55);border-radius:4px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.28));"
  img.onerror=()=>img.style.opacity="0.35"
  const subtitle=document.createElement("div")
  subtitle.style.cssText="font-family:'Cinzel Decorative',Cinzel,serif;font-size:13px;letter-spacing:3px;color:#7b4208;text-align:center;margin-top:10px;"
  subtitle.innerText="WANTED"
  const title=document.createElement("div")
  title.style.cssText="font-size:15px;letter-spacing:1px;color:#4f2f12;text-align:center;font-weight:bold;line-height:1.3;margin-top:8px;"
  title.innerText=normalized.mob.toUpperCase()
  const meta=document.createElement("div")
  meta.style.cssText="font-size:12px;color:#6b4720;text-align:center;line-height:1.6;margin-top:10px;"
  meta.innerText="Prime : " + normalized.reward + " po"
  const tier=document.createElement("div")
  tier.style.cssText="font-size:10px;color:#8a5a24;text-align:center;letter-spacing:1px;margin-top:2px;"
  tier.innerText=String(normalized.tier || "").toUpperCase()
  card.appendChild(pin)
  card.appendChild(img)
  card.appendChild(subtitle)
  card.appendChild(title)
  card.appendChild(meta)
  card.appendChild(tier)
  card.onmouseenter=()=>{ card.style.transform="translateY(-3px) rotate(-1deg)"; card.style.filter="drop-shadow(0 12px 18px rgba(0,0,0,0.5))" }
  card.onmouseleave=()=>{ card.style.transform=""; card.style.filter="drop-shadow(0 8px 14px rgba(0,0,0,0.45))" }
  card.onclick=()=>showWantedOverlay(normalized)
  return card
}

function buildWantedBoardContent(container, posters) {
  container.innerHTML=""
  const title=document.createElement("div")
  title.style.cssText="text-align:center;font-family:'Cinzel Decorative',Cinzel,serif;font-size:24px;letter-spacing:4px;color:#f1d08a;margin-bottom:8px;"
  title.innerText="TABLEAU DES PRIMES"
  const subtitle=document.createElement("div")
  subtitle.style.cssText="text-align:center;font-family:'IM Fell English',serif;font-size:16px;color:#d9be84;margin-bottom:18px;"
  subtitle.innerText="Cliquez sur une affiche pour la consulter"
  container.appendChild(title)
  container.appendChild(subtitle)
  const grid=document.createElement("div")
  grid.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,190px));justify-content:center;gap:22px 18px;padding:8px 6px 4px;"
  if (posters.length) {
    posters.forEach(poster => {
      const card = renderWantedBoardCard(poster)
      if (card) grid.appendChild(card)
    })
  } else {
    const empty=document.createElement("div")
    empty.style.cssText="grid-column:1/-1;text-align:center;padding:18px;font-family:Cinzel,serif;font-size:14px;color:#caa46b;border:1px solid rgba(160,110,40,0.25);border-radius:8px;background:rgba(25,15,6,0.6);"
    empty.innerText="Aucune affiche active pour le moment"
    grid.appendChild(empty)
  }
  container.appendChild(grid)
}

function openWantedBoard() {
  const existing=document.getElementById("wantedBoardOverlay")
  if (existing) { closeWantedBoard(); return }
  document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" })
  const bell = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath("cloche.mp3") : "audio/cloche.mp3")
  setManagedAudioBaseVolume(bell, 0.78, "effects")
  bell.play().catch(() => {})
  const overlay=document.createElement("div")
  overlay.id="wantedBoardOverlay"
  overlay.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.84);display:flex;align-items:center;justify-content:center;z-index:99999998;"
  overlay.onclick=e=>{ if(e.target===overlay) overlay.remove() }
  const panel=document.createElement("div")
  panel.style.cssText="width:min(960px,92vw);max-height:84vh;overflow-y:auto;padding:26px 24px 22px;background:url('images/wood.png') center/contain no-repeat;border:none;border-radius:0;box-shadow:none;"
  panel.onclick=e=>e.stopPropagation()
  const close=document.createElement("button")
  close.type="button"
  close.style.cssText="display:block;margin:0 0 14px auto;padding:6px 12px;background:rgba(80,20,0,0.55);color:#ffb0a0;border:1px solid rgba(180,60,20,0.45);border-radius:6px;cursor:pointer;font-family:Cinzel,serif;"
  close.innerText="Fermer"
  close.onclick=()=>closeWantedBoard()
  panel.appendChild(close)
  const content=document.createElement("div")
  content.id="wantedBoardContent"
  panel.appendChild(content)
  overlay.appendChild(panel)
  document.body.appendChild(overlay)
  const posters=Object.values(window.__wantedPostersData||{}).filter(Boolean)
  buildWantedBoardContent(content, posters)
  if (!posters.length) {
    db.ref("game/wantedPosters").once("value", snap => {
      const data=snap.val()||{}
      window.__wantedPostersData=data
      buildWantedBoardContent(content, Object.values(data).filter(Boolean))
    })
  }
}

function closeWantedBoard() {
  const overlay = document.getElementById("wantedBoardOverlay")
  if (overlay) overlay.remove()
}
function toggleWantedDropdown(el) { const dd=document.getElementById("wantedMobDropdown"); if(!dd) return; if(dd.style.display!=="none"){ dd.style.display="none"; return }; if(!dd.dataset.built){ dd.dataset.built="1"; const em=document.createElement("div"); em.style.cssText="padding:5px 10px;font-family:Cinzel,serif;font-size:11px;color:rgb(180,120,60);cursor:pointer;"; em.innerText="â€” Choisir un mob â€”"; em.onmousedown=e=>{ e.stopPropagation(); selectWantedMob("","â€” Choisir un mob â€”") }; dd.appendChild(em); WANTED_MOBS.forEach(m=>{ const it=document.createElement("div"); it.style.cssText="padding:5px 10px;font-family:Cinzel,serif;font-size:11px;color:rgb(255,200,120);cursor:pointer;"; it.innerText=m.charAt(0).toUpperCase()+m.slice(1); it.onmousedown=e=>{ e.stopPropagation(); selectWantedMob(m,it.innerText) }; it.onmouseenter=()=>it.style.background="rgb(60,35,5)"; it.onmouseleave=()=>it.style.background=""; dd.appendChild(it) }) }; const r=el.getBoundingClientRect(); dd.style.position="fixed"; dd.style.top=(r.bottom+2)+"px"; dd.style.left=r.left+"px"; dd.style.width=r.width+"px"; dd.style.display="block" }
function selectWantedMob(val, lbl) { const btn=document.getElementById("wantedMobBtn"); if(btn){ btn.innerText=lbl; btn.dataset.value=val }; const dd=document.getElementById("wantedMobDropdown"); if(dd) dd.style.display="none" }
function toggleWantedTierDropdown(el) { const dd=document.getElementById("wantedTierDropdown"); if(!dd) return; if(dd.style.display!=="none"){ dd.style.display="none"; return }; const r=el.getBoundingClientRect(); dd.style.position="fixed"; dd.style.top=(r.bottom+2)+"px"; dd.style.left=r.left+"px"; dd.style.width=r.width+"px"; dd.style.display="block" }
function selectWantedTier(val, lbl) { const btn=document.getElementById("wantedTierBtn"); if(btn){ btn.innerText=lbl; btn.dataset.value=val }; const dd=document.getElementById("wantedTierDropdown"); if(dd) dd.style.display="none"; const rw=WANTED_REWARDS[val]||WANTED_REWARDS.weak, ri=document.getElementById("wantedReward"); if(ri) ri.value=rw[Math.floor(Math.random()*rw.length)] }

/* ========================= */
/* ========================= */
/* SORT CIMETIÃˆRE            */
/* ========================= */

function startSpellAura() { if(document.getElementById("spellAura")) return; const a=document.createElement("div"); a.id="spellAura"; a.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5000;opacity:0;transition:opacity 2s ease;"; const v=document.createElement("div"); v.style.cssText="position:absolute;top:0;left:0;width:100%;height:100%;box-shadow:inset 0 0 80px rgba(150,0,255,0.5);animation:spellPulse 2s ease-in-out infinite alternate;"; a.appendChild(v); document.body.appendChild(a); setTimeout(()=>a.style.opacity="1",50) }
function stopSpellAura() { const a=document.getElementById("spellAura"); if(!a) return; a.style.transition="opacity 1.5s ease"; a.style.opacity="0"; setTimeout(()=>{ if(a.parentNode) a.remove() },1500) }

function triggerCemeteryEvent() {
  if(cemeteryEventDone) return; cemeteryEventDone=true
  const g=document.createElement("div"); g.id="glipheOverlay"; g.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;z-index:99999990;opacity:0;transition:opacity 1s ease;"; const img=document.createElement("img"); img.src="images/gliphe.png"; img.style.cssText="max-height:70vh;max-width:70vw;object-fit:contain;filter:drop-shadow(0 0 30px purple);"; g.appendChild(img); document.body.appendChild(g); setTimeout(()=>g.style.opacity="1",50)
  db.ref("game/cemeterySpell").set({ active:true, time:Date.now() })
  const spell=new Audio("audio/spell.mp3"); setManagedAudioBaseVolume(spell,0.9); spell.play().catch(()=>{}); const tremb=new Audio("audio/tremblement.mp3"); setManagedAudioBaseVolume(tremb,0.7); tremb.play().catch(()=>{})
  screenShakeHard(); setTimeout(()=>screenShakeHard(),400); setTimeout(()=>screenShake(),900)
  const launch = () => {
    g.style.opacity = "0"
    startSpellAura()
    stopAllMusic()
    setTimeout(() => {
      let p = document.getElementById("sortPrisonMusic")
      if (!p) {
        p = document.createElement("audio")
        p.id = "sortPrisonMusic"; p.loop = true
        p.src = "audio/sortprison.mp3"; p.volume = 0
        document.body.appendChild(p)
      }
      p.currentTime = 0; p.volume = 0; p.play().catch(() => {})
      let iv = setInterval(() => {
        if (p.volume < 0.75) p.volume = Math.min(0.75, p.volume + 0.04)
        else clearInterval(iv)
      }, 100)
    }, 300)
    setTimeout(() => {
      if (g.parentNode) g.remove()
      db.ref("game/cemeterySpell").update({ glipheShown: true, turnIdx: 0, tries: {}, freed_players: [], freed: false })
    }, 800)
  }
  spell.onended = () => setTimeout(launch, 500)
  setTimeout(() => { if (document.getElementById("glipheOverlay")) launch() }, 10000)
}

function renderSpellDiceGame(data) {
  const ex=document.getElementById("spellMiniGame"); if(ex) ex.remove()
  const tries=data.tries||{}, freed=data.freed_players||[], turnIdx=data.turnIdx||0
  let realCur=SPELL_PLAYERS.filter(p=>!freed.includes(p))[0]||SPELL_PLAYERS[0]
  for(let i=0;i<SPELL_PLAYERS.length;i++){ const p=SPELL_PLAYERS[(turnIdx+i)%SPELL_PLAYERS.length]; if(!freed.includes(p)){ realCur=p; break } }
  const ov=document.createElement("div"); ov.id="spellMiniGame"; ov.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999990;opacity:0;transition:opacity 0.8s ease;overflow:hidden;background:rgba(10,0,18,0.92);"
  const ttl=document.createElement("div"); ttl.style.cssText="position:relative;z-index:1;font-family:'Cinzel Decorative',serif;font-size:22px;color:#dd66ff;letter-spacing:5px;text-shadow:0 0 30px #aa00ff;text-align:center;margin-bottom:8px;"; ttl.innerText="â›§  SORT D'EMPRISONNEMENT  â›§"; ov.appendChild(ttl)
  const sub=document.createElement("div"); sub.style.cssText="position:relative;z-index:1;font-family:'IM Fell English',serif;font-size:14px;color:#9944cc;font-style:italic;margin-bottom:28px;text-align:center;"; sub.innerText="Lancez un D20 â€” seul un coup critique peut briser les chaÃ®nes..."; ov.appendChild(sub)
  const sr=document.createElement("div"); sr.style.cssText="position:relative;z-index:1;display:flex;gap:20px;margin-bottom:28px;flex-wrap:wrap;justify-content:center;"
  SPELL_PLAYERS.forEach(pid=>{ const t=tries[pid]||0,iF=freed.includes(pid),isOut=t>=SPELL_MAX_TRIES&&!iF,isCur=pid===realCur&&!iF; const card=document.createElement("div"); card.style.cssText=`display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 20px;border-radius:10px;border:2px solid ${iF?"#44ff44":isOut?"#ff4444":isCur?"#cc44ff":"rgba(150,0,255,0.4)"};background:${isCur?"rgba(120,0,180,0.3)":"rgba(0,0,0,0.3)"};min-width:100px;text-align:center;`; const n=document.createElement("div"); n.style.cssText=`font-family:Cinzel,serif;font-size:13px;letter-spacing:2px;color:${iF?"#44ff44":isOut?"#ff6666":isCur?"#dd88ff":"#9955cc"};`; n.innerText=(iF?"âœ“ ":isOut?"âœ• ":isCur?"â–¶ ":"")+pid.toUpperCase(); card.appendChild(n); const dr=document.createElement("div"); dr.style.cssText="display:flex;gap:4px;"; for(let i=0;i<SPELL_MAX_TRIES;i++){ const d=document.createElement("div"); d.style.cssText="width:12px;height:12px;border-radius:2px;border:1px solid rgba(150,0,255,0.5);background:"+(i<t?(iF?"#44ff44":"rgba(180,0,80,0.6)"):"transparent")+";"; dr.appendChild(d) }; card.appendChild(dr); sr.appendChild(card) })
  ov.appendChild(sr)
  if(myToken&&myToken.id===realCur&&!freed.includes(myToken.id)){ const t=tries[myToken.id]||0; if(t<SPELL_MAX_TRIES){ const rb=document.createElement("div"); rb.id="spellRollBtn"; rb.style.cssText="position:relative;z-index:1;width:120px;height:120px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 40% 35%,rgba(180,0,255,0.6),rgba(80,0,150,0.3));border:3px solid rgba(200,50,255,0.8);box-shadow:0 0 30px rgba(180,0,255,0.5);cursor:pointer;margin-bottom:16px;animation:bifrostPulse 2s ease-in-out infinite alternate;"; rb.innerHTML=`<span style="font-size:36px;">ðŸŽ²</span><span style="font-family:Cinzel,serif;font-size:11px;color:#cc88ff;letter-spacing:2px;margin-top:4px;">LANCER D20</span>`; rb.onclick=()=>rollSpellDice(myToken.id,t); ov.appendChild(rb); const h=document.createElement("div"); h.style.cssText="position:relative;z-index:1;font-family:Cinzel,serif;font-size:11px;color:#7733aa;font-style:italic;"; h.innerText=`Essai ${t+1} / ${SPELL_MAX_TRIES}`; ov.appendChild(h) } else { const out=document.createElement("div"); out.style.cssText="position:relative;z-index:1;font-family:Cinzel,serif;font-size:14px;color:#ff6666;text-shadow:0 0 10px red;"; out.innerText="âœ• Vos essais sont Ã©puisÃ©s..."; ov.appendChild(out) } }
  else if(myToken&&!freed.includes(myToken.id)){ const w=document.createElement("div"); w.style.cssText="position:relative;z-index:1;font-family:'IM Fell English',serif;font-size:14px;color:#9944cc;font-style:italic;"; w.innerText=`âœ¦ Au tour de ${realCur.toUpperCase()} de briser son sort... âœ¦`; ov.appendChild(w) }
  else if(myToken&&freed.includes(myToken.id)){ const d=document.createElement("div"); d.style.cssText="position:relative;z-index:1;font-family:Cinzel,serif;font-size:15px;color:#44ff44;text-shadow:0 0 10px lime;"; d.innerText="âœ“ Vous Ãªtes libÃ©rÃ© â€” attendez les autres..."; ov.appendChild(d) }
  if(isGM){ const gr=document.createElement("div"); gr.style.cssText="position:relative;z-index:1;display:flex;gap:8px;margin-top:16px;"; const lb=document.createElement("button"); lb.innerText="ðŸ”“ LibÃ©rer"; lb.style.cssText="padding:8px 18px;font-family:Cinzel,serif;font-size:12px;background:rgba(20,80,20,0.5);color:#88ff88;border:1px solid rgba(50,180,50,0.5);border-radius:4px;cursor:pointer;"; lb.onclick=()=>db.ref("game/cemeterySpell").update({ freed:true }); gr.appendChild(lb); ov.appendChild(gr) }
  document.body.appendChild(ov); setTimeout(()=>ov.style.opacity="1",50)
}

function rollSpellDice(playerId, currentTries) {
  const btn=document.getElementById("spellRollBtn"); if(btn) btn.style.pointerEvents="none"
  const roll=Math.floor(Math.random()*20)+1, isCrit=roll===20, isFail=roll===1
  showSpellRollResult(roll,isCrit,isFail,playerId,()=>{
    const newTries=currentTries+1
    if(isCrit){ db.ref("game/cemeterySpell/freed_players").once("value",s=>{ const fp=s.val()||[]; if(!fp.includes(playerId)) fp.push(playerId); db.ref("game/cemeterySpell/freed_players").set(fp); const next=(SPELL_PLAYERS.indexOf(playerId)+1)%SPELL_PLAYERS.length; db.ref("game/cemeterySpell/turnIdx").set(next); db.ref("game/cemeterySpell").once("value",snap=>{ const d=snap.val(); if(SPELL_PLAYERS.every(p=>(d.freed_players||[]).includes(p))) setTimeout(()=>db.ref("game/cemeterySpell").update({ freed:true }),1000) }) }) }
    else{ db.ref("game/cemeterySpell/tries").once("value",s=>{ const t=s.val()||{}; t[playerId]=newTries; db.ref("game/cemeterySpell/tries").set(t); if(isFail){ db.ref("characters/"+playerId).once("value",cs=>{ const cd=cs.val(); if(cd){ db.ref("characters/"+playerId+"/hp").set(Math.max(0,(cd.hp||0)-10)); showNotification("ðŸ’€ "+playerId.toUpperCase()+" perd 10 HP !") } }) }; const next=(SPELL_PLAYERS.indexOf(playerId)+1)%SPELL_PLAYERS.length; db.ref("game/cemeterySpell/turnIdx").set(next); if(newTries>=SPELL_MAX_TRIES){ setTimeout(()=>{ db.ref("game/cemeterySpell").once("value",snap=>{ const d=snap.val(); if(!d) return; const t2=d.tries||{}; const fp=d.freed_players||[]; const allOut=SPELL_PLAYERS.every(p=>fp.includes(p)||(t2[p]||0)>=SPELL_MAX_TRIES); if(allOut){ const anyF=SPELL_PLAYERS.some(p=>fp.includes(p)); if(!anyF&&isGM){ db.ref("game/cemeterySpell").update({ freed:true, failedByZombie:true }); setTimeout(()=>startCombat(Math.random()>0.5?"zombie":"zombie2","high"),2000) } else db.ref("game/cemeterySpell").update({ freed:true, failedByZombie:false }) } }) },500) } }) }
  })
}

function showSpellRollResult(roll, isCrit, isFail, playerId, cb) {
  const res=document.createElement("div"); res.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999999;text-align:center;pointer-events:none;font-family:'Cinzel Decorative',serif;"
  const color=isCrit?"#44ff44":isFail?"#ff4444":"#cc88ff"
  res.innerHTML=`<div style="font-size:48px;margin-bottom:8px;">${roll}</div><div style="font-size:24px;color:${color};text-shadow:0 0 20px ${color};letter-spacing:3px;">${isCrit?"âš¡ CRITIQUE ! âš¡":isFail?"ðŸ’€ Ã‰CHEC CRITIQUE":`D20 : ${roll}`}</div><div style="font-size:14px;color:${color};opacity:0.8;margin-top:6px;font-family:Cinzel,serif;">${isCrit?"Sort brisÃ© !":isFail?"-10 HP":"Pas assez..."}</div>`
  document.body.appendChild(res); if(isCrit){ flashGold(); flashGold(); screenShake() }; if(isFail) screenShakeHard()
  setTimeout(()=>{ res.style.transition="opacity 0.8s"; res.style.opacity="0"; setTimeout(()=>{ res.remove(); if(cb) cb() },800) },2500)
}

function showSpellFreed() {
  stopSpellAura(); stopSpecialMusic('sortPrisonMusic')
  setTimeout(()=>{ if(currentMap&&mapMusic[currentMap]) crossfadeMusic(mapMusic[currentMap]) },1000)
  playSound("powerSound",0.8); flashGold(); flashGold(); screenShakeHard(); powerExplosion()
  const msg=document.createElement("div"); msg.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel Decorative',serif;font-size:36px;color:#cc88ff;text-shadow:0 0 30px purple;text-align:center;z-index:99999999;pointer-events:none;"
  const msgTitle = document.createElement("div")
  msgTitle.innerText = "âš¡ SORT BRISÃ‰ âš¡"
  const msgSub = document.createElement("span")
  msgSub.style.cssText = "font-size:18px;color:#aa66ff;"
  msgSub.innerText = "Les hÃ©ros sont libÃ©rÃ©s !"
  msg.appendChild(msgTitle)
  msg.appendChild(msgSub)
  document.body.appendChild(msg)
  setTimeout(()=>{ msg.style.transition="opacity 1s"; msg.style.opacity="0"; setTimeout(()=>msg.remove(),1000) },4000)
}

/* ========================= */
/* AIDE RACCOURCIS MJ        */
/* ========================= */

function toggleGMShortcutHelp() {
  const existing = document.getElementById("gmShortcutHelp")
  if (existing) { existing.remove(); return }

  const overlay = document.createElement("div")
  overlay.id = "gmShortcutHelp"
  overlay.style.cssText = `
    position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    background:rgba(8,20,24,0.97);
    border:1px solid #1e5a66;
    box-shadow:0 0 0 1px #8a6520,0 0 30px rgba(0,0,0,0.9);
    border-radius:3px;padding:16px 20px;
    font-family:Cinzel,serif;
    z-index:999999999;pointer-events:auto;
    display:flex;flex-direction:column;gap:6px;
    min-width:280px;
    animation:shortcutFadeIn 0.15s ease;
  `

  const title = document.createElement("div")
  title.style.cssText = "font-size:10px;letter-spacing:3px;color:#1e8a9a;margin-bottom:8px;border-bottom:1px solid rgba(30,90,102,0.3);padding-bottom:6px;"
  title.innerText = "RACCOURCIS MJ"
  overlay.appendChild(title)

  const shortcuts = [
    { key:"M",   label:"Maps" },
    { key:"P",   label:"Personnages" },
    { key:"R",   label:"PNJ / High PNJ" },
    { key:"T",   label:"Mobs / PNJ Combat" },
    { key:"X",   label:"XP" },
    { key:"E",   label:"Ã‰lÃ©ments" },
    { key:"S",   label:"Sauvegarder" },
    { key:"J",   label:"Fiche joueur sÃ©lectionnÃ©" },
    { key:"B",   label:"Fiche joueur 4" },
    { key:"Esc", label:"Fermer / Retour" },
    { key:"?",   label:"Cette aide" },
  ]

  shortcuts.forEach(({ key, label }) => {
    const row = document.createElement("div")
    row.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:24px;"
    const labelEl = document.createElement("span")
    labelEl.style.cssText = "font-size:12px;color:#a0c8d0;"
    labelEl.innerText = label
    const keyEl = document.createElement("span")
    keyEl.style.cssText = "background:rgba(15,42,48,0.9);border:1px solid #2e6a78;border-radius:3px;font-size:11px;color:#5a9aaa;padding:2px 8px;min-width:28px;text-align:center;"
    keyEl.innerText = key
    row.appendChild(labelEl)
    row.appendChild(keyEl)
    overlay.appendChild(row)
  })

  // Fermeture au clic extÃ©rieur
  setTimeout(() => {
    document.addEventListener("mousedown", function close(ev) {
      if (!overlay.contains(ev.target)) { overlay.remove(); document.removeEventListener("mousedown", close) }
    })
  }, 50)

  document.body.appendChild(overlay)
}

// Injection style animation
;(function() {
  if (document.getElementById("gmShortcutStyle")) return
  const s = document.createElement("style")
  s.id = "gmShortcutStyle"
  s.textContent = `@keyframes shortcutFadeIn { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`
  document.head.appendChild(s)
})()


/* ========================= */
/* PNJ ALLIÃ‰S â€” INVOCATION   */
/* ========================= */

function openAllyPNJPanel() {
  if (!isGM || !combatActive) return
  // Uniquement en combat de world boss
  const worldBosses = ["balraug","fenrir","jormungand","kraken","nhiddog","roi","odin","thor","freya"]
  if (!worldBosses.includes(currentMob)) {
    showNotification("âš  Les divinitÃ©s n'interviennent que lors des combats de World Boss !")
    return
  }
  const existing = document.getElementById("allyPNJPanel")
  if (existing) {
    existing.remove()
    return
  }
  const panel = document.createElement("div"); panel.id = "allyPNJPanel"
  panel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(8,20,24,0.97);border:1px solid #1e5a66;box-shadow:0 0 0 1px #8a6520,0 0 40px rgba(0,0,0,0.9);border-radius:3px;padding:16px;z-index:99999999;min-width:380px;max-width:92vw;max-height:82vh;overflow-y:auto;font-family:Cinzel,serif;"

  const title = document.createElement("div"); title.style.cssText = "font-size:11px;letter-spacing:3px;color:#1e8a9a;margin-bottom:12px;border-bottom:1px solid rgba(30,90,102,0.3);padding-bottom:8px;display:flex;justify-content:space-between;align-items:center;"
  const titleText = document.createElement("span")
  titleText.innerText = "âš” INVOQUER UNE DIVINITÃ‰"
  const titleClose = document.createElement("span")
  titleClose.style.cssText = "cursor:pointer;color:#ff8888;font-size:14px;"
  titleClose.innerText = "âœ•"
  titleClose.onclick = () => {
    const panelEl = document.getElementById("allyPNJPanel")
    if (panelEl) panelEl.remove()
  }
  title.appendChild(titleText)
  title.appendChild(titleClose)
  panel.appendChild(title)

  db.ref("combat/usedAllies").once("value", snap => {
    const used = snap.val() || {}
    ALLY_PNJS.forEach(pnj => {
      const block = document.createElement("div"); block.style.cssText = "margin-bottom:14px;border-bottom:1px solid rgba(30,90,102,0.15);padding-bottom:12px;"
      const header = document.createElement("div"); header.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:8px;"
      const img = document.createElement("img"); img.src = "images/"+pnj.image; img.style.cssText = `width:40px;height:40px;border-radius:50%;border:2px solid ${pnj.color};object-fit:contain;box-shadow:0 0 10px ${pnj.color}44;`; img.onerror=()=>img.style.opacity="0.3"
      const info = document.createElement("div")
      const infoName = document.createElement("div")
      infoName.style.cssText = `font-size:14px;color:${pnj.color};letter-spacing:2px;text-shadow:0 0 8px ${pnj.color}88;`
      infoName.innerText = pnj.name
      const infoRole = document.createElement("div")
      infoRole.style.cssText = "font-size:10px;color:#5a9aaa;"
      infoRole.innerText = pnj.role
      info.appendChild(infoName)
      info.appendChild(infoRole)
      header.appendChild(img); header.appendChild(info); block.appendChild(header)

      pnj.actions.forEach(action => {
        const isUsed = !!used[action.id]
        const typeColors = { damage:"#ff7777", heal:"#77ff99", malus:"#ffaa44", buff:"#88aaff" }
        const typeLabels = { damage:"ATQ", heal:"SOIN", malus:"MALUS", buff:"BUFF" }
        const btn = document.createElement("div")
        btn.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:5px;border-radius:2px;border:1px solid ${isUsed?"rgba(30,90,102,0.15)":pnj.color+"55"};background:${isUsed?"rgba(5,15,20,0.3)":`rgba(8,20,24,0.9)`};cursor:${isUsed?"not-allowed":"pointer"};opacity:${isUsed?"0.4":"1"};transition:background 0.15s;`
        const iconEl = document.createElement("span")
        iconEl.style.fontSize = "20px"
        iconEl.innerText = action.icon
        const center = document.createElement("div")
        center.style.flex = "1"
        const labelEl = document.createElement("div")
        labelEl.style.cssText = `font-size:12px;color:${isUsed?"#444":pnj.color};letter-spacing:1px;`
        labelEl.innerText = action.label
        if (action.dice) {
          const diceEl = document.createElement("span")
          diceEl.style.cssText = "color:#8888ff;font-size:10px;"
          diceEl.innerText = " (D" + action.dice + ")"
          labelEl.appendChild(diceEl)
        }
        const descEl = document.createElement("div")
        descEl.style.cssText = "font-size:10px;color:#5a7a8a;margin-top:2px;"
        descEl.innerText = action.desc
        center.appendChild(labelEl)
        center.appendChild(descEl)
        const badge = document.createElement("span")
        badge.style.cssText = `font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(30,90,102,0.2);color:${typeColors[action.type]};letter-spacing:1px;`
        badge.innerText = isUsed ? "UTILISÃ‰" : typeLabels[action.type]
        btn.appendChild(iconEl)
        btn.appendChild(center)
        btn.appendChild(badge)
        if (!isUsed) {
          btn.onmouseenter=()=>btn.style.background=`rgba(20,40,52,0.95)`
          btn.onmouseleave=()=>btn.style.background=`rgba(8,20,24,0.9)`
          btn.onclick=()=>triggerAllyAction(pnj, action, panel)

          const grantBtn = document.createElement("button")
          grantBtn.innerText = "Donner"
          grantBtn.style.cssText = "padding:5px 8px;font-family:Cinzel,serif;font-size:10px;background:rgba(70,20,90,0.75);color:#f0d0ff;border:1px solid rgba(180,120,255,0.45);border-radius:3px;cursor:pointer;margin-left:6px;white-space:nowrap;"
          grantBtn.onclick = e => {
            e.stopPropagation()
            grantAllyActionToPlayers(pnj, action)
          }
          btn.appendChild(grantBtn)
        }
        block.appendChild(btn)
      })
      panel.appendChild(block)
    })
    document.body.appendChild(panel)
  })
}

function triggerAllyAction(pnj, action, panel) {
  if (!isGM && myToken && (action.type === "heal" || action.type === "buff")) {
    _executeAllyAction(pnj, action, myToken.id, panel)
    return
  }
  if (action.type === "heal" || action.type === "buff") { _allyChooseTarget(pnj, action, panel); return }
  _executeAllyAction(pnj, action, null, panel)
}

function _allyChooseTarget(pnj, action, panel) {
  const picker = document.createElement("div"); picker.id = "allyTargetPicker"
  picker.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(8,20,24,0.98);border:1px solid "+pnj.color+";border-radius:3px;padding:16px;z-index:999999999;font-family:Cinzel,serif;min-width:220px;"
  const pickerTitle = document.createElement("div")
  pickerTitle.style.cssText = `font-size:11px;color:${pnj.color};letter-spacing:2px;margin-bottom:12px;`
  pickerTitle.innerText = "CHOISIR LA CIBLE"
  picker.appendChild(pickerTitle)
  ;["greg","ju","elo","bibi"].forEach(pid => {
    const btn = document.createElement("button"); btn.style.cssText = "display:block;width:100%;padding:8px;margin-bottom:6px;font-family:Cinzel,serif;font-size:12px;background:rgba(10,30,38,0.8);color:#e0f0f4;border:1px solid rgba(30,90,102,0.5);border-radius:2px;cursor:pointer;text-align:left;"
    const img = document.createElement("img")
    img.src = "images/" + sanitizeAssetName(pid + ".png")
    img.style.cssText = "width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:8px;"
    btn.appendChild(img)
    btn.appendChild(document.createTextNode(pid.toUpperCase()))
    btn.onclick=()=>{ picker.remove(); _executeAllyAction(pnj, action, pid, panel) }
    picker.appendChild(btn)
  })
  const cancel = document.createElement("button"); cancel.style.cssText = "display:block;width:100%;padding:6px;font-family:Cinzel,serif;font-size:11px;background:rgba(80,20,20,0.4);color:#ff8888;border:1px solid rgba(180,40,40,0.4);border-radius:2px;cursor:pointer;"
  cancel.innerText = "âœ• Annuler"; cancel.onclick=()=>picker.remove(); picker.appendChild(cancel)
  document.body.appendChild(picker)
}

function _executeAllyAction(pnj, action, targetId, panel) {
  db.ref("combat/usedAllies/"+action.id).set(true)
  db.ref("game/playerAllyAccess").remove()
  if (panel) panel.remove()
  _allyInvocationCinematic(pnj, action, targetId)
}

function _allyInvocationCinematic(pnj, action, targetId) {
  // Ã‰TAPE 1 â€” Tremblement + flash
  screenShakeHard()
  setTimeout(()=>screenShakeHard(), 300)
  const flash = document.createElement("div"); flash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:white;opacity:0;pointer-events:none;z-index:999999990;transition:opacity 0.05s;"
  document.body.appendChild(flash)
  setTimeout(()=>{ flash.style.opacity="0.7"; setTimeout(()=>{ flash.style.transition="opacity 0.4s"; flash.style.opacity="0"; setTimeout(()=>flash.remove(),400) },80) },50)

  // Ã‰TAPE 2 â€” Image du dieu + message solennel (aprÃ¨s 600ms)
  setTimeout(()=>{
    const cinScreen = document.createElement("div"); cinScreen.id = "allyCinScreen"
    cinScreen.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999999995;opacity:0;transition:opacity 0.6s ease;`

    // Image du dieu
    const img = document.createElement("img"); img.src = "images/"+pnj.image
    img.style.cssText = `max-height:45vh;object-fit:contain;filter:drop-shadow(0 0 30px ${pnj.color});opacity:0;transition:opacity 0.8s ease;margin-bottom:30px;`
    cinScreen.appendChild(img)

    // Nom du dieu
    const nameEl = document.createElement("div")
    nameEl.style.cssText = `font-family:'Cinzel Decorative','Cinzel',serif;font-size:36px;color:${pnj.color};letter-spacing:8px;text-shadow:0 0 20px ${pnj.color};opacity:0;transition:opacity 0.8s ease 0.3s;margin-bottom:14px;`
    nameEl.innerText = pnj.name.toUpperCase()
    cinScreen.appendChild(nameEl)

    // Message invocation
    const msgEl = document.createElement("div")
    msgEl.style.cssText = `font-family:'IM Fell English',serif;font-size:18px;color:rgba(220,210,255,0.85);font-style:italic;letter-spacing:2px;opacity:0;transition:opacity 0.8s ease 0.6s;text-align:center;max-width:500px;padding:0 20px;`
    msgEl.innerText = action.dialogue
    cinScreen.appendChild(msgEl)

    document.body.appendChild(cinScreen)

    // Son impact â€” fade out aprÃ¨s 2s
    const impact = new Audio("audio/impact.mp3"); setManagedAudioBaseVolume(impact, 0.85); impact.play().catch(()=>{})
    setTimeout(()=>{ let iv=setInterval(()=>{ if(impact.volume>0.05) impact.volume=Math.max(0,impact.volume-0.06); else{ impact.pause(); clearInterval(iv) } },100) }, 2000)

    setTimeout(()=>{
      cinScreen.style.opacity = "1"
      setTimeout(()=>{ img.style.opacity="1"; nameEl.style.opacity="1"; msgEl.style.opacity="1" }, 50)
    }, 20)

    // Ã‰TAPE 3 â€” AprÃ¨s 4s, lancer le dÃ©
    setTimeout(()=>{
      cinScreen.style.opacity = "0"
      setTimeout(()=>{ cinScreen.remove(); _rollAllyDice(pnj, action, targetId) }, 600)
    }, 4000)
  }, 600)
}

function _rollAllyDice(pnj, action, targetId) {
  const diceOverlay = document.createElement("div"); diceOverlay.id = "allyDiceOverlay"
  diceOverlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.82);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999999996;opacity:0;transition:opacity 0.4s;`
  diceOverlay.innerHTML = `
    <div style="font-family:'Cinzel Decorative',Cinzel,serif;font-size:12px;color:${pnj.color};letter-spacing:5px;margin-bottom:24px;opacity:0.8;">${action.label.toUpperCase()}</div>
    <div id="allyDiceNum" style="font-family:'Cinzel',serif;font-size:110px;font-weight:bold;color:${pnj.color};text-shadow:0 0 40px ${pnj.color}88;min-width:180px;text-align:center;transition:all 0.08s;">?</div>
    <div style="font-size:14px;color:#6a8a9a;margin-top:12px;letter-spacing:3px;">D${action.dice}</div>
  `
  document.body.appendChild(diceOverlay)
  setTimeout(()=>diceOverlay.style.opacity="1", 20)

  // Roulade identique Ã  celle des joueurs
  let spins = 0; const maxSpins = 16
  const spinIv = setInterval(()=>{
    spins++
    const el = document.getElementById("allyDiceNum"); if (!el) return
    el.innerText = Math.floor(Math.random()*action.dice)+1
    if (spins >= maxSpins) {
      clearInterval(spinIv)
      const roll = Math.floor(Math.random()*action.dice)+1
      el.innerText = roll
      el.style.fontSize = "140px"

      // Son diceinv.mp3
      const diceInv = new Audio("audio/diceinv.mp3"); setManagedAudioBaseVolume(diceInv, 0.85); diceInv.play().catch(()=>{})
      setTimeout(()=>{ let iv=setInterval(()=>{ if(diceInv.volume>0.05) diceInv.volume=Math.max(0,diceInv.volume-0.05); else{ diceInv.pause(); clearInterval(iv) } },100) }, 3000)

      // Son crit/fail UNIQUEMENT selon rÃ©sultat, aprÃ¨s 400ms
      setTimeout(()=>{
        if (roll === action.dice) playSound("critSound", 0.8)
        else if (roll === 1) playSound("failSound", 0.8)
      }, 400)

      // Fermer aprÃ¨s 2s puis appliquer
      setTimeout(()=>{
        diceOverlay.style.opacity = "0"
        setTimeout(()=>{ diceOverlay.remove(); _applyAllyResult(pnj, action, roll, targetId) }, 400)
      }, 2000)
    }
  }, 90)
}

function _applyAllyResult(pnj, action, roll, targetId) {
  const isCrit = roll === action.dice
  const isFail = roll === 1

  // Animation solennelle
  _playAllyAnim(action.anim, pnj.color, isCrit)

  // RÃ©sultat Ã  l'Ã©cran
  setTimeout(()=>{
    const resultEl = document.createElement("div")
    resultEl.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Cinzel Decorative',Cinzel,serif;font-size:${isCrit?"42px":"28px"};color:${isCrit?"gold":isFail?"#ff6666":pnj.color};text-shadow:0 0 20px ${isCrit?"gold":isFail?"red":pnj.color};text-align:center;pointer-events:none;z-index:99999999;opacity:0;transition:opacity 0.5s ease;`
    resultEl.innerText = isCrit ? "âœ¦ PUISSANCE DIVINE âœ¦" : isFail ? "âœ¦ RÃ‰SISTANCE âœ¦" : ""
    if (resultEl.innerText) {
      document.body.appendChild(resultEl)
      setTimeout(()=>resultEl.style.opacity="1",20)
      setTimeout(()=>{ resultEl.style.opacity="0"; setTimeout(()=>resultEl.remove(),500) },3000)
    }
  }, 200)

  // Appliquer l'effet selon le type
  setTimeout(()=>{
    if (action.type==="damage") {
      let dmg = action.dmgBase + Math.floor(roll * action.dmgBonus)
      if (isCrit && action.critMult) dmg *= action.critMult
      if (isFail) dmg = Math.floor(dmg * 0.2)
      dmg = Math.max(1, Math.round(dmg))
      // Frappe en chaÃ®ne (Thor) â€” sinon mob principal uniquement
      const slots = action.chainMin && roll >= action.chainMin ? ["mob","mob2","mob3"] : ["mob"]
      let applied = false
      slots.forEach(slot => {
        db.ref("combat/"+slot).once("value", s => {
          const mobData = s.val()
          if (!mobData || mobData.hp === undefined) return
          if (typeof applyDamageToCombatMob === "function") applyDamageToCombatMob(dmg, slot)
          else {
            const newHP = Math.max(0, mobData.hp - dmg)
            db.ref("combat/"+slot+"/hp").set(newHP)
          }
          applied = true
        })
      })
      const chainTxt = slots.length > 1 ? " (frappe en chaÃ®ne !)" : ""
      addMJLog(`${action.icon} ${pnj.name} â€” ${action.label} (D${action.dice}=${roll}) : ${dmg} dÃ©gÃ¢ts${chainTxt}${isCrit?" âœ¨ CRITIQUE":""}`)
      showNotification(`${action.icon} ${pnj.name} : ${dmg} dÃ©gÃ¢ts !${isCrit?" CRITIQUE !":""}`)
      flashRed(); if(isCrit){ screenShakeHard(); flashRed() } else screenShake()
    }
    else if (action.type==="heal" && targetId) {
      const healAmt = action.healMult ? roll*action.healMult : action.healAmt||roll
      db.ref("characters/"+targetId+"/hp").once("value",s=>{ db.ref("characters/"+targetId+"/hp").set(Math.min(300,(s.val()||0)+healAmt)) })
      addMJLog(`${action.icon} ${pnj.name} â€” ${action.label} (D${action.dice}=${roll}) : +${healAmt} HP Ã  ${targetId.toUpperCase()}`)
      showNotification(`${action.icon} ${pnj.name} soigne ${targetId.toUpperCase()} de ${healAmt} HP !`)
      flashGold(); if(isCrit){ powerExplosion(); flashGold() }
    }
    else if (action.type==="malus") {
      const success = roll >= (action.threshold||10)
      if (success) {
        db.ref("combat/mob/malus").set({ label:action.label, source:pnj.name, roll, time:Date.now() })
        setTimeout(()=>db.ref("combat/mob/malus").remove(), 12000)
        addMJLog(`${action.icon} ${pnj.name} â€” ${action.label} (D${action.dice}=${roll}) : succÃ¨s !`)
        showNotification(`${action.icon} ${pnj.name} affaiblit l'ennemi !`)
        screenShake()
      } else {
        addMJLog(`${action.icon} ${pnj.name} â€” ${action.label} (D${action.dice}=${roll}) : rÃ©sistance de l'ennemi`)
        showNotification(`${action.icon} ${pnj.name} : rÃ©sistance de l'ennemi...`)
      }
    }
    else if (action.type==="buff" && targetId) {
      const buffAmt = action.buffMult ? roll*action.buffMult : roll
      const mainStats = { greg:"force", ju:"perspi", elo:"charme" }
      const stat = mainStats[targetId]||"force"
      db.ref("characters/"+targetId+"/"+stat).once("value",s=>{ db.ref("characters/"+targetId+"/"+stat).set((s.val()||0)+buffAmt) })
      addMJLog(`${action.icon} ${pnj.name} â€” ${action.label} (D${action.dice}=${roll}) : +${buffAmt} ${stat} Ã  ${targetId.toUpperCase()}`)
      showNotification(`${action.icon} ${pnj.name} : +${buffAmt} ${stat} Ã  ${targetId.toUpperCase()} !`)
      flashGold(); powerExplosion()
    }
  }, 800)

  // Cleanup
  setTimeout(()=>{
    db.ref("game/storyImage").remove()
    db.ref("game/highPNJName").remove()
    db.ref("game/allyAction").remove()
  }, 7000)
}

function _playAllyAnim(animType, color, isCrit) {
  // Animation solennelle â€” voile colorÃ© + particules lentes
  const overlay = document.createElement("div"); overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999990;opacity:0;transition:opacity 1.5s ease;`
  document.body.appendChild(overlay)

  // Voile de couleur discret
  const veil = document.createElement("div"); veil.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(ellipse at center, ${color}18 0%, transparent 70%);`
  overlay.appendChild(veil)

  // Particules lentes et rares
  const count = isCrit ? 12 : 6
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div")
    const size = 3 + Math.random() * 5
    p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${color};left:${10+Math.random()*80}%;top:${20+Math.random()*60}%;opacity:0;animation:allyParticle ${2+Math.random()*2}s ease-out ${Math.random()*1.5}s forwards;`
    overlay.appendChild(p)
  }

  // Ligne horizontale solennelle
  const line = document.createElement("div"); line.style.cssText = `position:absolute;top:50%;left:0;width:100%;height:1px;background:linear-gradient(90deg,transparent,${color}66,transparent);transform:scaleX(0);transition:transform 1.2s ease;transform-origin:center;`
  overlay.appendChild(line)

  setTimeout(() => { overlay.style.opacity = "1"; line.style.transform = "scaleX(1)" }, 20)
  if (isCrit) { flashGold(); screenShakeHard() } else screenShake()
  setTimeout(() => { overlay.style.transition = "opacity 2s ease"; overlay.style.opacity = "0"; setTimeout(() => overlay.remove(), 2000) }, isCrit ? 3500 : 2500)
}

;(function(){
  if (document.getElementById("allyAnimStyle")) return
  const s = document.createElement("style"); s.id = "allyAnimStyle"
  s.textContent = `@keyframes allyParticle { 0%{opacity:0;transform:translateY(0) scale(0.5)} 20%{opacity:0.9} 100%{opacity:0;transform:translateY(-80px) scale(1.2)} }`
  document.head.appendChild(s)
})()

/* ========================= */
/* VUE LECTURE SEULE JOUEUR  */
/* ========================= */

function openAllyPNJViewer() {
  const existing = document.getElementById("allyViewerPanel"); if (existing) { existing.remove(); return }
  db.ref("game/playerAllyAccess").once("value", snap => {
    const access = snap.val()
    if (!access) {
      showNotification("Aucune invocation donnÃ©e par le MJ")
      return
    }

    let granted = null
    ALLY_PNJS.forEach(pnj => {
      pnj.actions.forEach(action => {
        if (action.id === access.actionId) granted = { pnj, action }
      })
    })
    if (!granted) {
      showNotification("Invocation introuvable")
      return
    }

    const panel = document.createElement("div"); panel.id = "allyViewerPanel"
    panel.style.cssText = "position:fixed;bottom:80px;left:84px;background:rgba(8,20,24,0.97);border:1px solid rgba(140,80,255,0.4);box-shadow:0 0 0 1px rgba(80,40,160,0.3),0 0 30px rgba(0,0,0,0.9);border-radius:3px;padding:14px;z-index:99999999;min-width:300px;max-width:88vw;max-height:75vh;overflow-y:auto;font-family:Cinzel,serif;"

    const title = document.createElement("div"); title.style.cssText = "font-size:10px;letter-spacing:3px;color:#a880ff;margin-bottom:12px;border-bottom:1px solid rgba(140,80,255,0.2);padding-bottom:6px;display:flex;justify-content:space-between;"
    const titleLeft = document.createElement("span")
    titleLeft.innerText = "âœ¦ INVOCATION AUTORISÃ‰E"
    const titleRight = document.createElement("span")
    titleRight.style.cssText = "cursor:pointer;color:#ff8888;"
    titleRight.innerText = "âœ•"
    titleRight.onclick = () => {
      const panelEl = document.getElementById("allyViewerPanel")
      if (panelEl) panelEl.remove()
    }
    title.appendChild(titleLeft)
    title.appendChild(titleRight)
    panel.appendChild(title)

    const block = document.createElement("div"); block.style.cssText = "margin-bottom:6px;border-bottom:1px solid rgba(140,80,255,0.1);padding-bottom:10px;"
    const header = document.createElement("div"); header.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:6px;"
    const img = document.createElement("img"); img.src = "images/"+granted.pnj.image; img.style.cssText = `width:36px;height:36px;border-radius:50%;border:1px solid ${granted.pnj.color}66;object-fit:contain;filter:grayscale(20%);`; img.onerror=()=>img.style.opacity="0.3"
    const info = document.createElement("div")
    info.innerHTML = `<div style="font-size:13px;color:${granted.pnj.color};letter-spacing:1px;">${granted.pnj.name}</div><div style="font-size:9px;color:#4a6a7a;font-style:italic;margin-top:2px;">${granted.pnj.lore}</div>`
    header.appendChild(img); header.appendChild(info); block.appendChild(header)

    const row = document.createElement("div"); row.style.cssText = "display:flex;align-items:flex-start;gap:8px;padding:8px 8px;margin-bottom:3px;border-radius:2px;border:1px solid rgba(140,80,255,0.2);background:rgba(8,15,22,0.6);"
    const rowIcon = document.createElement("span")
    rowIcon.style.cssText = "font-size:16px;margin-top:1px;"
    rowIcon.innerText = granted.action.icon
    const rowCenter = document.createElement("div")
    rowCenter.style.flex = "1"
    const rowLabel = document.createElement("div")
    rowLabel.style.cssText = `font-size:11px;color:${granted.pnj.color};letter-spacing:1px;`
    rowLabel.innerText = granted.action.label + " "
    const rowDice = document.createElement("span")
    rowDice.style.cssText = "color:#5555aa;font-size:9px;"
    rowDice.innerText = "(D" + granted.action.dice + ")"
    rowLabel.appendChild(rowDice)
    const rowDesc = document.createElement("div")
    rowDesc.style.cssText = "font-size:10px;color:#3a5a6a;margin-top:3px;line-height:1.5;"
    rowDesc.innerText = granted.action.desc
    rowCenter.appendChild(rowLabel)
    rowCenter.appendChild(rowDesc)
    const rowBadge = document.createElement("span")
    rowBadge.style.cssText = "font-size:9px;padding:2px 7px;border-radius:2px;background:rgba(80,40,160,0.25);color:#d8b0ff;letter-spacing:1px;"
    rowBadge.innerText = "AUTORISÃ‰E"
    row.appendChild(rowIcon)
    row.appendChild(rowCenter)
    row.appendChild(rowBadge)
    row.style.cursor = "pointer"
    row.style.transition = "background 0.15s,border-color 0.15s,transform 0.15s"
    row.onmouseenter = () => { row.style.background = "rgba(20,30,48,0.85)"; row.style.borderColor = granted.pnj.color + "88"; row.style.transform = "translateX(-2px)" }
    row.onmouseleave = () => { row.style.background = "rgba(8,15,22,0.6)"; row.style.borderColor = "rgba(140,80,255,0.2)"; row.style.transform = "" }
    row.onclick = () => triggerAllyAction(granted.pnj, granted.action, panel)
    block.appendChild(row)
    panel.appendChild(block)
    document.body.appendChild(panel)
  })
}

/* ========================= */
/* POINTS LIBRES â€” LEVEL UP  */
/* ========================= */

function showFreePointsPanel(playerID, points) {
  const existing = document.getElementById("freePointsPanel"); if (existing) existing.remove()
  if (points <= 0) return

  const panel = document.createElement("div"); panel.id = "freePointsPanel"
  panel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(8,20,24,0.98);border:1px solid #1e5a66;box-shadow:0 0 0 1px #8a6520,0 0 40px rgba(0,0,0,0.9);border-radius:3px;padding:20px;z-index:999999999;min-width:320px;font-family:Cinzel,serif;"

  const title = document.createElement("div"); title.style.cssText = "font-size:11px;letter-spacing:3px;color:#d4a835;margin-bottom:6px;text-align:center;"
  title.innerText = "âœ¦ LEVEL UP âœ¦"
  panel.appendChild(title)

  const sub = document.createElement("div"); sub.style.cssText = "font-family:'IM Fell English',serif;font-size:13px;color:#6a9aaa;text-align:center;margin-bottom:16px;font-style:italic;"
  sub.innerText = "RÃ©partissez vos points de capacitÃ©"
  panel.appendChild(sub)

  const counter = document.createElement("div"); counter.id = "freePointsCounter"; counter.style.cssText = "text-align:center;font-size:28px;color:#d4a835;margin-bottom:16px;letter-spacing:2px;"
  counter.innerText = points + " point" + (points > 1 ? "s" : "") + " restant" + (points > 1 ? "s" : "")
  panel.appendChild(counter)

  let remaining = points
  const changes = {}

  const stats = ["force","charme","perspi","chance","defense"]
  const statLabels = { force:"Force", charme:"Charme", perspi:"PerspicacitÃ©", chance:"Chance", defense:"DÃ©fense" }

  stats.forEach(stat => {
    const row = document.createElement("div"); row.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:6px 10px;background:rgba(10,30,38,0.6);border:1px solid rgba(30,90,102,0.3);border-radius:2px;"

    const label = document.createElement("div"); label.style.cssText = "font-size:12px;color:#a0c8d0;letter-spacing:1px;flex:1;"
    label.innerText = statLabels[stat]

    const addedEl = document.createElement("div"); addedEl.id = "fp_added_"+stat; addedEl.style.cssText = "font-size:11px;color:#d4a835;min-width:40px;text-align:center;"
    addedEl.innerText = "+0"

    const minus = document.createElement("button"); minus.innerText = "âˆ’"; minus.style.cssText = "width:26px;height:26px;font-size:16px;background:rgba(80,20,20,0.5);color:#ff8888;border:1px solid rgba(180,40,40,0.4);border-radius:2px;cursor:pointer;margin:0 4px;"
    minus.onclick = () => {
      if (!(changes[stat] > 0)) return
      changes[stat]--; remaining++
      addedEl.innerText = "+" + (changes[stat] || 0)
      counter.innerText = remaining + " point" + (remaining > 1 ? "s" : "") + " restant" + (remaining > 1 ? "s" : "")
      confirmBtn.disabled = remaining > 0; confirmBtn.style.opacity = remaining > 0 ? "0.4" : "1"
    }

    const plus = document.createElement("button"); plus.innerText = "+"; plus.style.cssText = "width:26px;height:26px;font-size:16px;background:rgba(20,60,80,0.5);color:#88ccdd;border:1px solid rgba(30,90,102,0.4);border-radius:2px;cursor:pointer;margin:0 4px;"
    plus.onclick = () => {
      if (remaining <= 0) return
      changes[stat] = (changes[stat] || 0) + 1; remaining--
      addedEl.innerText = "+" + changes[stat]
      counter.innerText = remaining + " point" + (remaining > 1 ? "s" : "") + " restant" + (remaining > 1 ? "s" : "")
      confirmBtn.disabled = remaining > 0; confirmBtn.style.opacity = remaining > 0 ? "0.4" : "1"
    }

    row.appendChild(label); row.appendChild(minus); row.appendChild(addedEl); row.appendChild(plus)
    panel.appendChild(row)
  })

  const confirmBtn = document.createElement("button"); confirmBtn.style.cssText = "width:100%;margin-top:12px;padding:10px;font-family:Cinzel,serif;font-size:13px;background:rgba(10,40,52,0.8);color:#a0c8d0;border:1px solid #1e5a66;border-radius:2px;cursor:pointer;opacity:0.4;letter-spacing:2px;transition:all 0.2s;"
  confirmBtn.innerText = "âœ¦ Confirmer"; confirmBtn.disabled = true
  confirmBtn.onclick = () => {
    const updates = {}
    Object.keys(changes).forEach(stat => { if (changes[stat]) updates[stat] = firebase.database.ServerValue }) // placeholder
    // Lire les stats actuelles et ajouter
    db.ref("characters/" + playerID).once("value", snap => {
      const data = snap.val() || {}
      const upd = {}
      Object.keys(changes).forEach(stat => {
        if (changes[stat]) upd[stat] = (parseInt(data[stat]) || 0) + changes[stat]
      })
      upd.freePoints = 0
      db.ref("characters/" + playerID).update(upd).then(() => {
        panel.remove()
        showNotification("âœ¦ Stats amÃ©liorÃ©es !")
        flashGold()
        // Recharger la fiche si ouverte
        if (currentSheetPlayer === playerID) {
          Object.keys(changes).forEach(stat => {
            const el = document.getElementById(stat); if (el && changes[stat]) el.value = (parseInt(el.value)||0) + changes[stat]
          })
        }
      })
    })
  }
  panel.appendChild(confirmBtn)

  document.body.appendChild(panel)
  flashGold()
}

function checkFreePoints(playerID) {
  db.ref("characters/" + playerID + "/freePoints").once("value", snap => {
    const pts = parseInt(snap.val()) || 0
    if (pts > 0) showFreePointsPanel(playerID, pts)
  })
}

/* ========================= */
/* OR / BOURSE               */
/* ========================= */

function toggleGoldInput() {
  const input   = document.getElementById("goldInput")
  const display = document.getElementById("goldDisplay")
  if (!input || !display) return
  const snd = new Audio("audio/coin.mp3"); setManagedAudioBaseVolume(snd, 0.7); snd.play().catch(()=>{})
  setTimeout(()=>{ let iv=setInterval(()=>{ if(snd.volume>0.05) snd.volume=Math.max(0,snd.volume-0.04); else{ snd.pause(); clearInterval(iv) } },100) }, 2000)
  const open = input.style.display !== "none"
  if (open) {
    input.style.display = "none"
    display.style.display = "block"
  } else {
    display.style.display = "none"
    input.style.display = "block"
    input.focus(); input.select()
  }
}

function saveGold() {
  if (!currentSheetPlayer) return
  const input = document.getElementById("goldInput"); if (!input) return
  const val = parseInt(input.value) || 0
  db.ref("characters/" + currentSheetPlayer + "/gold").set(val)
  // Fermer l'input et afficher la valeur
  input.style.display = "none"
  const display = document.getElementById("goldDisplay")
  if (display) { display.innerText = val + " po"; display.style.display = "block" }
  showNotification("ðŸ’° " + val + " piÃ¨ces d'or")
}

function loadGold(playerID) {
  db.ref("characters/" + playerID + "/gold").once("value", snap => {
    const val = parseInt(snap.val()) || 0
    const input   = document.getElementById("goldInput")
    const display = document.getElementById("goldDisplay")
    if (input)   input.value = val
    if (display) { display.innerText = val + " po"; display.style.display = "block" }
  })
}

/* ========================= */
/* JOURNAL MJ â€” RÃ‰DUIRE      */
/* ========================= */

function toggleMJLog() {
  const content = document.getElementById("mjLogContent")
  const btn     = document.getElementById("mjLogToggle")
  const log     = document.getElementById("mjLog")
  if (!content || !btn) return
  const collapsed = content.style.display === "none"
  content.style.display = collapsed ? "block" : "none"
  btn.innerText = collapsed ? "â–¼" : "â–²"
  log.style.maxHeight = collapsed ? "260px" : "auto"
}

/* ========================= */
/* DOCUMENTS / INDICES       */
/* ========================= */

function showDocument(image, title) {
  if (!isGM) return
  playSound("parcheminSound", 0.8)
  db.ref("game/document").set({ image, title, time: Date.now() })
  document.querySelectorAll(".gmSection").forEach(s => s.style.display = "none")
}

function hideDocument() {
  db.ref("game/document").remove()
}

function _renderDocument(data) {
  const existing = document.getElementById("documentOverlay"); if (existing) existing.remove()
  if (!data) return

  const overlay = document.createElement("div"); overlay.id = "documentOverlay"
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:9999995;opacity:0;transition:opacity 0.8s ease;"

  const img = document.createElement("img"); img.src = (typeof resolveImagePath === "function") ? resolveImagePath(data.image) : (/^(https?:|data:|blob:|\/|images\/)/i.test(String(data.image || "")) ? String(data.image || "") : "images/" + data.image)
  img.style.cssText = "max-height:80vh;max-width:80vw;object-fit:contain;filter:drop-shadow(0 20px 50px rgba(0,0,0,0.9));animation:pnjIdle 3s ease-in-out infinite;"
  img.onerror = () => img.style.opacity = "0.3"
  overlay.appendChild(img)

  if (data.title) {
    const label = document.createElement("div"); label.style.cssText = "position:absolute;bottom:8%;left:50%;transform:translateX(-50%);font-family:'Cinzel Decorative','Cinzel',serif;font-size:18px;color:#f0e8c8;letter-spacing:3px;text-shadow:0 0 8px rgba(200,150,50,0.6),1px 1px 4px black;pointer-events:none;background:rgba(8,20,24,0.8);border:1px solid rgba(160,120,40,0.4);border-radius:3px;padding:5px 18px;white-space:nowrap;"
    label.innerText = data.title; overlay.appendChild(label)
  }

  document.body.appendChild(overlay)
  setTimeout(() => overlay.style.opacity = "1", 30)
  playSound("parcheminSound", 0.7)
}

function grantAllyActionToPlayers(pnj, action) {
  db.ref("game/playerAllyAccess").set({
    pnjName: pnj.name,
    actionId: action.id,
    time: Date.now()
  }).then(() => {
    showNotification("âœ¦ " + action.label + " donnÃ©e aux joueurs")
  })
}

