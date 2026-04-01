"use strict"

/* ========================= */
/* FIREBASE INIT             */
/* ========================= */

const firebaseConfig = {
  apiKey:            "AIzaSyCRdh9-vOZn-u-FrVwkCX8uE3jHZ9q9ppY",
  authDomain:        "la-prophetie-des-mouches.firebaseapp.com",
  databaseURL:       "https://la-prophetie-des-mouches-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "la-prophetie-des-mouches",
  storageBucket:     "la-prophetie-des-mouches.firebasestorage.app",
  messagingSenderId: "61052402165",
  appId:             "1:61052402165:web:376cb5aa9a156bc02cc8bc"
}

firebase.initializeApp(firebaseConfig)
firebase.database().goOnline()
const db = firebase.database()
const auth = null
const SESSION_REF_PATH = "game/session"

if (typeof window.startMenuSparks !== "function") window.startMenuSparks = function () {}
if (typeof window.stopMenuSparks !== "function") window.stopMenuSparks = function () {}
if (typeof window.stopAllMusic !== "function") window.stopAllMusic = function () {}
if (typeof window.preloadAssets !== "function") window.preloadAssets = function () {}

function closeGMAuthModal() {}
function closePlayerAuthModal() {}
function tryAutoSelectAuthenticatedPlayer() { return false }

function setSandboxStudioMode(enabled) {
  try {
    document.body.classList.toggle("sandbox-studio-mode", !!enabled)
    if (!enabled) document.body.classList.remove("sandbox-preview-mode")
    updateSandboxPreviewButton()
    if (enabled) {
      isGM = true
      window.isGM = true
      if (window.__menuMusicFadeInterval) {
        clearInterval(window.__menuMusicFadeInterval)
        window.__menuMusicFadeInterval = null
      }
      const menuMusic = document.getElementById("music")
      if (menuMusic) {
        try { menuMusic.pause() } catch (e) {}
        menuMusic.currentTime = 0
        menuMusic.volume = 0
      }
    }
  } catch (e) {}
}

function ensureSandboxStudioChromeVisible() {
  try {
    if (!document.body) return
    document.body.classList.add("sandbox-studio-mode")
    var chromeDisplayMap = {
      gmSaveBar: "block",
      sandboxPlayerSlotsBar: "block",
      sandboxStyleBar: "block",
      sandboxPreviewBar: "block",
      gmBar: "flex",
      mjLog: "block",
      diceBar: "flex",
      diceLog: "block"
    }
    Object.keys(chromeDisplayMap).forEach(function(id) {
      var el = document.getElementById(id)
      if (el) el.style.display = chromeDisplayMap[id]
    })
  } catch (_) {}
}

function updateSandboxPreviewButton() {
  try {
    const button = document.getElementById("sandboxPreviewBtn")
    if (!button) return
    const active = document.body.classList.contains("sandbox-preview-mode")
    button.textContent = active ? "Retour studio" : "Apercu"
    button.setAttribute("aria-pressed", active ? "true" : "false")
  } catch (_) {}
}

function toggleSandboxPreviewMode(forceState) {
  try {
    if (!document.body || !document.body.classList.contains("sandbox-studio-mode")) return false
    const nextState = typeof forceState === "boolean"
      ? !!forceState
      : !document.body.classList.contains("sandbox-preview-mode")
    if (nextState) {
      try {
        if (typeof closeSimpleSheet === "function") closeSimpleSheet()
      } catch (_) {}
      document.querySelectorAll(".gmSection").forEach(function(sec) {
        sec.style.display = "none"
      })
      try { closeStudioSaveMenu() } catch (_) {}
      try {
        const playersMenu = document.getElementById("sandboxPlayersMenu")
        if (playersMenu) playersMenu.removeAttribute("open")
      } catch (_) {}
      try {
        const styleMenu = document.getElementById("sandboxStyleMenu")
        if (styleMenu) styleMenu.removeAttribute("open")
      } catch (_) {}
      try { closeSandboxMapManagerV2() } catch (_) {}
      try {
        const inlinePicker = document.getElementById("gmCharacterPickerInline")
        if (inlinePicker) inlinePicker.remove()
      } catch (_) {}
    }
    document.body.classList.toggle("sandbox-preview-mode", nextState)
    updateSandboxPreviewButton()
  } catch (_) {}
  return false
}

function updatePlayerAuthMenuState() {
  const status = document.getElementById("playerAuthStatus")
  if (status) {
    status.style.display = "none"
    status.innerText = ""
  }
}

function showPlayerAuthModal() {
  requestPlayerAuth()
}

function requestPlayerAuth() {
  const select = document.getElementById("playerSelect")
  if (select && select.style.display === "none") {
    select.style.display = "block"
    select.style.opacity = "1"
  }
  const menu = document.getElementById("playerMenu")
  if (menu) menu.classList.add("open")
  showNotification("Choisis un slot pour rejoindre la partie")
}

function releaseLocalSessionSlot() {
  if (isGM || !myToken) return
  const slotId = myToken.id
  const presenceId = getLocalPresenceId()
  getSessionSlotRef(slotId).transaction(current => {
    if (!current || current.claimedBy !== presenceId) return current
    return { claimedBy: null, claimedAt: null }
  })
}

function getLocalPresenceId() {
  try {
    let value = localStorage.getItem("rpg_presence_id")
    if (!value) {
      value = "p_" + Math.random().toString(36).slice(2, 10)
      localStorage.setItem("rpg_presence_id", value)
    }
    return value
  } catch (e) {
    if (!window.__fallbackPresenceId) window.__fallbackPresenceId = "p_" + Math.random().toString(36).slice(2, 10)
    return window.__fallbackPresenceId
  }
}

function getSessionSlotRef(slotId) {
  return db.ref(SESSION_REF_PATH + "/slots/" + slotId)
}

function generateJoinCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
}

function getCurrentSandboxSummary() {
  if (typeof getSandboxSummary === "function") return getSandboxSummary()
  const customization = typeof getCustomization === "function" ? getCustomization() : null
  const project = customization && customization.project ? customization.project : {}
  return {
    title: String(project.title || "Roleplay It Yourself").trim() || "Roleplay It Yourself",
    theme: String(project.theme || "medieval_fantasy"),
    playerCount: Math.max(1, Math.min(12, parseInt(project.playerCount, 10) || 4))
  }
}

function buildSessionSlots(playerCount) {
  const slots = {}
  ;["greg", "ju", "elo", "bibi"].slice(0, playerCount).forEach(slotId => {
    slots[slotId] = { claimedBy: null, claimedAt: null }
  })
  return slots
}

function exportSandbox(label) {
  if (typeof createSandboxExport !== "function") {
    showNotification("Export indisponible")
    return null
  }
  const exportEntry = createSandboxExport(typeof getCustomization === "function" ? getCustomization() : null, label)
  const summary = exportEntry && exportEntry.summary ? exportEntry.summary : getCurrentSandboxSummary()
  showNotification("Version jouable exportee")
  return {
    ...exportEntry,
    summary
  }
}

function launchSessionFromExport(exportEntry) {
  if (!exportEntry || !exportEntry.id) {
    showNotification("Aucun export jouable disponible")
    return
  }
  const summary = exportEntry.summary || getCurrentSandboxSummary()
  const joinCode = generateJoinCode()
  const sessionData = {
    exportId: exportEntry.id,
    exportLabel: String(exportEntry.label || "Version jouable"),
    exportCreatedAt: Number(exportEntry.createdAt) || Date.now(),
    exportSnapshot: exportEntry.sandbox || (typeof createSandboxSnapshot === "function" ? createSandboxSnapshot() : null),
    joinCode,
    title: summary.title,
    theme: summary.theme,
    playerCount: summary.playerCount,
    status: "lobby",
    createdAt: Date.now()
  }

  db.ref(SESSION_REF_PATH).set({ ...sessionData, slots: buildSessionSlots(summary.playerCount) }).then(() => {
    try { localStorage.setItem("rpg_last_join_code", joinCode) } catch (e) {}
    showNotification("Partie lancee : " + joinCode)
    openSessionLobbyOverlay(sessionData)
  }).catch(error => {
    console.warn("launchSessionFromExport failed:", error)
    showNotification("Impossible de lancer la partie")
  })
}

function launchSessionFromLatestExport() {
  const latestExport = typeof getLatestSandboxExport === "function" ? getLatestSandboxExport() : null
  if (latestExport) {
    launchSessionFromExport(latestExport)
    return
  }
  const freshExport = exportSandbox()
  if (freshExport) launchSessionFromExport(freshExport)
}

function refreshSessionSlotAvailability() {
  db.ref(SESSION_REF_PATH + "/slots").once("value", snap => {
    const slots = snap.val() || {}
    const presenceId = getLocalPresenceId()
    document.querySelectorAll("#playerMenu .playerChoiceBtn").forEach(btn => {
      const slotState = slots[btn.dataset.playerChoice] || null
      const occupiedByOther = !!(slotState && slotState.claimedBy && slotState.claimedBy !== presenceId)
      btn.disabled = occupiedByOther
      btn.style.opacity = occupiedByOther ? "0.45" : "1"
      btn.title = occupiedByOther ? "Slot deja pris" : ""
    })
  })
}

function openSessionLobbyOverlay(sessionData) {
  const existing = document.getElementById("sessionLobbyOverlay")
  if (existing) existing.remove()
  const overlay = document.createElement("div")
  overlay.id = "sessionLobbyOverlay"
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.84);display:flex;align-items:center;justify-content:center;z-index:1000000200;padding:18px;"
  overlay.addEventListener("mousedown", event => { if (event.target === overlay) overlay.remove() })

  const panel = document.createElement("div")
  panel.style.cssText = "width:min(760px,94vw);max-height:90vh;overflow:auto;padding:24px;border-radius:18px;background:linear-gradient(180deg,rgba(18,14,10,0.98),rgba(7,7,7,0.98));border:1px solid rgba(214,180,106,0.42);box-shadow:0 24px 60px rgba(0,0,0,0.78);color:#f3e7cf;font-family:Cinzel,serif;"
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px;">
      <div>
        <div style="font-size:26px;letter-spacing:2px;color:#f0d087;">Partie prete</div>
        <div style="font-size:13px;line-height:1.6;color:#cdbb96;margin-top:8px;">Partage ce code avec les joueurs pour qu'ils rejoignent la session.</div>
      </div>
      <button type="button" id="sessionLobbyClose" style="padding:10px 14px;background:#222;color:#f3e7cf;border:1px solid #555;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Fermer</button>
    </div>
    <div style="display:grid;gap:14px;">
      <div style="padding:18px;border-radius:16px;background:rgba(255,255,255,0.04);border:1px solid rgba(214,180,106,0.22);">
        <div style="font-size:12px;letter-spacing:2px;color:#cdbb96;">CODE DE PARTIE</div>
        <div id="sessionLobbyCode" style="margin-top:8px;font-size:36px;letter-spacing:4px;color:#f5e6c8;">${String(sessionData.joinCode || "")}</div>
        <div style="margin-top:10px;font-size:12px;color:#bfae8b;">${String(sessionData.title || "Board")} · ${String(sessionData.playerCount || 4)} joueurs</div>
        <div style="margin-top:6px;font-size:11px;color:#97886c;">${String(sessionData.exportLabel || "Version jouable")}</div>
      </div>
      <div id="sessionLobbySlots" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;"></div>
      <div style="display:flex;justify-content:flex-end;gap:10px;">
        <button type="button" id="sessionLobbyCopy" style="padding:10px 14px;background:rgba(15,40,56,0.72);color:#e9d8af;border:1px solid rgba(80,126,150,0.35);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Copier le code</button>
        <button type="button" id="sessionLobbyBoard" style="padding:10px 16px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Ouvrir le board</button>
      </div>
    </div>
  `
  overlay.appendChild(panel)
  document.body.appendChild(overlay)

  document.getElementById("sessionLobbyClose").onclick = () => overlay.remove()
  document.getElementById("sessionLobbyBoard").onclick = () => overlay.remove()
  document.getElementById("sessionLobbyCopy").onclick = async () => {
    try {
      if (navigator.clipboard && sessionData.joinCode) await navigator.clipboard.writeText(sessionData.joinCode)
      showNotification("Code copie")
    } catch (e) {
      showNotification("Code : " + sessionData.joinCode)
    }
  }

  const renderSlots = slots => {
    const wrap = document.getElementById("sessionLobbySlots")
    if (!wrap) return
    const names = ["greg", "ju", "elo", "bibi"]
    wrap.innerHTML = names.slice(0, sessionData.playerCount || 4).map(slotId => {
      const slot = slots && slots[slotId] ? slots[slotId] : null
      const occupied = !!(slot && slot.claimedBy)
      return `<div style="padding:12px;border-radius:12px;background:rgba(0,0,0,0.18);border:1px solid rgba(214,180,106,0.18);">
        <div style="font-size:11px;letter-spacing:2px;color:#bfae8b;">${slotId.toUpperCase()}</div>
        <div style="margin-top:6px;font-size:15px;color:#f5e6c8;">${occupied ? "Pris" : "Libre"}</div>
      </div>`
    }).join("")
  }

  db.ref(SESSION_REF_PATH + "/slots").on("value", snap => renderSlots(snap.val() || {}))
}

function launchSessionFromSandbox() {
  const freshExport = exportSandbox()
  if (freshExport) launchSessionFromExport(freshExport)
}

function openJoinSessionOverlay() {
  const existing = document.getElementById("joinSessionOverlay")
  if (existing) existing.remove()
  const overlay = document.createElement("div")
  overlay.id = "joinSessionOverlay"
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.84);display:flex;align-items:center;justify-content:center;z-index:1000000200;padding:18px;"
  overlay.addEventListener("mousedown", event => { if (event.target === overlay) overlay.remove() })

  const panel = document.createElement("div")
  panel.style.cssText = "width:min(520px,92vw);padding:24px;border-radius:18px;background:linear-gradient(180deg,rgba(18,14,10,0.98),rgba(7,7,7,0.98));border:1px solid rgba(214,180,106,0.42);box-shadow:0 24px 60px rgba(0,0,0,0.78);color:#f3e7cf;font-family:Cinzel,serif;"
  panel.innerHTML = `
    <div style="font-size:24px;letter-spacing:2px;color:#f0d087;">Rejoindre une partie</div>
    <div style="margin-top:8px;font-size:13px;line-height:1.6;color:#cdbb96;">Entre le code donne par le MJ pour ouvrir les slots joueurs.</div>
    <label style="display:grid;gap:6px;margin-top:18px;">
      <span style="font-size:12px;color:#bfae8b;">Code de partie</span>
      <input id="joinSessionCodeInput" type="text" placeholder="Ex : A1B2-C3D4" style="width:100%;padding:12px 14px;background:rgba(8,8,8,0.9);border:1px solid rgba(180,150,90,0.45);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;font-size:16px;box-sizing:border-box;text-transform:uppercase;">
    </label>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;">
      <button type="button" id="joinSessionCancel" style="padding:10px 14px;background:#222;color:#f3e7cf;border:1px solid #555;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Fermer</button>
      <button type="button" id="joinSessionConfirm" style="padding:10px 16px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;">Rejoindre</button>
    </div>
  `
  overlay.appendChild(panel)
  document.body.appendChild(overlay)
  document.getElementById("joinSessionCancel").onclick = () => overlay.remove()
  const input = document.getElementById("joinSessionCodeInput")
  try { input.value = localStorage.getItem("rpg_last_join_code") || "" } catch (e) {}
  document.getElementById("joinSessionConfirm").onclick = () => {
    const code = String(input.value || "").trim().toUpperCase()
    if (!code) {
      showNotification("Entre un code de partie")
      return
    }
    db.ref(SESSION_REF_PATH).once("value", snap => {
      const session = snap.val()
      if (!session || String(session.joinCode || "").toUpperCase() !== code) {
        showNotification("Code invalide")
        return
      }
      window.__activeJoinCode = code
      try { localStorage.setItem("rpg_last_join_code", code) } catch (e) {}
      overlay.remove()
      requestPlayerAuth()
      refreshSessionSlotAvailability()
      showNotification("Partie rejointe")
    })
  }
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") document.getElementById("joinSessionConfirm").click()
  })
  setTimeout(() => input.focus(), 20)
}

window.groupMadness = 0
window.groupMadnessTier = 0
window.madnessShakeInterval = null
window.currentMadnessLoopId = null
window.worldMapFogTopLeftHidden = false
window.__worldMapFogTopLeftReady = false
window.playerThuumData = {}
window.playerThuumAccessData = {}
window.playerAllyAccessData = null
window.activeRuneChallengeData = null
window.mapLoreBookData = null
window.readLoreBooksData = {}
window.__openedMapLoreBookId = null
window.__shopWasOpen = false
window.__shopInitDone = false
window.__lastShopSoundState = null
window.__lastShopSoundAt = 0
window.__lastShopEventSignature = null
window.__lastOpenedShopTime = null
window.__lastPublishedCameraZoom = null

const MAP_LORE_BOOK_MAPS = []

const MAP_LORE_BOOK_IMAGES = ["livre.png", "livre1.png", "livre2.png"]

const MAP_LORE_BOOK_ENTRIES = {
  revenus: {
    id: "revenus",
    text: "Ils sont revenus.\nIls sont revenus.\nIls sont revenus.",
    reward: null
  },
  logique: {
    id: "logique",
    text: "Jour 12 : je suis persuadÃ© que ce lieu a une logique.\nJour 19 : je suis persuadÃ© que cette logique m'Ã©chappe.\nJour 23 : je ne suis plus sÃ»r de vouloir comprendre.",
    reward: { stat: "perspi", amount: 1, label: "Intelligence" }
  },
  subtile: {
    id: "subtile",
    text: "Certains apprennent Ã  Ã©viter les coups.\nD'autres apprennent Ã  ne jamais Ãªtre lÃ  quand ils arrivent.\nLa diffÃ©rence est subtile, mais elle sauve des vies.",
    reward: { stat: "defense", amount: 1, label: "DextÃ©ritÃ©" }
  },
  danger: {
    id: "danger",
    text: "Si vous lisez ceci, c'est que vous Ãªtes probablement en danger.\nSi vous n'Ãªtes pas en danger, reposez ce livre immÃ©diatement, vous allez l'Ãªtre.",
    reward: { stat: "curse", amount: 1, label: "MalÃ©diction" }
  }
}

function isMapLoreBookMap(mapName) {
  return MAP_LORE_BOOK_MAPS.includes(mapName)
}

function getMapLoreBookPosition(mapName) {
  const positions = {
    "taverne.jpg":       { left: "20%", bottom: "18%" },
    "tavernebrume.png":  { left: "18%", bottom: "18%" },
    "palaisville.jpg":   { left: "76%", bottom: "16%" },
    "mairemaison.jpg":   { left: "24%", bottom: "20%" },
    "marche.jpg":        { left: "30%", bottom: "16%" },
    "marche1.jpg":       { left: "26%", bottom: "18%" },
    "interieurmine.jpg": { left: "74%", bottom: "15%" }
  }
  return positions[mapName] || { left: "22%", bottom: "18%" }
}

function closeMapLoreBookOverlay() {
  const overlay = document.getElementById("mapLoreBookOverlay")
  if (overlay) overlay.remove()
  window.__openedMapLoreBookId = null
}

function updateMapLoreBookVisibility() {
  const existing = document.getElementById("mapLoreBookToken")
  const data = window.mapLoreBookData
  const shouldShow = !!(
    data &&
    data.active &&
    !data.claimedBy &&
    data.map === currentMap &&
    gameState === "GAME" &&
    !combatActive
  )

  if (!shouldShow) {
    if (existing) existing.remove()
    return
  }

  const mapEl = document.getElementById("map")
  if (!mapEl) return
  const pos = getMapLoreBookPosition(currentMap)
  const token = existing || document.createElement("img")

  if (!existing) {
    token.id = "mapLoreBookToken"
    token.style.position = "absolute"
    token.style.width = "88px"
    token.style.height = "88px"
    token.style.objectFit = "contain"
    token.style.cursor = "pointer"
    token.style.pointerEvents = "auto"
    token.draggable = false
    token.style.zIndex = "58"
    token.style.filter = "drop-shadow(0 10px 16px rgba(0,0,0,0.82))"
    token.style.animation = "bookFloatIdle 2.8s ease-in-out infinite"
    token.onmousedown = e => { e.stopPropagation() }
    token.onclick = e => { e.stopPropagation(); tryOpenMapLoreBook() }
    mapEl.appendChild(token)
  }

  token.src = "images/" + (data.image || "livre.png")
  token.style.left = pos.left
  token.style.bottom = pos.bottom
}

function applyMapLoreBookReward(entry, playerId) {
  if (!entry || !entry.reward || !playerId) return
  const reward = entry.reward
  const path = "characters/" + playerId + "/" + reward.stat
  db.ref(path).once("value", snap => {
    const current = parseInt(snap.val(), 10) || 0
    db.ref(path).set(current + reward.amount)
  })
  showNotification(playerId.toUpperCase() + " gagne +" + reward.amount + " " + reward.label)
}

function getLocalPlayerId() {
  if (window.__localPlayerId) return String(window.__localPlayerId).toLowerCase()
  if (myToken && myToken.id) return String(myToken.id).toLowerCase()
  const selectedToken = document.querySelector(".token.selectedPlayer")
  if (selectedToken && selectedToken.id) return String(selectedToken.id).toLowerCase()
  const menuMini = document.getElementById("playerMenuMini")
  if (menuMini && menuMini.dataset && menuMini.dataset.playerId) return String(menuMini.dataset.playerId).toLowerCase()
  const sheet = document.getElementById("characterSheet")
  if (sheet && sheet.dataset && sheet.dataset.playerId) return String(sheet.dataset.playerId).toLowerCase()
  try {
    const stored = localStorage.getItem("rpg_local_player")
    if (stored) return String(stored).toLowerCase()
  } catch (e) {}
  return ""
}

function triggerLocalDefeat(reason) {
  const localId = getLocalPlayerId()
  if (isGM || !localId || window.__combatOutcomeShowing || window.__pendingLocalDefeat) return false
  if (!(combatActive || gameState === "COMBAT" || reason === "playerDeath" || reason === "combatOutcome" || reason === "hp-watch" || reason === "remote-exit-hp")) return false
  window.__pendingLocalDefeat = true
  combatActive = true
  setGameState("COMBAT")
  setTimeout(() => {
    if (!window.__combatOutcomeShowing) showDefeat()
  }, reason === "hp" ? 50 : 80)
  return true
}

function watchLocalPlayerDefeat(playerId) {
  const pid = String(playerId || "").toLowerCase()
  if (!pid) return

  window.__localPlayerId = pid
  try { localStorage.setItem("rpg_local_player", pid) } catch (e) {}

  if (window.__localDefeatRef && window.__localDefeatCb) {
    window.__localDefeatRef.off("value", window.__localDefeatCb)
  }

  const ref = db.ref("characters/" + pid + "/hp")
  const cb = snap => {
    const hp = parseInt(snap.val(), 10) || 0
    if (!isGM && hp <= 0 && (combatActive || gameState === "COMBAT") && !window.__combatOutcomeShowing) {
      triggerLocalDefeat("hp-watch")
    }
  }

  window.__localDefeatRef = ref
  window.__localDefeatCb = cb
  ref.on("value", cb)
}

function showMapLoreBookOverlay(bookData) {
  const entry = MAP_LORE_BOOK_ENTRIES[bookData?.id]
  if (!entry) return
  closeMapLoreBookOverlay()
  playSound("parcheminSound", 0.85)

  const overlay = document.createElement("div")
  overlay.id = "mapLoreBookOverlay"
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.58);z-index:9999996;opacity:0;transition:opacity 0.4s ease;"

  const box = document.createElement("div")
  box.style.cssText = "position:relative;width:min(760px,86vw);height:min(640px,84vh);display:flex;align-items:center;justify-content:center;"

  const img = document.createElement("img")
  img.src = "images/livreouvert.png"
  img.style.cssText = "width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 18px 42px rgba(0,0,0,0.9));pointer-events:none;"
  box.appendChild(img)

  const text = document.createElement("div")
  text.style.cssText = "position:absolute;left:18%;top:24%;width:64%;height:46%;display:flex;align-items:center;justify-content:center;text-align:center;white-space:pre-line;font-family:'IM Fell English',serif;font-size:clamp(22px,2vw,34px);line-height:1.45;color:#3c2713;text-shadow:0 1px 0 rgba(255,235,190,0.2);padding:34px 40px;box-sizing:border-box;background:linear-gradient(180deg,rgba(238,226,198,0.96),rgba(215,199,164,0.96));border-radius:18px;box-shadow:inset 0 0 0 1px rgba(130,98,54,0.18);"
  text.innerText = entry.text
  box.appendChild(text)

  if (entry.reward) {
    const reward = document.createElement("div")
    reward.style.cssText = "position:absolute;left:20%;bottom:18%;width:60%;text-align:center;font-family:'Cinzel',serif;font-size:clamp(14px,1.2vw,18px);letter-spacing:2px;color:#68451f;"
    reward.innerText = "+1 " + entry.reward.label
    box.appendChild(reward)
  }

  overlay.appendChild(box)
  document.body.appendChild(overlay)
  window.__openedMapLoreBookId = bookData.id
  setTimeout(() => { overlay.style.opacity = "1" }, 30)
}

function tryOpenMapLoreBook() {
  const localPlayerId = getLocalPlayerId()
  if (isGM || !localPlayerId || !window.mapLoreBookData || !window.mapLoreBookData.active) return
  const localBook = window.mapLoreBookData
  if (String(localBook.claimedBy || "").toLowerCase()) return
  db.ref("game/mapLoreBook/claimedBy").transaction(current => {
    if (current) return
    return localPlayerId
  }, (error, committed) => {
    if (error || !committed) {
      if (error) console.warn("Lore book claim failed:", error)
      return
    }
    const claimedAt = Date.now()
    db.ref("game/mapLoreBook/claimedAt").set(claimedAt).catch(() => {})
    const bookData = { ...localBook, claimedBy: localPlayerId, claimedAt, active: false }
    window.mapLoreBookData = bookData
    updateMapLoreBookVisibility()
    const entry = MAP_LORE_BOOK_ENTRIES[bookData.id]
    showMapLoreBookOverlay(bookData)
    applyMapLoreBookReward(entry, localPlayerId)
    db.ref("game/readLoreBooks/" + bookData.id).set(true)
  }, false)
}

function maybeSpawnMapLoreBook(mapName) {
  if (!isGM) return
  db.ref("game/mapLoreBook").remove()
  if (!isMapLoreBookMap(mapName)) return
  if (Math.random() >= 0.2) return
  db.ref("game/readLoreBooks").once("value", snap => {
    const read = snap.val() || {}
    const pool = Object.values(MAP_LORE_BOOK_ENTRIES).filter(entry => !read[entry.id])
    if (!pool.length) return
    const entry = pool[Math.floor(Math.random() * pool.length)]
    const image = MAP_LORE_BOOK_IMAGES[Math.floor(Math.random() * MAP_LORE_BOOK_IMAGES.length)]
    db.ref("game/mapLoreBook").set({
      id: entry.id,
      image,
      map: mapName,
      active: true,
      time: Date.now()
    })
  })
}
window.usedThuumData = {}
window.__lastThuumUnlockTime = 0
window.__lastThuumCastTime = 0
window.THUUMS = {
  SKRAA: {
    word: "SKRAA",
    words: ["SKRAA", "VORTH", "NAAK"],
    translation: "Fragmentation â€¢ Rupture â€¢ Dispersion finale",
    description: "Fracasse la cible principale et blesse les ennemis autour.",
    unlockMap: "prebalraug.jpg",
    buttonImage: "images/runeskraa.png",
    combatDamageByRank: rank => ({ main: 8 + rank * 4, splash: 3 + rank * 2 }),
    outsideCombatMessage: "SKRAA retentit hors combat"
  }
}

function getMadnessZoneFactor() {
  const map = (currentMap || "").toLowerCase()
  if (map.includes("foret")) return 1.35
  if (map.includes("portail")) return 1.1
  return 1
}

function isMadnessActiveMap() {
  const map = (currentMap || "").toLowerCase()
  return map.includes("foret") || map.includes("portail")
}

function getMadnessTier(value) {
  if (value >= 100) return 4
  if (value >= 75) return 3
  if (value >= 50) return 2
  if (value >= 25) return 1
  return 0
}

function stopMadnessLoops() {
  ;["madnessLow", "madnessMid", "madnessHigh", "madnessPeak"].forEach(id => {
    const audio = document.getElementById(id)
    if (!audio) return
    audio.volume = 0
    audio.pause()
    audio.currentTime = 0
  })
  window.currentMadnessLoopId = null
}

function clearMadnessResidualEffects() {
  const overlay = document.getElementById("madnessOverlay")
  const cameraEl = document.getElementById("camera")

  if (window.madnessShakeInterval) {
    clearInterval(window.madnessShakeInterval)
    window.madnessShakeInterval = null
  }

  if (overlay) {
    overlay.style.display = "none"
    overlay.style.opacity = "0"
    overlay.style.background = ""
    overlay.classList.remove("active", "pulse")
  }

  if (cameraEl) {
    cameraEl.style.filter = ""
    cameraEl.classList.remove("madnessWarp")
    cameraEl.style.transform = ""
  }
}

function playMadnessLoopForTier(tier, value) {
  if (tier <= 0 || !isMadnessActiveMap() || combatActive || gameState !== "GAME") {
    stopMadnessLoops()
    return
  }

  const audioMap = {
    1: document.getElementById("madnessLow"),
    2: document.getElementById("madnessMid"),
    3: document.getElementById("madnessHigh"),
    4: document.getElementById("madnessPeak")
  }
  const audio = audioMap[tier]
  const targetId = audio ? audio.id : null
  if (!audio) {
    stopMadnessLoops()
    return
  }

  const targetVolume = Math.min(0.85, (0.18 + value / 180) * getMadnessZoneFactor())

  if (window.currentMadnessLoopId === targetId && !audio.paused) {
    audio.volume = targetVolume
    return
  }

  stopMadnessLoops()
  window.currentMadnessLoopId = targetId
  audio.currentTime = 0
  audio.loop = true
  audio.volume = targetVolume
  audio.play().catch(() => {})
}

function playMadnessHit() {
  const hit = document.getElementById("whisperHit")
  if (!hit || combatActive || gameState !== "GAME") return
  hit.currentTime = 0
  hit.volume = Math.min(0.95, 0.45 * getMadnessZoneFactor())
  hit.play().catch(() => {})
}

function updateWorldMapFogTopLeft() {
  const fog = document.getElementById("worldMapFogTopLeft")
  if (!fog) return
  const shouldShow = currentMap === "MAPMONDE.jpg" && !window.worldMapFogTopLeftHidden && gameState === "GAME"
  fog.style.transition = "opacity 0.5s ease"
  fog.style.filter = "drop-shadow(0 0 18px rgba(0,0,0,0.55))"
  fog.style.display = shouldShow ? "block" : "none"
  fog.style.opacity = shouldShow ? "0.98" : "0"
}

function toggleWorldMapFogTopLeft() {
  if (!isGM) return
  db.ref("game/worldMapFogTopLeftHidden").set(!window.worldMapFogTopLeftHidden)
}

function revealWorldMapFogTopLeft() {
  const fog = document.getElementById("worldMapFogTopLeft")
  if (!fog || currentMap !== "MAPMONDE.jpg" || gameState !== "GAME") return
  fog.style.display = "block"
  fog.style.opacity = "0.98"
  fog.style.transition = "opacity 2s ease, filter 2s ease, transform 0.18s ease"
  fog.style.filter = "brightness(1.4) drop-shadow(0 0 26px rgba(255,220,160,0.55))"
  fog.style.transform = "scale(1.03)"
  const revealSnd = new Audio("audio/pow.mp3")
  setManagedAudioBaseVolume(revealSnd, 0.85)
  revealSnd.play().catch(() => {})
  screenShakeHard()
  setTimeout(() => screenShake(), 180)
  requestAnimationFrame(() => {
    fog.style.opacity = "0"
    fog.style.filter = "brightness(1.05) drop-shadow(0 0 10px rgba(255,220,160,0.18))"
    fog.style.transform = "scale(1)"
  })
  setTimeout(() => {
    fog.style.display = "none"
    fog.style.transition = "opacity 0.5s ease"
    fog.style.filter = "drop-shadow(0 0 18px rgba(0,0,0,0.55))"
    fog.style.transform = ""
  }, 2050)
}

function startMadnessShake(tier) {
  if (window.madnessShakeInterval) {
    clearInterval(window.madnessShakeInterval)
    window.madnessShakeInterval = null
  }
  if (tier < 2) return

  const interval = tier >= 4 ? 2200 : tier === 3 ? 3400 : 5200
  window.madnessShakeInterval = setInterval(() => {
    if (combatActive || gameState !== "GAME") return
    if (tier >= 4) screenShakeHard()
    else screenShake()
  }, interval)
}

function updateMadnessVisibility() {
  const gauge = document.getElementById("madnessGauge")
  const overlay = document.getElementById("madnessOverlay")
  if (!gauge || !overlay) return

  const visible = gameState === "GAME" && !combatActive && isMadnessActiveMap()
  gauge.style.display = visible ? "flex" : "none"
  overlay.style.display = visible ? "block" : "none"

  if (!visible) {
    stopMadnessLoops()
    clearMadnessResidualEffects()
  }
  else playMadnessLoopForTier(window.groupMadnessTier, window.groupMadness)
}

function resetMadnessPresentation() {
  const gauge = document.getElementById("madnessGauge")
  stopMadnessLoops()
  if (gauge) gauge.style.display = "none"
  clearMadnessResidualEffects()
}

function updateMadnessUI(value) {
  const gauge = document.getElementById("madnessGauge")
  const fill = document.getElementById("madnessGaugeFill")
  const glow = document.getElementById("madnessGaugeGlow")
  const label = document.getElementById("madnessGaugeValue")
  const mjValues = document.querySelectorAll("#madnessMJValue")
  const overlay = document.getElementById("madnessOverlay")
  const cameraEl = document.getElementById("camera")
  if (!gauge || !fill || !glow || !label || !overlay) return

  if (!isMadnessActiveMap()) {
    gauge.style.display = "none"
    stopMadnessLoops()
    clearMadnessResidualEffects()
    mjValues.forEach(el => { el.innerText = Math.max(0, Math.min(100, value)) + " / 100" })
    return
  }

  const pct = Math.max(0, Math.min(100, value))
  const tier = getMadnessTier(pct)
  const zoneFactor = getMadnessZoneFactor()

  gauge.classList.remove("tier-0", "tier-1", "tier-2", "tier-3", "tier-4")
  gauge.classList.add("tier-" + tier)
  fill.style.width = pct + "%"
  glow.style.width = pct + "%"
  label.innerText = pct + " / 100"
  mjValues.forEach(el => { el.innerText = pct + " / 100" })

  overlay.classList.toggle("active", pct > 0)
  overlay.classList.toggle("pulse", tier >= 2)
  overlay.style.opacity = pct <= 0 ? "0" : String(Math.min(0.82, (pct / 140) * zoneFactor))
  if (cameraEl) {
    const blur = pct >= 75 ? 1.6 : pct >= 50 ? 1.1 : pct >= 25 ? 0.5 : 0
    const brightness = pct >= 75 ? 0.82 : pct >= 50 ? 0.9 : pct >= 25 ? 0.96 : 1
    cameraEl.style.filter = combatActive ? "" : `blur(${blur}px) brightness(${brightness}) saturate(${1 + pct / 250})`
    if (pct >= 75 && gameState === "GAME" && !combatActive) {
      cameraEl.classList.add("madnessWarp")
      setTimeout(() => cameraEl.classList.remove("madnessWarp"), 350)
    }
  }

  if (tier >= 4) {
    overlay.style.background = "radial-gradient(circle at 50% 50%, rgba(150,20,20,0.14) 0%, rgba(50,0,0,0.24) 42%, rgba(0,0,0,0.64) 100%)"
  } else if (tier >= 2) {
    overlay.style.background = "radial-gradient(circle at 50% 50%, rgba(110,30,20,0.1) 0%, rgba(24,0,0,0.16) 48%, rgba(0,0,0,0.48) 100%)"
  } else {
    overlay.style.background = "radial-gradient(circle at 50% 50%, rgba(90,40,20,0.06) 0%, rgba(12,0,0,0.12) 48%, rgba(0,0,0,0.38) 100%)"
  }

  if (tier !== window.groupMadnessTier) {
    if (tier > 0) playMadnessHit()
    window.groupMadnessTier = tier
  }

  playMadnessLoopForTier(tier, pct)
  startMadnessShake(tier)
  updateMadnessVisibility()
}

function setGroupMadness(value) {
  if (!isGM) return
  const clamped = Math.max(0, Math.min(100, value))
  db.ref("game/groupMadness").set(clamped)
}

function changeGroupMadness(delta) {
  if (!isGM) return
  db.ref("game/groupMadness").once("value", snap => {
    const current = parseInt(snap.val(), 10) || 0
    setGroupMadness(current + delta)
  })
}

function resetGroupMadness() {
  setGroupMadness(0)
}

function ensureMadnessGMButton() {}

function getMyThuumWords() {
  if (!myToken || !window.playerThuumData) return {}
  const exact = window.playerThuumData[myToken.id]
  if (exact) return exact

  const loose = (typeof getObjectValueLoose === "function")
    ? getObjectValueLoose(window.playerThuumData, myToken.id)
    : null
  return loose || {}
}

function getThuumDef(word) {
  return (window.THUUMS && window.THUUMS[word]) || null
}

function getUnlockedThuumWords() {
  const words = getMyThuumWords()
  return Object.keys(words).filter(word => {
    const data = words[word]
    return !!getThuumDef(word) && !!(data && data.unlocked)
  })
}

function getPrimaryThuumWord() {
  const unlocked = getUnlockedThuumWords()
  return unlocked.length ? unlocked[0] : null
}

function hasUnlockedThuum(word) {
  const words = getMyThuumWords()
  return !!(words[word] && words[word].unlocked)
}

function isThuumUsedThisCombat(word) {
  if (!myToken || !window.usedThuumData) return false
  if (window.usedThuumData[myToken.id] && window.usedThuumData[myToken.id][word]) return true

  const wanted = String(myToken.id || "").toLowerCase()
  const key = Object.keys(window.usedThuumData).find(k => String(k).toLowerCase() === wanted)
  return !!(key && window.usedThuumData[key] && window.usedThuumData[key][word])
}

function hasThuumUseAccess(word) {
  if (!myToken || !window.playerThuumAccessData) return false
  if (window.playerThuumAccessData[myToken.id] && window.playerThuumAccessData[myToken.id][word] && window.playerThuumAccessData[myToken.id][word].allowed) return true

  const wanted = String(myToken.id || "").toLowerCase()
  const key = Object.keys(window.playerThuumAccessData).find(k => String(k).toLowerCase() === wanted)
  return !!(key && window.playerThuumAccessData[key] && window.playerThuumAccessData[key][word] && window.playerThuumAccessData[key][word].allowed)
}

function hasPlayerAllyAccess() {
  return !!window.playerAllyAccessData
}

function hasActiveRuneChallenge() {
  const data = window.activeRuneChallengeData
  return !!(data && data.active)
}

function getAvailablePlayerPowerTabs() {
  const tabs = []
  if (hasPlayerAllyAccess()) tabs.push("ally")
  if (getUnlockedThuumWords().length) tabs.push("thuum")
  if (hasActiveRuneChallenge()) tabs.push("runes")
  return tabs
}

function getDefaultPlayerPowerTab() {
  const tabs = getAvailablePlayerPowerTabs()
  if (!tabs.length) return ""
  if (tabs.includes("thuum")) return "thuum"
  if (tabs.includes("ally")) return "ally"
  return tabs[0]
}

function closePlayerPowersPanel() {
  const panel = document.getElementById("playerThuumPanel")
  if (!panel) return
  panel.style.display = "none"
  panel.innerHTML = ""
  delete panel.dataset.activeTab
}

function updateThuumButton() {
  const btn = document.getElementById("playerThuumBtn")
  if (!btn) return
  const unlockedWords = getUnlockedThuumWords()
  const activeWord = getPrimaryThuumWord()
  const activeDef = activeWord ? getThuumDef(activeWord) : null
  const img = btn.querySelector("img")

  const hasAnyPower = !isGM && !!myToken && getAvailablePlayerPowerTabs().length > 0
  if (!hasAnyPower) {
    btn.style.display = "none"
    btn.disabled = false
    btn.dataset.word = ""
    if (img) img.removeAttribute("src")
    closePlayerPowersPanel()
    return
  }

  btn.dataset.word = activeWord || ""
  if (img) img.src = (activeDef && activeDef.buttonImage) ? activeDef.buttonImage : "images/runeskraa.png"
  btn.style.display = "block"
  btn.disabled = false
  if (activeWord && !combatActive) {
    const allowedOutside = hasThuumUseAccess(activeWord)
    btn.title = allowedOutside ? activeWord + " autorise par le MJ hors combat" : activeWord + " disponible en combat ou avec autorisation MJ"
  } else if (activeWord) {
    const used = isThuumUsedThisCombat(activeWord)
    btn.title = used ? activeWord + " deja utilise pour ce combat" : activeWord + " pret a etre lance"
  } else if (hasPlayerAllyAccess()) {
    btn.title = "Pouvoirs : invocation autorisee"
  } else {
    btn.title = "Pouvoirs : runes"
  }
  renderPlayerPowersPanel()
}

function getThuumEntryState(word) {
  if (combatActive) {
    return isThuumUsedThisCombat(word) ? "Deja utilise pour ce combat" : "Utilisable en combat"
  }
  return hasThuumUseAccess(word) ? "Autorise par le MJ hors combat" : "Hors combat : autorisation MJ requise"
}

function canUseThuumNow(word) {
  if (!hasUnlockedThuum(word)) return false
  if (combatActive) return !isThuumUsedThisCombat(word)
  return hasThuumUseAccess(word)
}

function renderPlayerThuumEntries(panel) {
  const unlocked = getUnlockedThuumWords()
  if (!unlocked.length) {
    const empty = document.createElement("div")
    empty.className = "playerThuumEntryState"
    empty.style.padding = "10px 0"
    empty.innerText = "Aucun Thu'um appris."
    panel.appendChild(empty)
    return
  }

  unlocked.forEach(word => {
    const def = getThuumDef(word)
    if (!def) return

    const entry = document.createElement("button")
    entry.className = "playerThuumEntry"
    entry.disabled = !canUseThuumNow(word)
    entry.onclick = () => usePlayerThuum(word)

    const img = document.createElement("img")
    img.src = def.buttonImage || "images/runeskraa.png"
    img.alt = word
    entry.appendChild(img)

    const text = document.createElement("div")
    text.className = "playerThuumEntryText"

    const name = document.createElement("div")
    name.className = "playerThuumEntryName"
    name.innerText = word
    text.appendChild(name)

    const words = document.createElement("div")
    words.className = "playerThuumEntryWords"
    words.innerText = (def.words || [word]).join(" â€¢ ")
    text.appendChild(words)

    const translation = document.createElement("div")
    translation.className = "playerThuumEntryState"
    translation.style.color = "#d8c28a"
    translation.style.fontStyle = "italic"
    translation.style.opacity = "0.92"
    translation.innerText = def.translation || def.description || ""
    if (translation.innerText) text.appendChild(translation)

    const state = document.createElement("div")
    state.className = "playerThuumEntryState"
    state.innerText = getThuumEntryState(word)
    text.appendChild(state)

    entry.appendChild(text)
    panel.appendChild(entry)
  })
}

function renderPlayerAllyEntry(panel) {
  const access = window.playerAllyAccessData
  if (!access) return

  let granted = null
  if (typeof ALLY_PNJS !== "undefined") {
    ALLY_PNJS.forEach(pnj => {
      pnj.actions.forEach(action => {
        if (action.id === access.actionId) granted = { pnj, action }
      })
    })
  }

  if (!granted) {
    const empty = document.createElement("div")
    empty.className = "playerThuumEntryState"
    empty.style.padding = "10px 0"
    empty.innerText = "Invocation introuvable."
    panel.appendChild(empty)
    return
  }

  const entry = document.createElement("button")
  entry.className = "playerThuumEntry"
  entry.onclick = () => {
    if (typeof triggerAllyAction === "function") triggerAllyAction(granted.pnj, granted.action)
  }

  const img = document.createElement("img")
  img.src = "images/" + granted.pnj.image
  img.alt = granted.pnj.name
  entry.appendChild(img)

  const text = document.createElement("div")
  text.className = "playerThuumEntryText"

  const name = document.createElement("div")
  name.className = "playerThuumEntryName"
  name.innerText = granted.action.label
  text.appendChild(name)

  const words = document.createElement("div")
  words.className = "playerThuumEntryWords"
  words.innerText = granted.pnj.name
  text.appendChild(words)

  const desc = document.createElement("div")
  desc.className = "playerThuumEntryState"
  desc.style.color = "#d8c28a"
  desc.innerText = granted.action.desc
  text.appendChild(desc)

  const state = document.createElement("div")
  state.className = "playerThuumEntryState"
  state.innerText = "AutorisÃ©e par le MJ"
  text.appendChild(state)

  entry.appendChild(text)
  panel.appendChild(entry)
}

function renderPlayerRuneEntry(panel) {
  const data = window.activeRuneChallengeData
  if (!data || !data.active) return

  const entry = document.createElement("button")
  entry.className = "playerThuumEntry"
  entry.onclick = () => toggleRuneOverlay(data)

  const icon = document.createElement("div")
  icon.style.cssText = "width:58px;height:58px;display:flex;align-items:center;justify-content:center;font-family:'Cinzel Decorative','Cinzel',serif;font-size:28px;color:#c8a050;"
  icon.innerText = "áš±"
  entry.appendChild(icon)

  const text = document.createElement("div")
  text.className = "playerThuumEntryText"

  const name = document.createElement("div")
  name.className = "playerThuumEntryName"
  name.innerText = "Runes"
  text.appendChild(name)

  const words = document.createElement("div")
  words.className = "playerThuumEntryWords"
  words.innerText = "DÃ©fi runique actif"
  text.appendChild(words)

  const state = document.createElement("div")
  state.className = "playerThuumEntryState"
  state.innerText = "Ouvrir le jeu de runes"
  text.appendChild(state)

  entry.appendChild(text)
  panel.appendChild(entry)
}

function renderPlayerPowersPanel() {
  const panel = document.getElementById("playerThuumPanel")
  if (!panel || panel.style.display === "none") return
  panel.innerHTML = ""
  const tabs = getAvailablePlayerPowerTabs()
  if (!tabs.length) {
    panel.style.display = "none"
    return
  }

  const title = document.createElement("div")
  title.id = "playerThuumPanelTitle"
  title.innerText = "Pouvoirs"
  panel.appendChild(title)

  const tabRow = document.createElement("div")
  tabRow.style.cssText = "display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;"
  panel.appendChild(tabRow)

  const content = document.createElement("div")
  content.id = "playerPowerPanelContent"
  panel.appendChild(content)

  const activeTab = tabs.includes(panel.dataset.activeTab) ? panel.dataset.activeTab : getDefaultPlayerPowerTab()
  panel.dataset.activeTab = activeTab

  function paintTab(tab) {
    content.innerHTML = ""
    panel.dataset.activeTab = tab
    Array.from(tabRow.children).forEach(btn => {
      btn.style.background = btn.dataset.tab === tab ? "rgba(190,150,72,0.22)" : "rgba(18,14,10,0.65)"
      btn.style.borderColor = btn.dataset.tab === tab ? "rgba(205,170,92,0.8)" : "rgba(120,92,44,0.38)"
      btn.style.color = btn.dataset.tab === tab ? "#f6e2a8" : "#d5c39a"
    })

    if (tab === "ally") renderPlayerAllyEntry(content)
    else if (tab === "thuum") renderPlayerThuumEntries(content)
    else if (tab === "runes") renderPlayerRuneEntry(content)
  }

  tabs.forEach(tab => {
    const btn = document.createElement("button")
    btn.dataset.tab = tab
    btn.style.cssText = "padding:6px 12px;font-family:'Cinzel',serif;font-size:12px;letter-spacing:1px;border:1px solid rgba(120,92,44,0.38);border-radius:999px;background:rgba(18,14,10,0.65);color:#d5c39a;cursor:pointer;"
    btn.innerText = tab === "ally" ? "Invoc" : tab === "thuum" ? "Thu'um" : "Runes"
    btn.onclick = () => paintTab(tab)
    tabRow.appendChild(btn)
  })

  paintTab(activeTab)
}

function togglePlayerThuumPanel() {
  const panel = document.getElementById("playerThuumPanel")
  if (!panel) return
  if (panel.style.display === "block") {
    closePlayerPowersPanel()
    return
  }
  panel.style.display = "block"
  renderPlayerPowersPanel()
}

function showThuumUnlockCinematic(data) {
    const screen = document.getElementById("thuumUnlockScreen")
    const image = document.getElementById("thuumUnlockImage")
    const title = document.getElementById("thuumUnlockTitle")
    const words = document.getElementById("thuumUnlockWords")
    const player = document.getElementById("thuumUnlockPlayer")
    if (!screen || !title || !words || !player) return

    const def = getThuumDef(data.word)
    if (image) image.src = "images/thuum.png"
    title.innerText = "Nouveau Cri de Mouches appris : " + data.word
    words.innerText = (data.words && data.words.length ? data.words.join(" â€¢ ") : ((def && def.words) ? def.words.join(" â€¢ ") : data.word))
    player.innerText = data.playerId ? ("Porteur choisi : " + data.playerId.toUpperCase()) : ""
  if (myToken && data.playerId && String(myToken.id).toLowerCase() === String(data.playerId).toLowerCase()) {
    showNotification((data.word || "Cri") + " est maintenant a vous")
  }

  const snd = document.getElementById("thuumSound")
  if (snd) {
    snd.currentTime = 0
    snd.volume = 0.85
    snd.play().catch(() => {})
  }

  screen.style.display = "flex"
  requestAnimationFrame(() => screen.classList.add("active"))
  flashGold()
  flashGold()
  screenShakeHard()

  setTimeout(() => {
    screen.classList.remove("active")
    setTimeout(() => { screen.style.display = "none" }, 600)
  }, 4200)
}

function playThuumCastEffect(data) {
  const snd = document.getElementById("criSound")
  if (snd) {
    snd.currentTime = 0
    snd.volume = 0.85
    snd.play().catch(() => {})
  }
  const flash = document.createElement("div")
  flash.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:999999998;background:radial-gradient(circle at center,rgba(190,220,255,0.85) 0%,rgba(120,180,255,0.42) 22%,rgba(255,255,255,0.22) 38%,rgba(170,0,0,0.18) 68%,rgba(0,0,0,0) 100%);opacity:0;mix-blend-mode:screen;transition:opacity 0.08s ease;"
  document.body.appendChild(flash)
  requestAnimationFrame(() => { flash.style.opacity = "1" })
  setTimeout(() => {
    flash.style.transition = "opacity 0.55s ease"
    flash.style.opacity = "0"
  }, 110)
  setTimeout(() => flash.remove(), 760)

  flashRed()
  setTimeout(() => flashRed(), 90)
  screenShakeHard()
  setTimeout(() => screenShake(), 180)
  const casterId = String(data.playerId || "").toLowerCase()
  if (casterId) {
    const casterToken = Array.from(document.querySelectorAll(".token")).find(t => String(t.id || "").toLowerCase() === casterId)
    if (casterToken) {
      let flame = casterToken.querySelector(".thuumBlueFlame")
      if (!flame) {
        flame = document.createElement("div")
        flame.className = "thuumBlueFlame"
        flame.style.cssText = "position:absolute;left:50%;bottom:14px;transform:translateX(-50%);width:84px;height:118px;border-radius:50% 50% 42% 42%;background:radial-gradient(ellipse at 50% 82%, rgba(180,245,255,0.92) 0%, rgba(88,205,255,0.8) 18%, rgba(45,126,255,0.64) 46%, rgba(24,62,170,0.18) 70%, transparent 100%);mix-blend-mode:screen;filter:blur(6px);opacity:0;"
        casterToken.appendChild(flame)
      }
      casterToken.classList.remove("thuumCaster")
      void casterToken.offsetWidth
      casterToken.classList.add("thuumCaster")
      setTimeout(() => {
        casterToken.classList.remove("thuumCaster")
        if (flame) flame.style.opacity = "0"
      }, 1700)
    }
  }
  showNotification("áš¦ " + (data.word || "SKRAA") + " - " + (data.playerId || "").toUpperCase())
}

function grantThuumToPlayer(playerId, word) {
  if (!isGM) return
  const def = getThuumDef(word)
  if (!def) return
  if (currentMap !== def.unlockMap) {
    showNotification(word + " ne peut etre revele que sur " + def.unlockMap)
    return
  }

  db.ref("game/playerThuum/" + playerId + "/" + word).once("value", snap => {
    const existing = snap.val()
    if (existing && existing.unlocked) {
      showNotification(word + " deja appris par " + playerId.toUpperCase())
      return
    }

    db.ref("game/playerThuum/" + playerId + "/" + word).set({
      unlocked: true,
      rank: 1,
      words: def.words || [word],
      time: Date.now()
    }).then(() => {
      db.ref("game/thuumUnlockEvent").set({
        playerId,
        word,
        words: def.words || [word],
        time: Date.now()
      })
      setTimeout(() => db.ref("game/thuumUnlockEvent").remove(), 2000)
      showNotification("SKRAA donne a " + playerId.toUpperCase())
    })
  })
}

function grantThuumUseToPlayer(playerId, word) {
  if (!isGM) return
  db.ref("game/playerThuumAccess/" + playerId + "/" + word).set({
    allowed: true,
    time: Date.now()
  }).then(() => {
    showNotification(word + " autorise hors combat pour " + playerId.toUpperCase())
  })
}

function usePlayerThuum(forcedWord) {
  if (!myToken) return
  const activeWord = forcedWord || getPrimaryThuumWord()
  const def = activeWord ? getThuumDef(activeWord) : null
  if (!activeWord || !def || !hasUnlockedThuum(activeWord)) return
  if (combatActive && isThuumUsedThisCombat(activeWord)) {
    showNotification(activeWord + " est deja utilise pour ce combat")
    return
  }

  const playerId = myToken.id
  if (!combatActive) {
    if (!hasThuumUseAccess(activeWord)) {
      showNotification("Le MJ doit autoriser " + activeWord + " hors combat")
      return
    }
    db.ref("game/playerThuumAccess/" + playerId + "/" + activeWord).remove()
    db.ref("game/thuumCast").set({
      playerId,
      word: activeWord,
      time: Date.now(),
      outsideCombat: true
    })
    setTimeout(() => db.ref("game/thuumCast").remove(), 1500)
    showNotification(def.outsideCombatMessage || (activeWord + " retentit hors combat"))
    closePlayerPowersPanel()
    updateThuumButton()
    return
  }

  db.ref("combat/usedThuum/" + playerId + "/" + activeWord).set(true)
  db.ref("game/thuumCast").set({
    playerId,
    word: activeWord,
    time: Date.now(),
    outsideCombat: false
  })
  setTimeout(() => db.ref("game/thuumCast").remove(), 1500)

  const rank = ((getMyThuumWords()[activeWord] || {}).rank || 1)
  const damage = def.combatDamageByRank ? def.combatDamageByRank(rank) : { main: 8 + rank * 4, splash: 3 + rank * 2 }
  const mainDmg = damage.main
  const splash = damage.splash

  db.ref("combat/mob").once("value", snap => {
    const mob = snap.val()
    if (mob) db.ref("combat/mob/hp").set(Math.max(1, (mob.hp || 0) - mainDmg))
  })

  ;["mob2", "mob3"].forEach(slot => {
    db.ref("combat/" + slot).once("value", snap => {
      const mob = snap.val()
      if (mob) db.ref("combat/" + slot + "/hp").set(Math.max(1, (mob.hp || 0) - splash))
    })
  })

  closePlayerPowersPanel()
  updateThuumButton()
}

/* ========================= */
/* FIREBASE LISTENERS        */
/* UN SEUL par chemin        */
/* InitialisÃ©s aprÃ¨s chargement complet (ui.js + combat.js disponibles) */
/* ========================= */

document.addEventListener("DOMContentLoaded", () => {
window.__introClickLockUntil = 0
  
// Masquer les PNJ immÃ©diatement au chargement
;["storyImage","storyImage2","storyImage3"].forEach(id => {
  const el = document.getElementById(id)
  if (el) { el.style.display = "none"; el.style.opacity = "0" }
})

const madnessGauge = document.getElementById("madnessGauge")
if (madnessGauge) madnessGauge.style.display = "none"
resetMadnessPresentation()
if (typeof resetAuroraPresentation === "function") resetAuroraPresentation()

// â”€â”€â”€ combat/mob â€” listener unique fusionnÃ© â”€â”€â”€
db.ref("combat/mob").on("value", snap => {
  const data = snap.val()

  // Barre HP panneau MJ
  const topBar  = document.getElementById("mobHPBarTop")
  const topText = document.getElementById("mobHPTopText")
  if (topBar && topText && data) {
    const pct = Math.max(0, (data.hp / data.maxHP) * 100)
    topBar.style.width = pct + "%"
    topText.innerText  = data.name.toUpperCase() + "  " + data.hp + " / " + data.maxHP + "  (Niv " + (data.lvl || "?") + ")"
    topBar.style.background = pct > 60 ? "linear-gradient(90deg,#3cff6b,#0b8a3a)" : pct > 30 ? "linear-gradient(90deg,#ffb347,#ff7b00)" : "linear-gradient(90deg,#ff4040,#8b0000)"
  }

  const hud = document.getElementById("mobHUD")
  if (!combatActive || !data) {
    if (hud) hud.style.display = "none"
    const token = document.getElementById("mobToken")
    if (token) token.style.display = "none"
    return
  }

  // Token HUD (barre au-dessus du token)
  const tokenBar  = document.getElementById("mobTokenHPBar")
  const tokenText = document.getElementById("mobTokenHPText")
  if (tokenBar && tokenText) {
    const pct = (data.hp / data.maxHP) * 100
    tokenBar.style.width = pct + "%"
    tokenText.innerText  = data.hp + " / " + data.maxHP
  }

  const nameEl = document.getElementById("mobName")
  if (nameEl) nameEl.innerText = data.name.toUpperCase() + "  â€¢  NIV " + (data.lvl || "?")
  const hpText = document.getElementById("mobHPText")
  if (hpText) hpText.innerText = "HP " + data.hp + " / " + data.maxHP

    if (isGM) {
      hud.style.display = "block"
      if (lastMobHP !== null && data.hp < lastMobHP) { flashRed(); screenShake() }
      if (data.hp <= 0 && combatActive && !window.__combatOutcomeShowing) { showVictory() }
      lastMobHP = data.hp
    } else {
      if (combatActive) {
        hud.style.display = "block"
        activeMobSlots["mob"] = true
      }
      if (data.hp <= 0 && combatActive && !window.__combatOutcomeShowing) {
        showVictory()
      }
    }
})

// â”€â”€â”€ diceRoll â”€â”€â”€
db.ref("diceRoll").on("child_added", snap => {
  const roll = snap.val()
  if (!roll || !roll.player || !roll.dice || !roll.result) return
  if (roll.time && roll.time < gameStartTime) return
  // Validation : rÃ©sultat doit Ãªtre cohÃ©rent avec le dÃ©
  const dice   = parseInt(roll.dice)
  const result = parseInt(roll.result)
  if (!Number.isInteger(dice) || !Number.isInteger(result)) return
  if (result < 1 || result > dice) return
  showDiceAnimation(roll.player, dice, result)
})

// â”€â”€â”€ storyImage slots â”€â”€â”€
db.ref("game/storyImage").on("value", snap => {
  const image = snap.val()
  // Masquer le PNJ sur tous les Ã©crans sauf GAME et COMBAT
  const box = document.getElementById("storyImage")
  if (gameState !== "GAME" && gameState !== "COMBAT") {
    if (box) { box.style.display = "none"; box.style.opacity = "0" }
    document.querySelectorAll("[id^='pnjNameTag']").forEach(t => t.remove())
    return
  }
  if (image) showStoryImage(image)
  else       hideStoryImage()
})

db.ref("game/storyImage2").on("value", snap => {
  const image = snap.val()
  const box2  = document.getElementById("storyImage2")
  const img2  = document.getElementById("storyImageContent2")
  if (!box2 || !img2) return
  if (gameState !== "GAME" && gameState !== "COMBAT") { box2.style.display="none"; box2.style.opacity="0"; return }
  if (image) {
    img2.src = (typeof resolvePNJImageSrc === "function") ? resolvePNJImageSrc(image) : (/^(https?:|data:|blob:|\/|images\/)/i.test(String(image || "")) ? String(image || "") : "images/" + image)
    box2.style.opacity = "0"; box2.style.left = "0"; box2.style.right = "auto"; box2.style.transform = ""; box2.style.display = "flex"
    if (!pnjSlotOrder.includes(2)) pnjSlotOrder.push(2)
    updatePNJPositions()
    setTimeout(() => { box2.style.opacity = "1" }, 60)
  } else {
    box2.style.opacity = "0"
    setTimeout(() => { box2.style.display = "none"; pnjSlotOrder = pnjSlotOrder.filter(s => s !== 2); updatePNJPositions() }, 500)
  }
})

db.ref("game/storyImage3").on("value", snap => {
  const image = snap.val()
  const box3  = document.getElementById("storyImage3")
  const img3  = document.getElementById("storyImageContent3")
  if (!box3 || !img3) return
  if (gameState !== "GAME" && gameState !== "COMBAT") { box3.style.display="none"; box3.style.opacity="0"; return }
  if (image) {
    img3.src = (typeof resolvePNJImageSrc === "function") ? resolvePNJImageSrc(image) : (/^(https?:|data:|blob:|\/|images\/)/i.test(String(image || "")) ? String(image || "") : "images/" + image)
    box3.style.opacity = "0"; box3.style.right = "0"; box3.style.left = "auto"; box3.style.transform = ""; box3.style.display = "flex"
    if (!pnjSlotOrder.includes(3)) pnjSlotOrder.push(3)
    updatePNJPositions()
    setTimeout(() => { box3.style.opacity = "1" }, 60)
  } else {
    box3.style.opacity = "0"
    setTimeout(() => { box3.style.display = "none"; pnjSlotOrder = pnjSlotOrder.filter(s => s !== 3); updatePNJPositions() }, 500)
  }
})

// â”€â”€â”€ tokens â”€â”€â”€
db.ref("tokens").on("child_added",   updateTokenFromDB)
db.ref("tokens").on("child_changed", updateTokenFromDB)

// â”€â”€â”€ characters â”€â”€â”€
db.ref("characters").on("child_added",   watchCharacter)
db.ref("characters").on("child_changed", watchCharacter)

// â”€â”€â”€ map â”€â”€â”€
db.ref("game/map").on("value", snap => {
  const mapName = snap.val()
  if (!mapName) return
  window.__latestMapValue = mapName
  if (gameState !== GAME_STATE.GAME && gameState !== GAME_STATE.COMBAT) return

  const map  = document.getElementById("map")
  const fade = document.getElementById("fadeScreen")
  if (parseFloat(fade.style.opacity) >= 1) return

  const previousMap = currentMap
  const isFirst = firstMapLoad
  if (isFirst) firstMapLoad = false
  currentMap = mapName
  if (previousMap && previousMap !== mapName) closeMapLoreBookOverlay()
  if (typeof stopBifrostFlashSound === "function") stopBifrostFlashSound()
  updateMadnessUI(window.groupMadness || 0)
  updateWorldMapFogTopLeft()
  updateMapLoreBookVisibility()
  setTimeout(() => updateBifrostBtn(), 100)

  fade.style.transition = "opacity 0.8s ease"; fade.style.opacity = 1; fade.style.pointerEvents = "none"

  setTimeout(() => {
    map.style.backgroundImage = "url('" + resolveImagePath(mapName) + "')"
    if (mapName === "MAPMONDE.jpg") { map.style.backgroundSize = "contain"; map.style.backgroundColor = "#0a0a1a" }
    else                            { map.style.backgroundSize = "cover";   map.style.backgroundColor = "" }
    updateWorldMapFogTopLeft()
    updateMapLoreBookVisibility()
    if (isFirst) { calculateMinZoom(); cameraZoom = minZoom; updateCamera() }
    document.querySelectorAll(".token").forEach(t => spawnPortal(t.id))
    if (mapMusic[mapName] && !_state._pendingMapAudio) {
      const shouldKeepAuroraMusic = auroraActive && mapName !== "bifrost.jpg"
      const wantedMusic = /^(https?:|data:|blob:|\/|audio\/)/i.test(mapMusic[mapName]) ? mapMusic[mapName] : "audio/" + mapMusic[mapName]
      const activeMusic = currentMusic === "A" ? document.getElementById("musicA") : document.getElementById("musicB")
      const activeName = activeMusic && activeMusic.src ? decodeURIComponent(activeMusic.src.replace(/.*\//, "").replace(/%20/g, " ")) : ""
      const wantedName = wantedMusic.replace(/.*\//, "").replace(/%20/g, " ")

      if (!shouldKeepAuroraMusic && !(activeName === wantedName && activeMusic && !activeMusic.paused && activeMusic.volume > 0.05)) {
        _musicTransitioning = false; _pendingMusic = null
        if (musicFadeInterval) { clearInterval(musicFadeInterval); musicFadeInterval = null }
        if (auroraActive && mapName === "bifrost.jpg") {
          const aurora = document.getElementById("auroraMusic")
          if (aurora) {
            aurora.pause()
            aurora.currentTime = 0
            aurora.volume = 0
          }
        }
        stopAllMusic()
        ensureMapMusicPlayback(mapName, 200)
      }
    }
  }, 800)

  setTimeout(() => {
    fade.style.transition = "opacity 1s ease"; fade.style.opacity = 0; fade.style.pointerEvents = "none"
    setTimeout(() => document.body.focus(), 100)
  }, 1200)

  setTimeout(() => {
    const displayName = getMapDisplayLabel(mapName)
    if (displayName) showLocation(displayName)
    if (isGM && !auroraActive && Math.random() < 0.03) triggerAurora()
    if (isGM && mapName === "cimetiere.jpg" && !cemeteryEventDone) setTimeout(() => triggerCemeteryEvent(), 1500)
  }, 2200)
})

// â”€â”€â”€ newGame â€” signal nouvelle partie â”€â”€â”€
db.ref("game/newGame").on("value", snap => {
  const data = snap.val()
  if (!data || !data.time) return
  if (isGM) return  // le MJ gÃ¨re lui-mÃªme
  if (!gameStarted) return  // pas encore en jeu
  // RÃ©initialiser l'Ã©tat local et revenir Ã  l'Ã©cran d'intro
  if (typeof forceCloseCharacterSheetWithoutSave === "function") forceCloseCharacterSheetWithoutSave()
  gameStarted = false
  window.isNewGame = false
  combatActive = false
  combatStarting = false
  window.__combatOutcomeShowing = false
  window.__pendingLocalDefeat = false
  myToken = null
  window.myToken = null
  stopAllMusic()
  setGameState("MENU")
  startIntro()
  showNotification("Nouvelle partie lancee par le MJ")
})

// â”€â”€â”€ groupMadness â€” jauge folie du groupe â”€â”€â”€
db.ref("game/groupMadness").on("value", snap => {
  const value = Math.max(0, Math.min(100, parseInt(snap.val(), 10) || 0))
  window.groupMadness = value
  updateMadnessUI(value)
})

db.ref("game/worldMapFogTopLeftHidden").on("value", snap => {
  const prevHidden = !!window.worldMapFogTopLeftHidden
  const nextHidden = !!snap.val()
  window.worldMapFogTopLeftHidden = nextHidden
  if (window.__worldMapFogTopLeftReady && !prevHidden && nextHidden) {
    revealWorldMapFogTopLeft()
  }
  window.__worldMapFogTopLeftReady = true
  updateWorldMapFogTopLeft()
})

db.ref("game/cameraZoom").on("value", snap => {
  const nextZoom = parseFloat(snap.val())
  if (!Number.isFinite(nextZoom)) return
  const mapEl = document.getElementById("map")
  if (!mapEl || !mapEl.offsetWidth || !mapEl.offsetHeight) return
  calculateMinZoom()
  const normalized = Math.max(minZoom, Math.min(2, nextZoom))
  window.__lastPublishedCameraZoom = Number(normalized.toFixed(3))
  cameraZoom = normalized
  updateCamera()
})

db.ref("game/readLoreBooks").on("value", snap => {
  window.readLoreBooksData = snap.val() || {}
})

db.ref("game/mapLoreBook").on("value", snap => {
  window.mapLoreBookData = snap.val()
  updateMapLoreBookVisibility()
})

// â”€â”€â”€ shop â”€â”€â”€
db.ref("game/shop").on("value", snap => {
  const data = snap.val()
  const isOpen = !!(data && data.open)
  if (!window.__shopInitDone) {
    window.__shopWasOpen = isOpen
    window.__lastOpenedShopTime = isOpen && data && data.time ? data.time : null
    window.__lastShopEventSignature = isOpen && data && data.time ? ("open:" + data.time) : "init-closed"
    window.__shopInitDone = true
  } else if (window.__shopWasOpen !== isOpen) {
    const now = Date.now()
    const signature = isOpen
      ? ("open:" + ((data && data.time) || now))
      : ("close:" + (window.__lastOpenedShopTime || "none"))
    if (signature !== window.__lastShopEventSignature && (window.__lastShopSoundState !== isOpen || (now - window.__lastShopSoundAt) > 700)) {
      window.__lastShopSoundState = isOpen
      window.__lastShopSoundAt = now
      window.__lastShopEventSignature = signature
    }
    if (isOpen && data && data.time) window.__lastOpenedShopTime = data.time
    window.__shopWasOpen = isOpen
  }
  const existing = document.getElementById("shopOverlay")
  if (existing) existing.remove()
  if (!data || !data.open) return
  if (!gameStarted || gameState === GAME_STATE.MENU) return
  renderShop(data.partyLvl, data.type || "marche")
})

// â”€â”€â”€ highPNJName â”€â”€â”€
db.ref("game/highPNJName").on("value", snap => {
  const data = snap.val()
  if (!data || !data.name) return
  if (gameState !== "GAME" && gameState !== "COMBAT") return
  showHighPNJScroll(data.name)
})

// â”€â”€â”€ aurora â”€â”€â”€
db.ref("events/aurora").on("value", snap => {
  const data = snap.val()
  if (!data || !data.active) {
    if (auroraActive || document.getElementById("auroraOverlay")) {
      showAuroraEndSequence()
    } else if (typeof stopAuroraMusic === "function") {
      stopAuroraMusic(false)
    }
    return
  }
  if (!gameStarted || gameState === GAME_STATE.MENU) return
  showAuroraEvent()
})

// â”€â”€â”€ bifrostFlash â”€â”€â”€
db.ref("game/bifrostFlash").on("value", snap => {
  if (!snap.val()) return
  doBifrostFlash()
  db.ref("game/bifrostFlash").remove()
})

// â”€â”€â”€ odinVision â”€â”€â”€
db.ref("game/odinVision").on("value", snap => {
  const data = snap.val()
  if (!data) return
  showOdinVision(data.msg)
})

// â”€â”€â”€ powerSound â”€â”€â”€
db.ref("game/powerSound").on("value", snap => {
  const data = snap.val()
  if (!data) return
  const pInfo = playerPowerSounds[data.player]
  if (!pInfo) return
  const snd = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath(pInfo.file) : (/^(https?:|data:|blob:|\/|audio\/)/i.test(String(pInfo.file || "")) ? String(pInfo.file || "") : "audio/" + pInfo.file))
  let sndBase = 0
  setManagedAudioBaseVolume(snd, sndBase)
  snd.play().catch(() => {})
  const inIv = setInterval(() => {
    if (sndBase < 0.85) {
      sndBase = Math.min(0.85, sndBase + 0.06)
      setManagedAudioBaseVolume(snd, sndBase)
    } else clearInterval(inIv)
  }, 80)
  if (pInfo.fadeAt) {
    setTimeout(() => {
      const outIv = setInterval(() => {
        if (sndBase > 0.01) {
          sndBase = Math.max(0, sndBase - 0.06)
          setManagedAudioBaseVolume(snd, sndBase)
        } else { snd.pause(); clearInterval(outIv) }
      }, 80)
    }, pInfo.fadeAt)
  }
  db.ref("game/powerSound").remove()
})

function showMobSpecialAttackEvent(data) {
  const style = typeof getMobAnimationStyle === "function" ? getMobAnimationStyle(data.animation) : { accent:"#ff9966", glow:"rgba(255,120,60,0.55)", bg:"radial-gradient(circle at center,rgba(70,15,0,0.94) 0%,rgba(10,0,0,0.98) 72%)" }
  const overlay = document.createElement("div")
  overlay.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:999999999;background:" + style.bg + ";opacity:0;transition:opacity 0.22s ease;"

  const ring = document.createElement("div")
  ring.style.cssText = "position:absolute;width:min(70vw,520px);height:min(70vw,520px);border-radius:50%;border:2px solid " + style.accent + ";box-shadow:0 0 60px " + style.glow + ", inset 0 0 50px rgba(255,255,255,0.05);animation:mobSpecialPulse 0.9s ease-in-out infinite alternate;"
  overlay.appendChild(ring)

  const box = document.createElement("div")
  box.style.cssText = "position:relative;z-index:1;width:min(760px,88vw);padding:36px 34px;border:1px solid " + style.accent + ";border-radius:18px;background:linear-gradient(180deg,rgba(8,8,10,0.78),rgba(0,0,0,0.9));box-shadow:0 0 80px " + style.glow + ";text-align:center;"
  overlay.appendChild(box)

  const icon = document.createElement("div")
  icon.style.cssText = "font-size:64px;line-height:1;margin-bottom:14px;filter:drop-shadow(0 0 18px " + style.accent + ");"
  icon.innerText = String(data.icon || "âœ¦")
  box.appendChild(icon)

  const mobName = document.createElement("div")
  mobName.style.cssText = "font-family:Cinzel,serif;font-size:12px;letter-spacing:4px;color:" + style.accent + ";margin-bottom:10px;"
  mobName.innerText = String(data.mobName || "")
  box.appendChild(mobName)

  const title = document.createElement("div")
  title.style.cssText = "font-family:'Cinzel Decorative',serif;font-size:clamp(26px,3.8vw,42px);color:#fff3df;text-shadow:0 0 22px " + style.accent + ";margin-bottom:14px;"
  title.innerText = String(data.attackName || "")
  box.appendChild(title)

  if (data.flavor) {
    const flavor = document.createElement("div")
    flavor.style.cssText = "font-family:'IM Fell English',serif;font-size:clamp(18px,2.5vw,28px);line-height:1.45;color:#ffd7c2;max-width:620px;margin:0 auto 18px auto;"
    flavor.innerText = String(data.flavor)
    box.appendChild(flavor)
  }

  const damage = document.createElement("div")
  damage.style.cssText = "font-family:Cinzel,serif;font-size:30px;font-weight:bold;color:" + style.accent + ";text-shadow:0 0 18px " + style.accent + ";"
  damage.innerText = "â†’ " + String(data.target || "") + "  â€¢  -" + clampInteger(data.dmg, 0, 9999) + " HP"
  box.appendChild(damage)

  document.body.appendChild(overlay)
  setTimeout(() => { overlay.style.opacity = "1" }, 20)
  setTimeout(() => {
    overlay.style.opacity = "0"
    setTimeout(() => { if (overlay.parentNode) overlay.remove() }, 450)
    db.ref("game/mobAttackEvent").remove()
  }, 3200)
  screenShakeHard()
  screenShakeHard()
  playSound("critSound", 0.75)
}

function showMobSpecialAttackEvent(data) {
  const style = typeof getMobAnimationStyle === "function" ? getMobAnimationStyle(data.animation) : { accent:"#ff9966", glow:"rgba(255,120,60,0.55)", bg:"radial-gradient(circle at center,rgba(70,15,0,0.94) 0%,rgba(10,0,0,0.98) 72%)" }
  const presentation = typeof getMobSpecialPresentation === "function" ? getMobSpecialPresentation(data.mobName) : null
  const scene = String((presentation && presentation.scene) || "").toLowerCase()
  const overlay = document.createElement("div")
  overlay.className = "mobSpecialOverlay" + (scene ? " mobSpecialOverlay--" + scene : "")
  overlay.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:999999999;background:" + style.bg + ";opacity:0;transition:opacity 0.22s ease;"

  const stage = document.createElement("div")
  stage.className = "mobSpecialStage"
  overlay.appendChild(stage)

  const ring = document.createElement("div")
  ring.className = "mobSpecialRing" + (scene ? " mobSpecialRing--" + scene : "")
  ring.style.cssText = "position:absolute;width:min(70vw,520px);height:min(70vw,520px);border-radius:50%;border:2px solid " + style.accent + ";box-shadow:0 0 60px " + style.glow + ", inset 0 0 50px rgba(255,255,255,0.05);animation:mobSpecialPulse 0.9s ease-in-out infinite alternate;"
  overlay.appendChild(ring)

  const box = document.createElement("div")
  box.className = "mobSpecialBox" + (scene ? " mobSpecialBox--" + scene : "")
  box.style.cssText = "position:relative;z-index:1;width:min(760px,88vw);padding:36px 34px;border:1px solid " + style.accent + ";border-radius:18px;background:linear-gradient(180deg,rgba(8,8,10,0.78),rgba(0,0,0,0.9));box-shadow:0 0 80px " + style.glow + ";text-align:center;overflow:hidden;"
  overlay.appendChild(box)

  if (presentation && presentation.image) {
    const heroImage = document.createElement("img")
    heroImage.className = "mobSpecialImage" + (scene ? " mobSpecialImage--" + scene : "")
    heroImage.src = typeof resolveImagePath === "function" ? resolveImagePath(presentation.image) : "images/" + presentation.image
    heroImage.alt = ""
    box.appendChild(heroImage)
  }

  if (presentation && Array.isArray(presentation.particles)) {
    presentation.particles.forEach((particle, idx) => {
      const glyph = document.createElement("div")
      glyph.className = "mobSpecialGlyph" + (scene ? " mobSpecialGlyph--" + scene : "")
      glyph.style.left = (18 + idx * 24) + "%"
      glyph.style.animationDelay = (idx * 0.16) + "s"
      glyph.innerText = particle
      stage.appendChild(glyph)
    })
  }

  if (scene === "witch") {
    const runeLeft = document.createElement("div")
    runeLeft.className = "mobSpecialRune mobSpecialRune--left"
    runeLeft.innerText = "âœ¦"
    stage.appendChild(runeLeft)
    const runeRight = document.createElement("div")
    runeRight.className = "mobSpecialRune mobSpecialRune--right"
    runeRight.innerText = "âœ§"
    stage.appendChild(runeRight)
  }

  if (scene === "melenchon") {
    const banner = document.createElement("div")
    banner.className = "mobSpecialBanner"
    banner.innerText = "TRIBUNE"
    stage.appendChild(banner)
  }

  if (scene === "balraug") {
    const fissure = document.createElement("div")
    fissure.className = "mobSpecialFissure"
    stage.appendChild(fissure)
  }

  const icon = document.createElement("div")
  icon.style.cssText = "position:relative;z-index:2;font-size:64px;line-height:1;margin-bottom:14px;filter:drop-shadow(0 0 18px " + style.accent + ");"
  icon.innerText = String(data.icon || "âœ¦")
  box.appendChild(icon)

  const mobName = document.createElement("div")
  mobName.style.cssText = "position:relative;z-index:2;font-family:Cinzel,serif;font-size:12px;letter-spacing:4px;color:" + style.accent + ";margin-bottom:10px;"
  mobName.innerText = String(data.mobName || "")
  box.appendChild(mobName)

  const title = document.createElement("div")
  title.style.cssText = "position:relative;z-index:2;font-family:'Cinzel Decorative',serif;font-size:clamp(26px,3.8vw,42px);color:#fff3df;text-shadow:0 0 22px " + style.accent + ";margin-bottom:14px;"
  title.innerText = String(data.attackName || "")
  box.appendChild(title)

  if (presentation && presentation.kicker) {
    const kicker = document.createElement("div")
    kicker.className = "mobSpecialKicker"
    kicker.style.color = style.accent
    kicker.innerText = String(presentation.kicker)
    box.appendChild(kicker)
  }

  if (data.flavor) {
    const flavor = document.createElement("div")
    flavor.style.cssText = "position:relative;z-index:2;font-family:'IM Fell English',serif;font-size:clamp(18px,2.5vw,28px);line-height:1.45;color:#ffd7c2;max-width:620px;margin:0 auto 18px auto;"
    flavor.innerText = String(data.flavor)
    box.appendChild(flavor)
  }

  const damage = document.createElement("div")
  damage.style.cssText = "position:relative;z-index:2;font-family:Cinzel,serif;font-size:30px;font-weight:bold;color:" + style.accent + ";text-shadow:0 0 18px " + style.accent + ";"
  damage.innerText = "â†’ " + String(data.target || "") + "  â€¢  -" + clampInteger(data.dmg, 0, 9999) + " HP"
  box.appendChild(damage)

  let sceneAudio = null
  if (presentation && presentation.sound) {
    sceneAudio = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath(presentation.sound) : "audio/" + presentation.sound)
    const specialVolume = Number.isFinite(parseFloat(presentation.soundVolume)) ? parseFloat(presentation.soundVolume) : 0.82
    setManagedAudioBaseVolume(sceneAudio, specialVolume)
    sceneAudio.play().catch(() => {})
  }

  document.body.appendChild(overlay)
  setTimeout(() => { overlay.style.opacity = "1" }, 20)
  setTimeout(() => {
    overlay.style.opacity = "0"
    setTimeout(() => { if (overlay.parentNode) overlay.remove() }, 450)
    db.ref("game/mobAttackEvent").remove()
  }, 3200)
  screenShakeHard()
  if (!scene || ["draugr", "ogre", "melenchon", "balraug"].includes(scene)) screenShakeHard()
  const impactSfx = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath("pow.mp3") : "audio/pow.mp3")
  setManagedAudioBaseVolume(impactSfx, 0.84)
  impactSfx.play().catch(() => {})
}

// â”€â”€â”€ mobAttackEvent â”€â”€â”€
db.ref("game/mobAttackEvent").on("value", snap => {
  const data = snap.val()
  if (!data) return
  if (data.special) {
    showMobSpecialAttackEvent(data)
    return
  }
  const notif = document.createElement("div")
  notif.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999999;text-align:center;pointer-events:none;background:rgba(0,0,0,0.85);border:2px solid rgba(220,40,40,0.7);border-radius:12px;padding:24px 40px;box-shadow:0 0 40px rgba(200,0,0,0.5);opacity:0;transition:opacity 0.3s ease;"
  const icon = document.createElement("div")
  icon.style.cssText = "font-size:48px;margin-bottom:8px;"
  icon.innerText = String(data.icon || "")
  notif.appendChild(icon)
  if (data.mobName) {
    const mobName = document.createElement("div")
    mobName.style.cssText = "font-family:Cinzel,serif;font-size:12px;color:#ff8888;letter-spacing:2px;margin-bottom:4px;"
    mobName.innerText = String(data.mobName)
    notif.appendChild(mobName)
  }
  const attackName = document.createElement("div")
  attackName.style.cssText = "font-family:'Cinzel Decorative',serif;font-size:22px;color:#ff4444;text-shadow:0 0 20px red;letter-spacing:3px;margin-bottom:10px;"
  attackName.innerText = String(data.attackName || "")
  notif.appendChild(attackName)
  const targetLine = document.createElement("div")
  targetLine.style.cssText = "font-family:Cinzel,serif;font-size:18px;color:#ffaaaa;"
  targetLine.appendChild(document.createTextNode("â†’ "))
  const targetStrong = document.createElement("span")
  targetStrong.style.cssText = "color:#fff;font-weight:bold;"
  targetStrong.innerText = String(data.target || "")
  targetLine.appendChild(targetStrong)
  notif.appendChild(targetLine)
  const damage = document.createElement("div")
  damage.style.cssText = "font-family:Cinzel,serif;font-size:28px;color:#ff3333;font-weight:bold;text-shadow:0 0 10px red;margin-top:6px;"
  damage.innerText = "-" + clampInteger(data.dmg, 0, 9999) + " HP"
  notif.appendChild(damage)
  document.body.appendChild(notif)
  setTimeout(() => { notif.style.opacity = "1" }, 30)
  setTimeout(() => {
    notif.style.opacity = "0"
    setTimeout(() => { if (notif.parentNode) notif.remove() }, 500)
    db.ref("game/mobAttackEvent").remove()
  }, 2800)
  screenShakeHard()
  playSound("critSound", 0.6)
})

// â”€â”€â”€ curse/wheel â”€â”€â”€
db.ref("curse/wheel").on("value", snap => {
  const data = snap.val()
  if (!data) {
    window.__curseWheelTriggeredFor = null
    return
  }
  if (data.state === "intro")  showCurseIntro(data.player)
  if (data.state === "wheel")  showCurseWheelScreen(data.player)
  if (data.state === "result") showCurseResult(data.player, data.result)
})

function cleanupRuneChallengeUI() {
  const overlay = document.getElementById("runeChallengeOverlay")
  if (overlay) overlay.remove()
  const playerBtn = document.getElementById("playerCodeBtn")
  if (playerBtn) playerBtn.remove()
  window.activeRuneChallengeData = null
  _state.runeJustOpened = false
}

// â”€â”€â”€ runeChallenge â”€â”€â”€
db.ref("game/runeChallenge").on("value", snap => {
  const data = snap.val()
  const previous = window.activeRuneChallengeData || null
  window.activeRuneChallengeData = data || null
  if (!data || !data.active) {
    cleanupRuneChallengeUI()
    updateRuneMenuBtn(false)
    updateThuumButton()
    return
  }
  if (gameState !== "GAME" && gameState !== "COMBAT") return
  updateRuneMenuBtn(true)
  const overlay = document.getElementById("runeChallengeOverlay")
  const shouldOpenFresh =
    !previous ||
    !previous.active ||
    previous.time !== data.time
  if (overlay) {
    overlay.remove()
    renderRuneChallenge(data)
  } else if (shouldOpenFresh) {
    renderRuneChallenge(data)
  }
  if (isGM && shouldOpenFresh && !_state.runeJustOpened) _state.runeJustOpened = true
  updateThuumButton()
})

function ensureCemeteryGlyphIntro() {
  let g = document.getElementById("glipheOverlay")
  if (!g) {
    g = document.createElement("div")
    g.id = "glipheOverlay"
    g.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;z-index:99999990;opacity:0;transition:opacity 1s ease;"
    const im = document.createElement("img")
    im.src = (typeof resolveImagePath === "function") ? resolveImagePath("gliphe.png") : "images/gliphe.png"
    im.style.cssText = "max-height:70vh;max-width:70vw;object-fit:contain;filter:drop-shadow(0 0 30px purple);"
    g.appendChild(im)
    document.body.appendChild(g)
    const s2 = new Audio((typeof resolveAudioPath === "function") ? resolveAudioPath("spell.mp3") : "audio/spell.mp3")
    setManagedAudioBaseVolume(s2, 0.9)
    s2.play().catch(() => {})
  }
  setTimeout(() => { g.style.opacity = "1" }, 50)
  setTimeout(() => {
    if (typeof startSpellAura === "function") startSpellAura()
  }, 1000)
}

// â”€â”€â”€ cemeterySpell â”€â”€â”€
db.ref("game/cemeterySpell").on("value", snap => {
  const data = snap.val()
  if (!data) return
  if (gameState !== "GAME") return

  if (data.active && !data.glipheShown) {
    ensureCemeteryGlyphIntro()
    return
  }

  if (data.glipheShown) {
    const g = document.getElementById("glipheOverlay")
    if (g) { g.style.opacity = "0"; setTimeout(() => { if (g.parentNode) g.remove() }, 800) }
  }

  if (data.freed) {
    const mg = document.getElementById("spellMiniGame")
    if (mg) { mg.style.opacity = "0"; setTimeout(() => { if (mg.parentNode) mg.remove() }, 800) }
    if (!data.failedByZombie) showSpellFreed()
    if (isGM) db.ref("game/cemeterySpell").remove()
    return
  }

  if (data.glipheShown && !data.freed) renderSpellDiceGame(data)
})

// â”€â”€â”€ playerDeath â”€â”€â”€
db.ref("game/playerDeath").on("value", snap => {
  const data = snap.val()
  if (!data) return
  const pid = data.player
  deadPlayers[pid] = true
  const tok = Array.from(document.querySelectorAll(".token")).find(t => String(t.id || "").toLowerCase() === String(pid || "").toLowerCase())
  if (tok) {
    tok.classList.add("playerDead")
    if (!document.getElementById("skull_" + pid)) {
      const skull = document.createElement("div"); skull.id = "skull_" + pid
      skull.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:36px;z-index:10;animation:skullFloat 2s ease-in-out infinite alternate;"
      skull.innerText = "ðŸ’€"; tok.appendChild(skull)
    }
  }
  showNotification(pid.toUpperCase() + " est tombe !")
  const snd = new Audio("audio/defaite.mp3"); setManagedAudioBaseVolume(snd, 0.6); snd.play().catch(() => {})
  screenShakeHard()
  if (!isGM && getLocalPlayerId() === String(pid || "").toLowerCase()) triggerLocalDefeat("playerDeath")
  if (isGM) {
      db.ref("game/combatOutcome").set({ type: "defeat", player: pid, time: Date.now() })
      setTimeout(() => db.ref("game/combatOutcome").remove(), 6500)
      if (!document.getElementById("revive_" + pid)) {
        const revBtn = document.createElement("button"); revBtn.id = "revive_" + pid
      revBtn.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 24px;font-family:'Cinzel Decorative',serif;font-size:13px;background:linear-gradient(rgba(0,80,0,0.8),rgba(0,40,0,0.8));color:#88ff88;border:2px solid rgba(50,180,50,0.6);border-radius:6px;cursor:pointer;letter-spacing:2px;animation:bifrostPulse 1.5s ease-in-out infinite alternate;"
      revBtn.innerText = "Ressusciter " + pid.toUpperCase()
      revBtn.onclick = () => { revivePlayer(pid); revBtn.remove() }
      document.body.appendChild(revBtn)
    }
  }
  if (isGM) setTimeout(() => db.ref("game/playerDeath").remove(), 1200)
  })

// â”€â”€â”€ combatOutcome â€” victoire/dÃ©faite fiable cÃ´tÃ© joueurs â”€â”€â”€
db.ref("game/combatOutcome").on("value", snap => {
  if (isGM) return
  const data = snap.val()
  if (!data || window.__combatOutcomeShowing) return

  if (data.type === "victory" && (combatActive || gameState === "COMBAT")) {
    showVictory()
    return
  }

  if (data.type === "defeat") {
    const localId = getLocalPlayerId()
    if (!localId) return
    if (data.player && String(data.player).toLowerCase() !== localId) return
    triggerLocalDefeat("combatOutcome")
  }
})

// â”€â”€â”€ playerRevive â”€â”€â”€
db.ref("game/playerRevive").on("value", snap => {
  const data = snap.val()
  if (!data) return
  const pid = data.player
  const tok = document.getElementById(pid)
  if (tok) {
    tok.classList.remove("playerDead")
    const skull = document.getElementById("skull_" + pid)
    if (skull) { skull.style.transition = "opacity 0.5s"; skull.style.opacity = "0"; setTimeout(() => skull.remove(), 500) }
  }
  deadPlayers[pid] = false
  const revBtn = document.getElementById("revive_" + pid)
  if (revBtn) revBtn.remove()
  db.ref("game/playerRevive").remove()
})

// â”€â”€â”€ mob2 et mob3 â”€â”€â”€
;["mob2", "mob3"].forEach(slot => {
  db.ref("combat/" + slot).on("value", snap => {
    const data = snap.val()
    activeMobSlots[slot] = !!data
    const existing = document.getElementById("mobToken_" + slot)
    if (existing) existing.remove()
    if (data && (gameState === "COMBAT" || gameState === "GAME")) {
      spawnExtraMobToken(data, slot)
      renderAllMobPanels()
    }
  })
})

// â”€â”€â”€ elements â”€â”€â”€
db.ref("elements").on("child_added", snap => {
  const data = snap.val()
  if (data && (gameState === "GAME" || gameState === "COMBAT")) renderMapElement(data)
})
db.ref("elements").on("child_changed", snap => {
  const data = snap.val(); if (!data) return
  const el = document.getElementById("elem_" + data.id)
  if (el) { el.style.left = data.x + "px"; el.style.top = data.y + "px" }
})
db.ref("elements").on("child_removed", snap => {
  const el = document.getElementById("elem_" + snap.key)
  if (el) { el.style.transition = "opacity 0.4s"; el.style.opacity = "0"; setTimeout(() => el.remove(), 400) }
})

function syncMapElementsFromDB() {
  if (gameState !== "GAME" && gameState !== "COMBAT") return
  document.querySelectorAll("[id^='elem_']").forEach(el => el.remove())
  db.ref("elements").once("value", snap => {
    const data = snap.val()
    if (!data) return
    Object.values(data).forEach(item => {
      if (item) renderMapElement(item)
    })
  })
}

function syncWantedStateFromDB() {
  db.ref("game/wantedPosters").once("value", snap => {
    const data = snap.val() || null
    window.__wantedPostersData = data || {}
    const list = document.getElementById("wantedList")
    if (list && isGM) {
      list.innerHTML = ""
      if (data) Object.values(data).forEach(p => renderWantedPoster(p))
    }
    if (isGM && typeof cleanupLegacyWantedElements === "function") cleanupLegacyWantedElements()
  })
}

// â”€â”€â”€ wantedPosters â”€â”€â”€
db.ref("game/wantedPosters").on("value", snap => {
  const list = document.getElementById("wantedList")
  const data = snap.val() || null
  window.__wantedPostersData = data || {}
  if (list && isGM) {
    list.innerHTML = ""
    if (data) Object.values(data).forEach(p => renderWantedPoster(p))
  }
  const boardContent = document.getElementById("wantedBoardContent")
  if (boardContent && typeof buildWantedBoardContent === "function") {
    buildWantedBoardContent(boardContent, Object.values(window.__wantedPostersData).filter(Boolean))
  }
  if (isGM && typeof cleanupLegacyWantedElements === "function") cleanupLegacyWantedElements()
})

// â”€â”€â”€ wantedOpen â”€â”€â”€
db.ref("game/wantedOpen").on("value", snap => {
  const data = snap.val()
  const signature = data?.poster?.id && data?.time ? (data.poster.id + ":" + data.time) : (data?.poster?.id || null)
  if (!window.__wantedOpenInitDone) {
    window.__wantedOpenInitDone = true
    window.__wantedOpenLastSignature = signature
    return
  }
  if (!signature || signature === window.__wantedOpenLastSignature) return
  window.__wantedOpenLastSignature = signature
  if (!data || !data.poster) return
  showWantedOverlay(data.poster)
})

// â”€â”€â”€ simonState â”€â”€â”€
db.ref("game/simonState").on("value", snap => {
  const simon = snap.val(); if (!simon || gameState !== "GAME") return
  db.ref("game/cemeterySpell").once("value", s => {
    const spell = s.val()
    if (!spell || !spell.glipheShown || spell.freed) return
    showSimonGame(spell, simon)
  })
})

// â”€â”€â”€ document â€” indices / notes â”€â”€â”€
db.ref("game/document").on("value", snap => {
  _renderDocument(snap.val())
})

// â”€â”€â”€ playerAllyAccess â€” bouton invocations donnÃ© par le MJ â”€â”€â”€
db.ref("game/playerAllyAccess").on("value", snap => {
  if (isGM) return
  const data = snap.val()
  window.playerAllyAccessData = data || null
  const existing = document.getElementById("allyViewerPanel")

  if (!data && existing) existing.remove()
  updateThuumButton()
})

// â”€â”€â”€ playerThuum â€” cris dÃ©bloquÃ©s â”€â”€â”€
db.ref("game/playerThuum").on("value", snap => {
  window.playerThuumData = snap.val() || {}
  updateThuumButton()
  setTimeout(updateThuumButton, 150)
})

db.ref("game/playerThuumAccess").on("value", snap => {
  window.playerThuumAccessData = snap.val() || {}
  updateThuumButton()
})

// â”€â”€â”€ usedThuum â€” cooldown par combat â”€â”€â”€
db.ref("combat/usedThuum").on("value", snap => {
  window.usedThuumData = snap.val() || {}
  updateThuumButton()
  setTimeout(updateThuumButton, 150)
})

// â”€â”€â”€ thuumUnlockEvent â€” dÃ©couverte globale â”€â”€â”€
db.ref("game/thuumUnlockEvent").on("value", snap => {
  const data = snap.val()
  if (!data || !data.time) return
  if (data.time <= window.__lastThuumUnlockTime) return
  window.__lastThuumUnlockTime = data.time
  showThuumUnlockCinematic(data)
  setTimeout(updateThuumButton, 250)
  setTimeout(updateThuumButton, 1200)
})

// â”€â”€â”€ thuumCast â€” utilisation globale â”€â”€â”€
db.ref("game/thuumCast").on("value", snap => {
  const data = snap.val()
  if (!data || !data.time) return
  if (data.time <= window.__lastThuumCastTime) return
  window.__lastThuumCastTime = data.time
  playThuumCastEffect(data)
})

// â”€â”€â”€ allyAction â€” PNJ alliÃ© en combat â”€â”€â”€
db.ref("game/allyAction").on("value", snap => {
  const data = snap.val()
  if (!data) return
  showAllyActionResult(data)
})

// â”€â”€â”€ mapAudio â€” musique spÃ©cifique Ã  la map â”€â”€â”€
db.ref("game/mapAudio").on("value", snap => {
  const data = snap.val()
  if (!data || !data.file) return
  // Attendre que le fade de map soit terminÃ© (1.4s) puis jouer
  setTimeout(() => {
    _musicTransitioning = false; _pendingMusic = null
    if (musicFadeInterval) { clearInterval(musicFadeInterval); musicFadeInterval = null }
    stopAllMusic()
    setTimeout(() => {
      const audioFile = String(data.file || "")
      const resolvedAudio = /^(https?:|data:|blob:|\/|audio\/)/i.test(audioFile) || /\.[a-z0-9]{2,5}$/i.test(audioFile)
        ? audioFile
        : (audioFile ? "audio/" + audioFile + ".mp3" : "")
      if (resolvedAudio) crossfadeMusic(resolvedAudio)
      _state._pendingMapAudio = false
    }, 300)
  }, 1400)
  db.ref("game/mapAudio").remove()
})

}) // fin DOMContentLoaded

/* ========================= */
/* TOKENS                    */
/* ========================= */

function getMaxHP(playerId, level) {
  const s = getPlayerStatsAtLevel(playerId, level || 1)
  return s ? s.hp : 100
}

function updateTokenFromDB(snapshot) {
  const id   = snapshot.key
  const data = snapshot.val()
  if (!data) return
  if (myToken && id === myToken.id) return
  const token = document.getElementById(id)
  if (!token) return
  const currentX = parseInt(token.style.left) || 0
  const currentY = parseInt(token.style.top)  || 0
  if (currentX === data.x && currentY === data.y) return
  token.style.left = data.x + "px"
  token.style.top  = data.y + "px"
  updateTokenStats(id)
  if (data.hp !== undefined) {
    db.ref("characters/" + id + "/lvl").once("value", lvlSnap => {
      const lvl   = parseInt(lvlSnap.val()) || 1
      const maxHP = getMaxHP(id, lvl)
      const bar   = document.getElementById("hp_" + id)
      if (bar) bar.style.width = Math.max(0, Math.min(100, (data.hp / maxHP) * 100)) + "%"
    })
    updateTokenGlow(id, data.hp)
    if (lastHP[id] !== undefined && data.hp < lastHP[id]) damageEffect(id)
    lastHP[id] = data.hp
  }
}

function updateTokenStats(id) {
  const stats = document.getElementById("stats_" + id)
  const bar = document.getElementById("hp_" + id)
  const barLabel = document.getElementById("hp_label_" + id)
  if (!stats && !bar && !barLabel) return
  db.ref("characters/" + id).once("value", snapshot => {
    const data = snapshot.val(); if (!data) return
    const hp         = data.hp || 0
    const curse      = data.curse || 0
    const corruption = data.corruption || 0
    const lvl        = data.lvl || 1

    // Calcul du poids inventaire â€” fonction partagÃ©e avec la fiche
    const weight = data.inventaire && typeof _parseInventoryWeight === "function"
      ? _parseInventoryWeight(data.inventaire)
      : 0

    const token     = document.getElementById(id)
    const maxWeight = data.poids || 100
    if (token) {
      token.classList.toggle("overweight", weight >= maxWeight)
      if ((data.curse || 0) >= 8) { token.classList.add("cursed");    startBloodEffect(token) }
      else                        { token.classList.remove("cursed"); stopBloodEffect(token)  }
    }

    const maxHP   = Math.max(1, parseInt(data.hpMax, 10) || getMaxHP(id, lvl))
    const hpColor = hp > maxHP * 0.6 ? "#3cff6b" : hp > maxHP * 0.3 ? "#ffb347" : "#ff4040"
    let curseIcons = "", powerIcon = ""
    for (let i = 0; i < curse; i++) curseIcons += "?"
    powerIcon = corruption >= 10 ? "?" : ""

    if (stats) {
      stats.innerHTML = `
        <div class="powerText">? Niv ${lvl}</div>
        <div class="hpText" style="color:${hpColor}">? ${hp}/${maxHP}</div>
        ${weight > 0 ? `<div class="weightText">?? ${weight}</div>` : ""}
        ${curseIcons ? `<div class="curseText">${curseIcons}</div>` : ""}
        ${powerIcon  ? `<div class="powerText">${powerIcon}</div>` : ""}
      `
    }

    if (bar) bar.style.width = Math.max(0, Math.min(100, (hp / maxHP) * 100)) + "%"
    if (barLabel) barLabel.textContent = hp + "/" + maxHP
    updateTokenGlow(id, hp)
  })
}

function updateTokenHP() {
  if (!myToken) return
  const hp = parseInt(document.getElementById("hp").value) || 0
  db.ref("characters/" + myToken.id + "/lvl").once("value", lvlSnap => {
    const lvl   = parseInt(lvlSnap.val()) || 1
    const maxHP = getMaxHP(id, lvl)
    const pct   = Math.max(0, Math.min(100, (hp / maxHP) * 100))
    const bar   = document.getElementById("hp_" + myToken.id)
    if (bar) bar.style.width = pct + "%"
    const token = document.getElementById(myToken.id)
    token.classList.remove("lowHP", "midHP", "fullHP")
    if (pct > 60)      token.classList.add("fullHP")
    else if (pct > 30) token.classList.add("midHP")
    else               token.classList.add("lowHP")
  })
  db.ref("characters/" + myToken.id + "/hp").set(hp)
  updateTokenStats(myToken.id)
}

/* ========================= */
/* PERSONNAGES                */
/* ========================= */

function watchCharacter(snapshot) {
  const playerID = snapshot.key
  const data     = snapshot.val()
  if (!data) return

  updateTokenStats(playerID)
  updateGMStats(playerID, data)

  const xp         = parseInt(data.xp)        || 0
  const lvl        = parseInt(data.lvl)        || 1
  const hp         = parseInt(data.hp)         || 0
  const corruption = parseInt(data.corruption) || 0

  const maxHP = Math.max(1, parseInt(data.hpMax, 10) || (100 + (lvl - 1) * 8))
  const bar   = document.getElementById("hp_" + playerID)
  if (bar) bar.style.width = Math.max(0, Math.min(100, (hp / maxHP) * 100)) + "%"
  const barLabel = document.getElementById("hp_label_" + playerID)
  if (barLabel) barLabel.textContent = hp + "/" + maxHP
  updateTokenGlow(playerID, hp)

  const token = document.getElementById(playerID)
  if (token) {
    if (corruption >= 10) {
      token.classList.add("powerReady")
      if (myToken && myToken.id === playerID && !powerModeActive) activatePowerMode(playerID)
    } else {
      token.classList.remove("powerReady", "powerFull")
      powerModeActive = false
      const p1 = document.getElementById("power1Sound")
      if (p1 && myToken && myToken.id === playerID) { p1.pause(); p1.currentTime = 0 }
    }
    const curseVal = parseInt(data.curse) || 0
    if (curseVal >= 8) { token.classList.add("cursed");    startBloodEffect(token) }
    else               { token.classList.remove("cursed"); stopBloodEffect(token)  }
  }

  const localId = getLocalPlayerId()
  const localCurse = parseInt(data.curse) || 0
  if (
    !isGM &&
    localId &&
    String(playerID).toLowerCase() === localId &&
    localCurse >= 8 &&
    !window.__curseWheelTriggeredFor
  ) {
    window.__curseWheelTriggeredFor = localId
    triggerCurseWheel(playerID)
  } else if (
    localId &&
    String(playerID).toLowerCase() === localId &&
    localCurse < 8 &&
    window.__curseWheelTriggeredFor === localId
  ) {
    window.__curseWheelTriggeredFor = null
  }

  // Level up
  const previousLevel = lastLevel[playerID] !== undefined ? lastLevel[playerID] : (lvl - 1)
  let newLevel = 1
  while (xp >= xpForLevel(newLevel + 1)) newLevel++

  if (newLevel > lvl) {
    const computed     = getPlayerStatsAtLevel(playerID, newLevel)
    const prevComputed = getPlayerStatsAtLevel(playerID, lvl)
    const updateData   = { lvl: newLevel }
    if (computed && prevComputed) {
      allStats.forEach(s => {
        updateData[s] = (parseInt(data[s]) || 0) + (computed[s] - prevComputed[s])
      })
      updateData.hp    = computed.hp
      updateData.poids = computed.poids
    } else {
      updateData.hp = getMaxHP(playerId, newLevel)
    }
    db.ref("characters/" + playerID).update(updateData)

    if (newLevel > previousLevel && !pendingLevelUp["_shown_" + playerID + "_" + newLevel]) {
      pendingLevelUp["_shown_" + playerID + "_" + newLevel] = true
      const sheet = document.getElementById("characterSheet")
      if (sheet && sheet.style.display === "block") pendingLevelUp[playerID] = true
      else triggerLevelUp(playerID)
    }

  }
  lastLevel[playerID] = lvl
}

function triggerLevelUp(playerID) {
  showNotification(playerID.toUpperCase() + " LEVEL UP !")
  addMJLog(playerID.toUpperCase() + " LEVEL UP")
  showLevelUpEffect(playerID)
  showLevelUpText(playerID)
  playSound("levelUpSound")
  // Donner 2 points libres Ã  distribuer
  db.ref("characters/" + playerID + "/freePoints").once("value", snap => {
    const current = parseInt(snap.val()) || 0
    db.ref("characters/" + playerID + "/freePoints").set(current + 2)
  })
}

function updateGMStats(playerID, data) {
  const box = document.getElementById("gmStats_" + playerID)
  if (!box) return
  let curseIcons = ""
  for (let i = 0; i < (data.curse || 0); i++) curseIcons += "?"
  box.innerHTML = `<div class="gmMiniHPText">? ${data.hp || 0}</div><div class="gmMiniCurse">${curseIcons}</div><div class="gmMiniPower">${(data.corruption || 0) >= 10 ? "?" : ""}</div>`
}

function getPartyLevel(callback) {
  const players = ["greg", "ju", "elo", "bibi"]
  let total = 0, count = 0
  players.forEach(p => {
    db.ref("characters/" + p + "/lvl").once("value", snap => {
      total += parseInt(snap.val()) || 1
      if (++count === players.length) callback(Math.round(total / players.length))
    })
  })
}

function ensureMapMusicPlayback(mapName, delay = 0) {
  setTimeout(() => {
    if (!mapName || !mapMusic[mapName]) return
    crossfadeMusic(mapMusic[mapName])
    setTimeout(() => {
      const active = currentMusic === "A" ? document.getElementById("musicA") : document.getElementById("musicB")
      const hasPlayback = !!(active && !active.paused && active.src && active.volume > 0.01)
      if (!hasPlayback) {
        crossfadeMusic(mapMusic[mapName])
        setTimeout(() => {
          const retryActive = currentMusic === "A" ? document.getElementById("musicA") : document.getElementById("musicB")
          const retryOk = !!(retryActive && !retryActive.paused && retryActive.src && retryActive.volume > 0.01)
          if (retryOk) return
          const direct = document.getElementById("musicA")
          if (!direct) return
          const src = /^(https?:|data:|blob:|\/|audio\/)/i.test(mapMusic[mapName]) ? mapMusic[mapName] : "audio/" + mapMusic[mapName]
          stopAllMusic()
          direct.src = src
          direct.loop = true
          direct.currentTime = 0
          direct.__baseVolume = 1
          direct.__audioChannel = "music"
          direct.volume = (typeof getUserMusicVolume === "function") ? getUserMusicVolume() : 0.8
          direct.play().catch(() => {})
          currentMusic = "A"
        }, 700)
      }
    }, 1200)
  }, delay)
}

function playInitialMapMusic(mapName) {
  if (!mapName || !mapMusic[mapName]) return
  const direct = document.getElementById("musicA")
  if (!direct) return
  const src = /^(https?:|data:|blob:|\/|audio\/)/i.test(mapMusic[mapName]) ? mapMusic[mapName] : "audio/" + mapMusic[mapName]
  stopAllMusic()
  direct.src = src
  direct.loop = true
  direct.currentTime = 0
  direct.__baseVolume = 1
  direct.__audioChannel = "music"
  direct.volume = (typeof getUserMusicVolume === "function") ? getUserMusicVolume() : 0.8
  direct.play().catch(() => {})
  currentMusic = "A"
}

function primeMapMusicChannels() {
  ;["musicA", "musicB"].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    try {
      el.muted = true
      el.volume = 0
      const maybePromise = el.play()
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(() => {
          try { el.pause() } catch (_) {}
          try { el.currentTime = 0 } catch (_) {}
          el.muted = false
        }).catch(() => {
          el.muted = false
        })
      } else {
        try { el.pause() } catch (_) {}
        try { el.currentTime = 0 } catch (_) {}
        el.muted = false
      }
    } catch (_) {
      el.muted = false
    }
  })
}

function revivePlayer(playerId) {
  deadPlayers[playerId] = false
  db.ref("characters/" + playerId + "/hp").set(1)
  const tok = document.getElementById(playerId)
  if (tok) {
    tok.classList.remove("playerDead")
    const skull = document.getElementById("skull_" + playerId)
    if (skull) skull.remove()
  }
  showNotification(playerId.toUpperCase() + " revient a la vie !")
  db.ref("game/playerRevive").set({ player: playerId, time: Date.now() })
}

/* ========================= */
/* MAP                       */
/* ========================= */

function changeMap(mapName, customAudio) {
  if (!isGM) return
  _musicTransitioning = false; _pendingMusic = null
  if (musicFadeInterval) { clearInterval(musicFadeInterval); musicFadeInterval = null }
  maybeSpawnMapLoreBook(mapName)
  // Un seul set â€” pas de set(null) puis set(valeur)
  db.ref("game/map").set(mapName)
  // Audio spÃ©cifique Ã  la map si fourni
  if (customAudio) {
    _state._pendingMapAudio = true
    db.ref("game/mapAudio").set({ file: customAudio, time: Date.now() })
  } else {
    _state._pendingMapAudio = false
  }
  try {
    const customization = typeof getCustomization === "function" ? getCustomization() : null
    const startMapId = customization && customization.project ? String(customization.project.startMapId || "") : ""
    const startMapAsset = customization && customization.project ? String(customization.project.startMapAsset || "") : ""
    const startMapLabel = customization && customization.project ? String(customization.project.startMapLabel || "") : ""
    if (startMapId && String(mapName || "") === startMapId && startMapAsset) {
      const map = document.getElementById("map")
      if (map) {
        map.style.setProperty("background", "url('" + String(startMapAsset).replace(/'/g, "\\'") + "') center / cover no-repeat", "important")
      }
      currentMap = startMapId
      window.__latestMapValue = startMapId
      if (startMapLabel && typeof showLocation === "function") {
        setTimeout(() => {
          try { showLocation(startMapLabel) } catch (_) {}
        }, 120)
      }
    }
  } catch (_) {}
  document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" })
}

/* ========================= */
/* XP                        */
/* ========================= */

function giveXP(amount) {
  if (!isGM) return
  ;["greg", "ju", "elo", "bibi"].forEach(player => {
    db.ref("characters/" + player + "/xp").once("value", snap => {
      db.ref("characters/" + player + "/xp").set((parseInt(snap.val()) || 0) + amount)
    })
  })
  showXPMessage(amount)
  addMJLog("? MJ donne " + amount + " XP au groupe")
}

/* ========================= */
/* SAUVEGARDE                */
/* ========================= */

function sanitizeSandboxSaveFileName(rawTitle) {
  return String(rawTitle || "bac-a-sable")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "bac-a-sable"
}

function getSandboxLiveStoryImageValue(slot) {
  try {
    const map = {
      1: "storyImageContent",
      2: "storyImageContent2",
      3: "storyImageContent3"
    }
    const el = document.getElementById(map[slot] || "")
    return el && el.getAttribute ? String(el.getAttribute("src") || "").trim() : ""
  } catch (_) {}
  return ""
}

function readSandboxRefWithTimeout(refPath, fallbackValue) {
  return new Promise(function(resolve) {
    let settled = false
    const done = function(value) {
      if (settled) return
      settled = true
      resolve(value)
    }
    const timer = setTimeout(function() {
      done(typeof fallbackValue === "function" ? fallbackValue() : fallbackValue)
    }, 600)
    try {
      db.ref(refPath).once("value").then(function(snapshot) {
        clearTimeout(timer)
        done(snapshot && typeof snapshot.val === "function" ? snapshot.val() : null)
      }).catch(function() {
        clearTimeout(timer)
        done(typeof fallbackValue === "function" ? fallbackValue() : fallbackValue)
      })
    } catch (_) {
      clearTimeout(timer)
      done(typeof fallbackValue === "function" ? fallbackValue() : fallbackValue)
    }
  })
}

function collectSandboxLocalSaveData() {
  const customization = typeof getCustomization === "function"
    ? getCustomization()
    : (typeof getDefaultCustomization === "function" ? getDefaultCustomization() : {})
  let runtimeMapsSnapshot = []
  let runtimePnjsSnapshot = []
  try {
    customization.project = customization.project && typeof customization.project === "object" ? customization.project : {}
    customization.content = customization.content && typeof customization.content === "object" ? customization.content : {}
    const liveTheme = String(
      window.__currentProjectTheme
      || (document.body && document.body.getAttribute("data-project-theme"))
      || (document.documentElement && document.documentElement.getAttribute("data-project-theme"))
      || customization.project.theme
      || "medieval_fantasy"
    ).trim() || "medieval_fantasy"
    const livePlayerCount = Math.max(
      1,
      Math.min(
        12,
        parseInt(
          (document.body && document.body.getAttribute("data-sandbox-player-count"))
          || customization.project.playerCount
          || 4,
          10
        ) || 4
      )
    )
    const liveTitle = String(
      customization.project.title
      || (document.getElementById("gameTitle") && document.getElementById("gameTitle").textContent)
      || document.title
      || "Roleplay It Yourself"
    ).trim() || "Roleplay It Yourself"
    customization.project.theme = liveTheme
    customization.project.playerCount = livePlayerCount
    customization.project.title = liveTitle
    if (typeof getSimpleSandboxMaps === "function") {
      runtimeMapsSnapshot = getSimpleSandboxMaps().map(function(item) { return { ...item } })
      customization.content.maps = runtimeMapsSnapshot.map(function(item) { return { ...item } })
    }
    if (typeof getSimpleSandboxPnjs === "function") {
      runtimePnjsSnapshot = getSimpleSandboxPnjs().map(function(item) { return { ...item } })
      customization.content.pnjs = runtimePnjsSnapshot.map(function(item) { return { ...item } })
    }
  } catch (_) {}
  const playerIds = Object.keys((customization && customization.players) || {}).filter(Boolean)
  const basePlayerIds = playerIds.length ? playerIds : ["greg", "ju", "elo", "bibi"]
  const refs = [
    { key: "elements", ref: "elements", fallback: null },
    { key: "game.map", ref: "game/map", fallback: function() { return window.__latestMapValue || currentMap || "" } },
    { key: "game.wantedPosters", ref: "game/wantedPosters", fallback: function() { return window.__wantedPostersData || null } },
    { key: "game.wantedOpen", ref: "game/wantedOpen", fallback: null },
    { key: "game.runeChallenge", ref: "game/runeChallenge", fallback: null },
    { key: "game.mapLoreBook", ref: "game/mapLoreBook", fallback: function() { return window.mapLoreBookData || null } },
    { key: "game.readLoreBooks", ref: "game/readLoreBooks", fallback: function() { return window.readLoreBooksData || null } },
    { key: "game.storyImage", ref: "game/storyImage", fallback: function() { return getSandboxLiveStoryImageValue(1) || null } },
    { key: "game.storyImage2", ref: "game/storyImage2", fallback: function() { return getSandboxLiveStoryImageValue(2) || null } },
    { key: "game.storyImage3", ref: "game/storyImage3", fallback: function() { return getSandboxLiveStoryImageValue(3) || null } }
  ]

  basePlayerIds.forEach(function(playerId) {
    refs.push({ key: "characters." + playerId, ref: "characters/" + playerId, fallback: {} })
    if (["greg", "ju", "elo", "bibi"].includes(playerId)) {
      refs.push({ key: "tokens." + playerId, ref: "tokens/" + playerId, fallback: {} })
    }
  })

  return Promise.all(refs.map(function(entry) {
    return readSandboxRefWithTimeout(entry.ref, entry.fallback).then(function(value) {
      return { key: entry.key, value: value }
    })
  })).then(function(entries) {
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      customization: customization,
      sandboxState: {
        title: String(customization && customization.project && customization.project.title || "Roleplay It Yourself").trim() || "Roleplay It Yourself",
        theme: String(customization && customization.project && customization.project.theme || "medieval_fantasy").trim() || "medieval_fantasy",
        playerCount: Math.max(1, Math.min(12, parseInt(customization && customization.project && customization.project.playerCount, 10) || 4)),
        startMapId: String(customization && customization.project && customization.project.startMapId || window.__onboardingStartMapId || "").trim(),
        startMapAsset: String(customization && customization.project && customization.project.startMapAsset || window.__onboardingStartMapAsset || "").trim(),
        startMapLabel: String(customization && customization.project && customization.project.startMapLabel || window.__onboardingStartMapLabel || "").trim(),
        maps: runtimeMapsSnapshot.map(function(item) { return { ...item } }),
        pnjs: runtimePnjsSnapshot.map(function(item) { return { ...item } }),
        currentMap: String(window.__latestMapValue || currentMap || "").trim()
      },
      characters: {},
      tokens: {},
      elements: null,
      game: {}
    }

    entries.forEach(function(entry) {
      const key = entry.key
      const value = entry.value
      if (key === "elements") {
        payload.elements = value || null
        return
      }
      if (key.indexOf("characters.") === 0) {
        payload.characters[key.split(".")[1]] = value || {}
        return
      }
      if (key.indexOf("tokens.") === 0) {
        payload.tokens[key.split(".")[1]] = value || {}
        return
      }
      if (key.indexOf("game.") === 0) {
        payload.game[key.split(".")[1]] = value
      }
    })

    basePlayerIds.forEach(function(playerId) {
      let localSheet = {}
      let liveSheet = {}
      try {
        if (typeof loadSimpleSheetLocal === "function") {
          localSheet = loadSimpleSheetLocal(playerId) || {}
        }
      } catch (_) {}
      try {
        const overlay = document.getElementById("simpleSheetTestOverlay")
        const panel = overlay ? overlay.querySelector('.simpleSheetPanel[data-player-id="' + String(playerId || "") + '"]') : null
        if (panel && typeof collectSimpleSheetData === "function") {
          liveSheet = collectSimpleSheetData(panel) || {}
        }
      } catch (_) {}
      payload.characters[playerId] = {
        ...(payload.characters[playerId] || {}),
        ...(localSheet || {}),
        ...(liveSheet || {})
      }
    })

    return payload
  })
}

function downloadSandboxLocalSaveFile() {
  Promise.resolve(collectSandboxLocalSaveData()).then(function(payload) {
    const title = payload && payload.customization && payload.customization.project
      ? payload.customization.project.title
      : "bac-a-sable"
    const fileName = sanitizeSandboxSaveFileName(title) + "-" + new Date().toISOString().slice(0, 10) + ".json"
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    setTimeout(function() {
      URL.revokeObjectURL(url)
      if (link.parentNode) link.parentNode.removeChild(link)
    }, 0)
    if (typeof showNotification === "function") showNotification("Fichier de sauvegarde telecharge")
  }).catch(function(error) {
    console.error("downloadSandboxLocalSaveFile failed:", error)
    if (typeof showNotification === "function") showNotification("Sauvegarde fichier impossible")
  })
  return false
}

function resolveLoadedSandboxCustomization(data) {
  try {
    const safeData = data && typeof data === "object" ? data : {}
    const base = typeof getDefaultCustomization === "function" ? getDefaultCustomization() : {
      project: {},
      players: {},
      assets: {},
      content: { maps: [], pnjs: [], highPnjs: [], mobs: [], documents: [] }
    }
    const customization = safeData.customization && typeof safeData.customization === "object"
      ? JSON.parse(JSON.stringify(safeData.customization))
      : JSON.parse(JSON.stringify(base))
    customization.project = customization.project && typeof customization.project === "object" ? customization.project : {}
    customization.players = customization.players && typeof customization.players === "object" ? customization.players : {}
    customization.assets = customization.assets && typeof customization.assets === "object" ? customization.assets : {}
    customization.content = customization.content && typeof customization.content === "object"
      ? customization.content
      : { maps: [], pnjs: [], highPnjs: [], mobs: [], documents: [] }
    customization.content.maps = Array.isArray(customization.content.maps) ? customization.content.maps : []
    customization.content.pnjs = Array.isArray(customization.content.pnjs) ? customization.content.pnjs : []
    customization.content.highPnjs = Array.isArray(customization.content.highPnjs) ? customization.content.highPnjs : []
    customization.content.mobs = Array.isArray(customization.content.mobs) ? customization.content.mobs : []
    customization.content.documents = Array.isArray(customization.content.documents) ? customization.content.documents : []

    const sandboxState = safeData.sandboxState && typeof safeData.sandboxState === "object"
      ? safeData.sandboxState
      : {}

    const savedTheme = String(
      sandboxState.theme
      || customization.project.theme
      || "medieval_fantasy"
    ).trim() || "medieval_fantasy"
    const savedPlayerCount = Math.max(
      1,
      Math.min(
        12,
        parseInt(
          sandboxState.playerCount
          || customization.project.playerCount
          || 4,
          10
        ) || 4
      )
    )
    const savedTitle = String(
      sandboxState.title
      || customization.project.title
      || "Roleplay It Yourself"
    ).trim() || "Roleplay It Yourself"

    customization.project.theme = savedTheme
    customization.project.playerCount = savedPlayerCount
    customization.project.title = savedTitle

    const startMapId = String(
      sandboxState.startMapId
      || customization.project.startMapId
      || ""
    ).trim()
    const startMapAsset = String(
      sandboxState.startMapAsset
      || customization.project.startMapAsset
      || ""
    ).trim()
    const startMapLabel = String(
      sandboxState.startMapLabel
      || customization.project.startMapLabel
      || ""
    ).trim()
    if (startMapId) customization.project.startMapId = startMapId
    if (startMapAsset) customization.project.startMapAsset = startMapAsset
    if (startMapLabel) customization.project.startMapLabel = startMapLabel

    if (Array.isArray(sandboxState.maps)) {
      customization.content.maps = sandboxState.maps.map(function(item, index) {
        return {
          id: String(item && item.id || ("map_" + index)),
          label: String(item && item.label || "Sans titre"),
          map: String(item && item.map || ""),
          category: String(item && item.category || "Custom"),
          section: String(item && item.section || "lieux"),
          audio: String(item && item.audio || "")
        }
      })
    }

    if (Array.isArray(sandboxState.pnjs)) {
      customization.content.pnjs = sandboxState.pnjs.map(function(item, index) {
        return {
          id: String(item && item.id || ("pnj_" + index)),
          label: String(item && item.label || "PNJ"),
          image: String(item && item.image || ""),
          category: String(item && item.category || "Custom")
        }
      })
    }

    return customization
  } catch (error) {
    console.error("resolveLoadedSandboxCustomization failed:", error)
  }
  return typeof getDefaultCustomization === "function" ? getDefaultCustomization() : {}
}

async function saveSandboxToLocalFolder() {
  try {
    if (typeof window.showDirectoryPicker !== "function") {
      return downloadSandboxLocalSaveFile()
    }
    let directoryHandle = window.__sandboxDirectoryHandle || null
    if (!directoryHandle) {
      directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" })
    }
    if (directoryHandle && typeof directoryHandle.requestPermission === "function") {
      const permission = await directoryHandle.requestPermission({ mode: "readwrite" })
      if (permission !== "granted") throw new Error("directory permission denied")
    }
    const payload = await collectSandboxLocalSaveData()
    const fileHandle = await directoryHandle.getFileHandle("roleplay-save.json", { create: true })
    if (fileHandle && typeof fileHandle.requestPermission === "function") {
      const filePermission = await fileHandle.requestPermission({ mode: "readwrite" })
      if (filePermission !== "granted") throw new Error("file permission denied")
    }
    const writable = await fileHandle.createWritable()
    const raw = JSON.stringify(payload, null, 2)
    await writable.write(raw)
    await writable.close()
    const verifyFile = await fileHandle.getFile()
    const verifyText = await verifyFile.text()
    if (!verifyText || verifyText.length < 10) throw new Error("empty save file after write")
    window.__sandboxDirectoryHandle = directoryHandle
    window.__sandboxLastDirectoryName = directoryHandle && directoryHandle.name ? String(directoryHandle.name) : ""
    if (typeof showNotification === "function") {
      showNotification("Bac a sable sauvegarde dans " + (window.__sandboxLastDirectoryName || "le dossier choisi"))
    }
  } catch (error) {
    if (error && error.name === "AbortError") return false
    console.error("saveSandboxToLocalFolder failed:", error)
    if (typeof showNotification === "function") showNotification("Sauvegarde dossier impossible")
  }
  return false
}

function applySandboxLocalLoadSnapshot(data, options) {
  try {
    const safeData = data && typeof data === "object" ? data : {}
    const customization = resolveLoadedSandboxCustomization(safeData)
    if (typeof saveCustomization === "function") {
      saveCustomization(customization)
    }
    try {
      const maps = customization && customization.content && Array.isArray(customization.content.maps)
        ? customization.content.maps
        : []
      window.__simpleSandboxMaps = maps.map((item, index) => ({
        id: String(item && item.id || ("map_" + index)),
        label: String(item && item.label || "Sans titre"),
        map: String(item && item.map || ""),
        category: String(item && item.category || "Custom"),
        section: String(item && item.section || "lieux"),
        audio: String(item && item.audio || "")
      }))
    } catch (_) {}
    try {
      const pnjs = customization && customization.content && Array.isArray(customization.content.pnjs)
        ? customization.content.pnjs
        : []
      window.__simpleSandboxPnjs = pnjs.map((item, index) => ({
        id: String(item && item.id || ("pnj_" + index)),
        label: String(item && item.label || "PNJ"),
        image: String(item && item.image || ""),
        category: String(item && item.category || "Custom")
      }))
    } catch (_) {}
    try {
      Object.entries(safeData.characters || {}).forEach(function(entry) {
        var pid = entry[0]
        var value = entry[1] || {}
        if (typeof saveSimpleSheetLocal === "function") saveSimpleSheetLocal(pid, value)
      })
    } catch (_) {}
    try {
      const project = customization && customization.project ? customization.project : {}
      window.__onboardingStartMapId = String(project.startMapId || "").trim()
      window.__onboardingStartMapAsset = String(project.startMapAsset || "").trim()
      window.__onboardingStartMapLabel = String(project.startMapLabel || "").trim()
      const projectTheme = String(project.theme || "medieval_fantasy").trim() || "medieval_fantasy"
      const projectPlayerCount = Math.max(1, Math.min(12, parseInt(project.playerCount, 10) || 4))
      if (typeof applyProjectThemeToDocument === "function") {
        applyProjectThemeToDocument(projectTheme)
      } else if (document.body) {
        document.body.setAttribute("data-project-theme", projectTheme)
      }
      if (document.body) {
        document.body.setAttribute("data-sandbox-player-count", String(projectPlayerCount))
      }
      try {
        if (typeof forceSandboxPlayerVisibility === "function") {
          forceSandboxPlayerVisibility(projectPlayerCount)
        }
      } catch (_) {}
    } catch (_) {}
    try {
      const preferredCurrentMap = String(
        (safeData.sandboxState && safeData.sandboxState.currentMap)
        || (safeData.game && safeData.game.map)
        || ""
      ).trim()
      if (preferredCurrentMap) {
        currentMap = preferredCurrentMap
        window.__latestMapValue = currentMap
      }
    } catch (_) {}
    try {
      if (typeof renderMapMenu === "function") renderMapMenu()
      if (typeof renderPNJMenu === "function") renderPNJMenu()
      if (typeof applyCustomizationToUI === "function") applyCustomizationToUI()
    } catch (_) {}
    try {
      const project = customization && customization.project ? customization.project : {}
      const startMapAsset = String(project.startMapAsset || "").trim()
      const startMapLabel = String(project.startMapLabel || "").trim() || "Map de depart"
      const visibleMapAsset = startMapAsset || String((safeData.game && safeData.game.map) || "").trim()
      if (visibleMapAsset) {
        if (typeof simpleRenderSandboxMap === "function") {
          simpleRenderSandboxMap(startMapLabel, visibleMapAsset)
        } else {
          const map = document.getElementById("map")
          if (map) {
            map.style.setProperty("background", "url('" + visibleMapAsset.replace(/'/g, "\\'") + "') center / cover no-repeat", "important")
          }
        }
      }
    } catch (_) {}
    try { ensureSandboxStudioChromeVisible() } catch (_) {}
    if (options && options.openSandboxAfterLoad && typeof openSandboxAfterProjectCreation === "function") {
      try {
        window.__skipIntroHub = true
        openSandboxAfterProjectCreation("Bac a sable charge")
      } catch (_) {}
    }
    try {
      setTimeout(function() {
        try {
          if (typeof applyCustomizationToUI === "function") applyCustomizationToUI()
          ensureSandboxStudioChromeVisible()
        } catch (_) {}
      }, 80)
    } catch (_) {}
    return true
  } catch (error) {
    console.error("applySandboxLocalLoadSnapshot failed:", error)
  }
  return false
}

function promptLoadSandboxLocalSaveFile(options) {
  return new Promise(function(resolve) {
    try {
      const chooser = document.createElement("input")
      chooser.type = "file"
      chooser.accept = ".json,application/json"
      chooser.style.display = "none"
      chooser.addEventListener("change", function() {
        const file = chooser.files && chooser.files[0]
        if (!file) {
          if (chooser.parentNode) chooser.parentNode.removeChild(chooser)
          resolve(false)
          return
        }
        const reader = new FileReader()
        reader.onload = function() {
          try {
            const parsed = JSON.parse(String(reader.result || "{}"))
            if (typeof _applyLoadData !== "function") throw new Error("load function missing")
            applySandboxLocalLoadSnapshot(parsed, options)
            _applyLoadData(parsed, function() {
              if (typeof showNotification === "function") showNotification("Fichier charge")
              resolve(true)
            })
          } catch (error) {
            console.error("promptLoadSandboxLocalSaveFile parse/apply failed:", error)
            if (typeof showNotification === "function") showNotification("Fichier invalide")
            resolve(false)
          } finally {
            if (chooser.parentNode) chooser.parentNode.removeChild(chooser)
          }
        }
        reader.onerror = function(error) {
          console.error("promptLoadSandboxLocalSaveFile read failed:", error)
          if (typeof showNotification === "function") showNotification("Lecture du fichier impossible")
          if (chooser.parentNode) chooser.parentNode.removeChild(chooser)
          resolve(false)
        }
        reader.readAsText(file)
      }, { once: true })
      document.body.appendChild(chooser)
      chooser.click()
    } catch (error) {
      console.error("promptLoadSandboxLocalSaveFile failed:", error)
      if (typeof showNotification === "function") showNotification("Chargement fichier impossible")
      resolve(false)
    }
  })
}

async function promptLoadSandboxFromLocalFolder(options) {
  try {
    if (typeof window.showDirectoryPicker !== "function") {
      return promptLoadSandboxLocalSaveFile(options)
    }
    let directoryHandle = window.__sandboxDirectoryHandle || null
    if (!directoryHandle) {
      directoryHandle = await window.showDirectoryPicker()
    }
    const fileHandle = await directoryHandle.getFileHandle("roleplay-save.json")
    const file = await fileHandle.getFile()
    const text = await file.text()
    const parsed = JSON.parse(String(text || "{}"))
    if (typeof _applyLoadData !== "function") throw new Error("load function missing")
    applySandboxLocalLoadSnapshot(parsed, options)
    _applyLoadData(parsed, function() {
      window.__sandboxDirectoryHandle = directoryHandle
      window.__sandboxLastDirectoryName = directoryHandle && directoryHandle.name ? String(directoryHandle.name) : ""
      if (typeof showNotification === "function") {
        showNotification("Bac a sable charge depuis " + (window.__sandboxLastDirectoryName || "le dossier choisi"))
      }
    })
    return true
  } catch (error) {
    if (error && error.name === "AbortError") return false
    console.error("promptLoadSandboxFromLocalFolder failed:", error)
    if (typeof showNotification === "function") showNotification("Chargement dossier impossible")
  }
  return false
}

function saveGame() {
  showNotification("Les anciennes sauvegardes ont ete retirees")
}

function _applyLoadData(data, callback) {
  const ops = []
  const pushOp = (label, promise) => { ops.push({ label, promise }) }
  const resolvedCustomization = resolveLoadedSandboxCustomization(data)
  const persistLoadedSimpleSheetLocal = (playerId, raw) => {
    try {
      if (typeof saveSimpleSheetLocal === "function") {
        saveSimpleSheetLocal(playerId, raw || {})
        return
      }
    } catch (_) {}
    try {
      localStorage.setItem("rpg_simple_sheet_" + String(playerId || "unknown"), JSON.stringify(raw || {}))
    } catch (_) {}
  }
  if (typeof saveCustomization === "function" && typeof getDefaultCustomization === "function") {
    saveCustomization(resolvedCustomization && typeof resolvedCustomization === "object"
      ? resolvedCustomization
      : getDefaultCustomization())
  }
  const normalizeLoadedCharacterData = (playerId, raw) => {
    const level = clampInteger(raw?.lvl, 1, 99)
    const defaults = getPlayerStatsAtLevel(playerId, level) || getPlayerStatsAtLevel(playerId, 1) || {}
    return {
      ...(raw || {}),
      lvl: level,
      xp: clampInteger(raw?.xp, 0, 999999),
      hp: clampInteger(raw?.hp, 0, 999),
      poids: clampInteger(raw?.poids, 0, 999),
      force: clampInteger(raw?.force, 0, 999),
      charme: clampInteger(raw?.charme, 0, 999),
      perspi: clampInteger(raw?.perspi, 0, 999),
      chance: clampInteger(raw?.chance, 0, 999),
      defense: clampInteger(raw?.defense, 0, 999),
      curse: clampInteger(raw?.curse, 0, 8),
      corruption: clampInteger(raw?.corruption, 0, 10),
      freePoints: clampInteger(raw?.freePoints, 0, 999),
      gold: clampInteger(raw?.gold, 0, 999999),
      inventaire: String(raw?.inventaire ?? ""),
      notes: String(raw?.notes ?? ""),
      cursedEffect: raw?.cursedEffect == null ? null : String(raw.cursedEffect),
      ...Object.fromEntries(
        Object.entries(defaults)
          .filter(([key]) => !["lvl","xp","curse","corruption","freePoints","gold","inventaire","notes"].includes(key))
          .filter(([key]) => raw?.[key] == null)
      )
    }
  }
  const normalizeLoadedTokenData = raw => ({
    x: clampInteger(raw?.x, -5000, 5000),
    y: clampInteger(raw?.y, -5000, 5000)
  })

  window.__combatOutcomeShowing = false
  window.__pendingLocalDefeat = false

  // Ã‰criture directe sur chaque ref â€” pas de update() depuis la racine avec des slashes
  if (data.characters) {
    Object.entries(data.characters).forEach(([pid, value]) => {
      persistLoadedSimpleSheetLocal(pid, value || {})
      pushOp("characters/" + pid, db.ref("characters/" + pid).set(normalizeLoadedCharacterData(pid, value)))
    })
  }
  if (data.tokens) {
    Object.entries(data.tokens).forEach(([pid, value]) => {
      pushOp("tokens/" + pid, db.ref("tokens/" + pid).set(normalizeLoadedTokenData(value)))
    })
  }
  if (data.elements)            pushOp("elements", db.ref("elements").set(data.elements))
  else                          pushOp("elements", db.ref("elements").remove())
  if (data.game?.map)           pushOp("game/map", db.ref("game/map").set(data.game.map))
  if (data.game?.wantedPosters) pushOp("game/wantedPosters", db.ref("game/wantedPosters").set(data.game.wantedPosters))
  else                          pushOp("game/wantedPosters", db.ref("game/wantedPosters").remove())
  if (data.game?.wantedOpen)    pushOp("game/wantedOpen", db.ref("game/wantedOpen").set(data.game.wantedOpen))
  else                          pushOp("game/wantedOpen", db.ref("game/wantedOpen").remove())
  if (data.game?.runeChallenge) pushOp("game/runeChallenge", db.ref("game/runeChallenge").set(data.game.runeChallenge))
  else                          pushOp("game/runeChallenge", db.ref("game/runeChallenge").remove())
  if (data.game?.mapLoreBook)   pushOp("game/mapLoreBook", db.ref("game/mapLoreBook").set(data.game.mapLoreBook))
  else                          pushOp("game/mapLoreBook", db.ref("game/mapLoreBook").remove())
  if (data.game?.readLoreBooks) pushOp("game/readLoreBooks", db.ref("game/readLoreBooks").set(data.game.readLoreBooks))
  else                          pushOp("game/readLoreBooks", db.ref("game/readLoreBooks").remove())
  if (data.game?.storyImage)    pushOp("game/storyImage", db.ref("game/storyImage").set(data.game.storyImage))
  else                          pushOp("game/storyImage", db.ref("game/storyImage").remove())
  if (data.game?.storyImage2)   pushOp("game/storyImage2", db.ref("game/storyImage2").set(data.game.storyImage2))
  else                          pushOp("game/storyImage2", db.ref("game/storyImage2").remove())
  if (data.game?.storyImage3)   pushOp("game/storyImage3", db.ref("game/storyImage3").set(data.game.storyImage3))
  else                          pushOp("game/storyImage3", db.ref("game/storyImage3").remove())
  pushOp("events/aurora", db.ref("events/aurora").remove())

  // Nettoyage
  pushOp("combat", db.ref("combat").remove())
  pushOp("game/shop", db.ref("game/shop").remove())
  pushOp("game/cemeterySpell", db.ref("game/cemeterySpell").remove())
  pushOp("curse/wheel", db.ref("curse/wheel").remove())
  pushOp("game/bifrostFlash", db.ref("game/bifrostFlash").remove())
  pushOp("game/mobAttackEvent", db.ref("game/mobAttackEvent").remove())
  pushOp("game/combatState", db.ref("game/combatState").remove())
  pushOp("game/combatOutcome", db.ref("game/combatOutcome").remove())
  pushOp("game/playerDeath", db.ref("game/playerDeath").remove())
  pushOp("game/playerRevive", db.ref("game/playerRevive").remove())
  pushOp("game/playerAllyAccess", db.ref("game/playerAllyAccess").remove())
  pushOp("game/playerThuum", db.ref("game/playerThuum").remove())
  pushOp("game/playerThuumAccess", db.ref("game/playerThuumAccess").remove())
  pushOp("game/thuumCast", db.ref("game/thuumCast").remove())
  pushOp("game/thuumUnlockEvent", db.ref("game/thuumUnlockEvent").remove())
  pushOp("game/allyAction", db.ref("game/allyAction").remove())
  pushOp("game/odinVision", db.ref("game/odinVision").remove())
  pushOp("game/powerSound", db.ref("game/powerSound").remove())
  pushOp("game/document", db.ref("game/document").remove())

  Promise.allSettled(ops.map(op => op.promise)).then(results => {
    const failed = results
      .map((result, idx) => ({ result, label: ops[idx].label }))
      .filter(entry => entry.result.status === "rejected")

    if (failed.length) {
      console.error("Load error:", failed)
      try {
        showNotification("Chargement partiel: " + failed.map(f => f.label).join(", "))
      } catch (_) {}
    }
    try {
      if (resolvedCustomization && resolvedCustomization.content) {
        if (Array.isArray(resolvedCustomization.content.maps)) {
          window.__simpleSandboxMaps = resolvedCustomization.content.maps.map((item, index) => ({
            id: String(item && item.id || ("map_" + index)),
            label: String(item && item.label || "Sans titre"),
            map: String(item && item.map || ""),
            category: String(item && item.category || "Custom"),
            section: String(item && item.section || "lieux"),
            audio: String(item && item.audio || "")
          }))
        }
        if (Array.isArray(resolvedCustomization.content.pnjs)) {
          window.__simpleSandboxPnjs = resolvedCustomization.content.pnjs.map((item, index) => ({
            id: String(item && item.id || ("pnj_" + index)),
            label: String(item && item.label || "PNJ"),
            image: String(item && item.image || ""),
            category: String(item && item.category || "Custom")
          }))
        }
      }
    } catch (_) {}
    if (typeof applyCustomizationToUI === "function") {
      setTimeout(applyCustomizationToUI, 20)
    }
    try {
      if (data.characters) {
        Object.entries(data.characters).forEach(function(entry) {
          var pid = entry[0]
          var value = entry[1] || {}
          if (typeof syncSimpleSheetIdentityToToken === "function") syncSimpleSheetIdentityToToken(pid, value)
          if (typeof syncSimpleSheetVitalsToToken === "function") syncSimpleSheetVitalsToToken(pid, value)
        })
      }
    } catch (_) {}
    callback()
  })
}

function openSandboxAfterProjectCreation(message) {
  if (window.__sandboxLaunchWatchdog) {
    clearTimeout(window.__sandboxLaunchWatchdog)
    window.__sandboxLaunchWatchdog = null
  }
  window.__startInSandboxMode = false
  try {
    setSandboxStudioMode(true)
    ensureSandboxStudioChromeVisible()
    if (typeof setBuilderShellVisible === "function") setBuilderShellVisible(false)
    if (!gameStarted) gameStarted = true
    hideIntroLayers()
    sanitizeLegacySandboxUI()
    const camera = document.getElementById("camera")
    const map = document.getElementById("map")
    const diceBar = document.getElementById("diceBar")
    const diceLog = document.getElementById("diceLog")
    if (camera) camera.style.display = "block"
    if (map) {
      map.style.position = "absolute"
      map.style.inset = "0"
      map.style.width = "100vw"
      map.style.height = "100vh"
      map.style.backgroundImage = "none"
      map.style.background = "none"
    }
    if (diceBar) diceBar.style.display = "flex"
    if (diceLog) diceLog.style.display = "block"
    showTavern()
    activateGM(true)
    if (typeof applyCustomizationToUI === "function") {
      setTimeout(() => {
        try { applyCustomizationToUI() } catch (e) {}
        try { ensureSandboxStudioChromeVisible() } catch (_) {}
      }, 40)
    }
    if (typeof openCustomizationPanel === "function") {
      setTimeout(() => {
        try { openCustomizationPanel() } catch (e) {}
      }, 120)
    }
    if (window.__showNewMJSandboxTutorial && typeof openMJSandboxOnboarding === "function") {
      window.__showNewMJSandboxTutorial = false
      setTimeout(() => {
        try { openMJSandboxOnboarding() } catch (e) {}
      }, 180)
    }
    if (typeof showNotification === "function") showNotification(message || "Bac a sable MJ pret")
  } catch (error) {
    console.error("openSandboxAfterProjectCreation failed:", error)
    try {
      if (typeof setBuilderShellVisible === "function") setBuilderShellVisible(false)
      hideIntroLayers()
      setGameState("GAME")
      const camera = document.getElementById("camera")
      const map = document.getElementById("map")
      const diceBar = document.getElementById("diceBar")
      const diceLog = document.getElementById("diceLog")
      if (camera) camera.style.display = "block"
      if (map) {
        map.style.position = "absolute"
        map.style.inset = "0"
        map.style.width = "100vw"
        map.style.height = "100vh"
        map.style.backgroundImage = "none"
        map.style.background = "none"
      }
      if (diceBar) diceBar.style.display = "flex"
      if (diceLog) diceLog.style.display = "block"
      activateGM(true)
      if (window.__showNewMJSandboxTutorial && typeof openMJSandboxOnboarding === "function") {
        window.__showNewMJSandboxTutorial = false
        setTimeout(() => {
          try { openMJSandboxOnboarding() } catch (e) {}
        }, 180)
      }
      if (typeof showNotification === "function") showNotification((message || "Bac a sable MJ pret") + " (mode secours)")
    } catch (fallbackError) {
      console.error("openSandboxAfterProjectCreation fallback failed:", fallbackError)
      if (typeof showNotification === "function") showNotification("Impossible d'ouvrir le bac a sable")
    }
  }
}

function newGame() {
  if (!window.__startInSandboxMode && !confirm("Creer un nouveau bac a sable vide ? Le contenu courant sera reinitialise.")) return

  // Attendre que Firebase Auth soit prÃªte avant d'Ã©crire
  const doReset = () => {
    const verifyResetReadback = () => {
      const checks = [
        { label: "game/map", promise: db.ref("game/map").once("value") },
        { label: "game/groupMadness", promise: db.ref("game/groupMadness").once("value") },
        { label: "game/worldMapFogTopLeftHidden", promise: db.ref("game/worldMapFogTopLeftHidden").once("value") }
      ]
      ;["greg", "ju", "elo", "bibi"].forEach(pid => {
        checks.push({ label: "characters/" + pid, promise: db.ref("characters/" + pid).once("value") })
        checks.push({ label: "tokens/" + pid, promise: db.ref("tokens/" + pid).once("value") })
      })

      return Promise.allSettled(checks.map(entry => entry.promise)).then(results => {
        const failed = []
        results.forEach((result, idx) => {
          const label = checks[idx].label
          if (result.status !== "fulfilled") {
            failed.push(label)
            return
          }
          const value = result.value && typeof result.value.val === "function" ? result.value.val() : null
          if (label === "game/map" && value !== "background.jpg") failed.push(label)
          else if (label === "game/groupMadness" && (parseInt(value, 10) || 0) !== 0) failed.push(label)
          else if (label === "game/worldMapFogTopLeftHidden" && value !== false) failed.push(label)
          else if (label.startsWith("characters/")) {
            const pid = label.split("/")[1]
            const expected = initChars[pid]
            if (!value || !expected) { failed.push(label); return }
            const same =
              parseInt(value.lvl, 10) === expected.lvl &&
              parseInt(value.xp, 10) === expected.xp &&
              parseInt(value.hp, 10) === expected.hp &&
              parseInt(value.poids, 10) === expected.poids &&
              parseInt(value.force, 10) === expected.force &&
              parseInt(value.charme, 10) === expected.charme &&
              parseInt(value.perspi, 10) === expected.perspi &&
              parseInt(value.chance, 10) === expected.chance &&
              parseInt(value.defense, 10) === expected.defense &&
              parseInt(value.curse, 10) === expected.curse &&
              parseInt(value.corruption, 10) === expected.corruption &&
              parseInt(value.freePoints, 10) === expected.freePoints &&
              parseInt(value.gold, 10) === expected.gold &&
              String(value.inventaire || "") === expected.inventaire &&
              String(value.notes || "") === expected.notes
            if (!same) failed.push(label)
          } else if (label.startsWith("tokens/")) {
            const pid = label.split("/")[1]
            const expected = initTokens[pid]
            if (!value || !expected || parseInt(value.x, 10) !== expected.x || parseInt(value.y, 10) !== expected.y) {
              failed.push(label)
            }
          }
        })
        return failed
      })
    }

    const finalizeNewGameLocally = () => {
      if (typeof forceCloseCharacterSheetWithoutSave === "function") forceCloseCharacterSheetWithoutSave()
      myToken = null
      window.myToken = null
      currentSheetPlayer = null
      if (window._playerMaxPoids) window._playerMaxPoids = {}
      currentMap = "background.jpg"
      cameraZoom = minZoom || cameraZoom
      cameraX = 0
      cameraY = 0
      const map = document.getElementById("map")
      if (map) {
        map.style.backgroundImage = "url('" + resolveImagePath("background.jpg") + "')"
        map.style.backgroundSize = "cover"
        map.style.backgroundColor = ""
      }
      updateCamera()
      ;["greg","ju","elo","bibi"].forEach(pid => updateTokenStats(pid))
      updateMadnessVisibility()
      updateThuumButton()
    }

    // Reset Ã©tat local immÃ©diat
    gameStarted = false
    window.isNewGame = true
    window.__combatOutcomeShowing = false
    window.__pendingLocalDefeat = false
    window.__curseWheelTriggeredFor = null
    combatActive = false
    combatStarting = false
    cemeteryEventDone = false
    odinVisionShown = false
    window.playerThuumData = {}
    window.playerThuumAccessData = {}
    window.mapLoreBookData = null
    window.readLoreBooksData = {}
    deadPlayers = {}
    pendingLevelUp = {}
    lastLevel = {}
    lastHP = {}
    resetMadnessPresentation()
    if (typeof resetAuroraPresentation === "function") resetAuroraPresentation()
    stopAllMusic()
    if (typeof saveCustomization === "function" && typeof getDefaultCustomization === "function") {
      const nextCustomization = getDefaultCustomization()
      const pendingSeed = window.__pendingProjectSeed && typeof window.__pendingProjectSeed === "object"
        ? window.__pendingProjectSeed
        : null
      if (pendingSeed) {
        nextCustomization.project.title = String(pendingSeed.title || "").trim() || nextCustomization.project.title
        nextCustomization.project.theme = String(pendingSeed.theme || "").trim() || nextCustomization.project.theme
        nextCustomization.project.playerCount = Math.max(1, Math.min(12, parseInt(pendingSeed.playerCount, 10) || nextCustomization.project.playerCount || 4))
        nextCustomization.project.tone = String(pendingSeed.tone || "").trim() || nextCustomization.project.tone
        nextCustomization.project.starterMode = String(pendingSeed.starterMode || "").trim() || nextCustomization.project.starterMode
      }
      saveCustomization(nextCustomization)
      window.__pendingProjectSeed = null
      if (typeof applyCustomizationToUI === "function") setTimeout(applyCustomizationToUI, 20)
    }

    // Construire les donnÃ©es initiales
    const initChars = {}
    ;["greg", "ju", "elo", "bibi"].forEach(pid => {
      const s = getPlayerStatsAtLevel(pid, 1)
      initChars[pid] = {
        lvl:1, xp:0, hp:s.hp, poids:s.poids,
        force:s.force, charme:s.charme, perspi:s.perspi,
        chance:s.chance, defense:s.defense,
        curse:0, corruption:0, freePoints:0,
        gold:0, inventaire:"", notes:""
      }
    })

    const initTokens = {
      greg: { x:320, y:340 },
      ju:   { x:420, y:340 },
      elo:  { x:520, y:340 },
      bibi: { x:620, y:340 }
    }

    const criticalWrites = [
      { label: "game/map", promise: db.ref("game/map").set("background.jpg") },
      { label: "game/groupMadness", promise: db.ref("game/groupMadness").set(0) },
      { label: "game/worldMapFogTopLeftHidden", promise: db.ref("game/worldMapFogTopLeftHidden").set(false) },
      { label: "game/newGame", promise: db.ref("game/newGame").set({ time: Date.now() }) }
    ]

    Object.keys(initChars).forEach(pid => {
      criticalWrites.push({ label: "characters/" + pid, promise: db.ref("characters/" + pid).set(initChars[pid]) })
    })
    Object.keys(initTokens).forEach(pid => {
      criticalWrites.push({ label: "tokens/" + pid, promise: db.ref("tokens/" + pid).set(initTokens[pid]) })
    })

    // Ã‰crire les donnÃ©es critiques en premier (personnages + map)
    // puis nettoyer le reste en arriÃ¨re-plan
    Promise.allSettled(criticalWrites.map(entry => entry.promise)).then(results => {
      const failed = results
        .map((result, idx) => ({ result, label: criticalWrites[idx].label }))
        .filter(entry => entry.result.status === "rejected")

      if (failed.length) {
        console.error("newGame reset failed", failed)
        finalizeNewGameLocally()
        if (window.__startInSandboxMode) {
          openSandboxAfterProjectCreation("Mode local actif : bac a sable MJ pret")
          if (window.__showNewMJSandboxTutorial && typeof openMJSandboxOnboarding === "function") {
            window.__showNewMJSandboxTutorial = false
            setTimeout(() => {
              try { openMJSandboxOnboarding() } catch (e) {}
            }, 320)
          }
        } else {
          showNotification("Mode local actif : bac a sable cree sans synchronisation Firebase")
          setGameState("MENU")
          startIntro()
        }
        return
      }

      verifyResetReadback().then(readbackFailed => {
        if (readbackFailed.length) {
          console.error("newGame reset readback mismatch", readbackFailed)
          finalizeNewGameLocally()
          if (window.__startInSandboxMode) {
            openSandboxAfterProjectCreation("Mode local actif : verification ignoree, bac a sable MJ pret")
            if (window.__showNewMJSandboxTutorial && typeof openMJSandboxOnboarding === "function") {
              window.__showNewMJSandboxTutorial = false
              setTimeout(() => {
                try { openMJSandboxOnboarding() } catch (e) {}
              }, 320)
            }
          } else {
            showNotification("Mode local actif : verification Firebase ignoree")
            setGameState("MENU")
            startIntro()
          }
          return
        }

        // Nettoyage en arriÃ¨re-plan (non bloquant)
        ;[
          db.ref(SESSION_REF_PATH).remove(),
          db.ref("elements").remove(),
          db.ref("combat").remove(),
          db.ref("diceRoll").remove(),
          db.ref("curse").remove(),
          db.ref("events").remove(),
          db.ref("game/storyImage").remove(),
          db.ref("game/storyImage2").remove(),
          db.ref("game/storyImage3").remove(),
          db.ref("game/shop").remove(),
          db.ref("game/combatState").remove(),
          db.ref("game/combatOutcome").remove(),
          db.ref("game/playerDeath").remove(),
          db.ref("game/playerRevive").remove(),
          db.ref("game/playerAllyAccess").remove(),
          db.ref("game/playerThuum").remove(),
          db.ref("game/playerThuumAccess").remove(),
          db.ref("game/thuumCast").remove(),
          db.ref("game/thuumUnlockEvent").remove(),
          db.ref("game/allyAction").remove(),
          db.ref("game/odinVision").remove(),
          db.ref("game/powerSound").remove(),
          db.ref("game/bifrostFlash").remove(),
          db.ref("game/cemeterySpell").remove(),
          db.ref("game/runeChallenge").remove(),
          db.ref("game/mapLoreBook").remove(),
          db.ref("game/readLoreBooks").remove(),
          db.ref("game/wantedPosters").remove(),
          db.ref("game/wantedOpen").remove(),
          db.ref("game/simonState").remove(),
          db.ref("game/document").remove(),
          db.ref("game/mobAttackEvent").remove(),
          db.ref("game/highPNJName").remove(),
        ].forEach(p => p.catch(() => {}))

        finalizeNewGameLocally()
        addMJLog("Nouveau bac a sable initialise")
        if (window.__startInSandboxMode) {
          openSandboxAfterProjectCreation("Nouveau bac a sable vide")
          if (window.__showNewMJSandboxTutorial && typeof openMJSandboxOnboarding === "function") {
            window.__showNewMJSandboxTutorial = false
            setTimeout(() => {
              try { openMJSandboxOnboarding() } catch (e) {}
            }, 320)
          }
        } else {
          showNotification("Nouveau bac a sable vide")
          setGameState("MENU")
          startIntro()
        }
      })
    })
  } // fin doReset

  doReset()
}

function resetAllPlayerStats() {
  if (!isGM) { showNotification("MJ seulement"); return }
  ;["greg", "ju", "elo", "bibi"].forEach(pid => {
    db.ref("characters/" + pid + "/lvl").once("value", snap => {
      const lvl      = snap.val() || 1
      const computed = getPlayerStatsAtLevel(pid, lvl)
      if (!computed) return
      const update = { lvl, hp: computed.hp, poids: computed.poids }
      allStats.forEach(s => { update[s] = computed[s] })
      db.ref("characters/" + pid).update(update)
      showNotification("Stats " + pid + " reinitialisees (lvl " + lvl + ")")
    })
  })
}

/* ========================= */
/* DICE                      */
/* ========================= */

function rollDice(max) {
  let playerName
  if (isGM) { playerName = "MJ" }
  else {
    if (!myToken) { showNotification("Choisissez un personnage !"); return }
    playerName = myToken.id
  }
  const result = Math.floor(Math.random() * max) + 1
  db.ref("diceRoll").push({ player: playerName, dice: max, result, time: Date.now(), sender: playerName })
}

function gmRoll(max) {
  if (!isGM) return
  const result = Math.floor(Math.random() * max) + 1
  db.ref("diceRoll").push({ player: "MJ", dice: max, result, time: Date.now(), sender: "MJ" })
}

function toggleDiceBar(forceState) {
  const bar = document.getElementById("diceBar")
  const toggle = document.getElementById("diceBarToggle")
  if (!bar || !toggle) return
  const collapsed = typeof forceState === "boolean" ? forceState : !bar.classList.contains("collapsed")
  bar.classList.toggle("collapsed", collapsed)
  toggle.innerHTML = collapsed ? "&#9656;" : "&#9662;"
  toggle.setAttribute("aria-label", collapsed ? "Deplier les des" : "Replier les des")
}

function mobRoll(max) {
  if (!isGM || !combatActive) return
  const result = Math.floor(Math.random() * max) + 1
  db.ref("diceRoll").push({ player: "MOB", dice: max, result, time: Date.now(), sender: "MJ" })
}

const _DICE_FACE_ROTS = { 1:{rx:0,ry:0}, 2:{rx:90,ry:0}, 3:{rx:0,ry:-90}, 4:{rx:0,ry:90}, 5:{rx:-90,ry:0}, 6:{rx:0,ry:180} }

function _buildDice3D(resultBox) {
  resultBox.innerHTML = ""
  const label = document.createElement("div")
  label.className = "dice-player-label"
  label.id = "dicePlayerLabel"
  resultBox.appendChild(label)

  const wrap = document.createElement("div")
  wrap.className = "dice-3d-wrap"
  const cube = document.createElement("div")
  cube.className = "dice-3d"
  cube.id = "dice3d"
  const faceVals = [1, 6, 3, 4, 5, 2]
  const faceClasses = ["df1","df2","df3","df4","df5","df6"]
  faceClasses.forEach((cls, i) => {
    const f = document.createElement("div")
    f.className = "dice-face " + cls
    f.textContent = faceVals[i]
    cube.appendChild(f)
  })
  wrap.appendChild(cube)
  resultBox.appendChild(wrap)

  const resLabel = document.createElement("div")
  resLabel.className = "dice-result-label"
  resLabel.id = "diceResultLabel"
  resultBox.appendChild(resLabel)
  return { cube, label, resLabel }
}

function showDiceAnimation(playerName, max, final) {
  const resultBox = document.getElementById("diceResult")
  resultBox.classList.remove("crit", "fail", "mjRoll")
  resultBox.style.display = "flex"
  resultBox.style.transform = "translate(-50%, -50%)"
  resultBox.offsetHeight

  const safeName = String(playerName).replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const { cube, label, resLabel } = _buildDice3D(resultBox)

  label.textContent = safeName + " — d" + max
  resLabel.textContent = ""
  resultBox.style.opacity = 1

  // Rotation rapide pendant 1.8s
  let t = 0
  cube.style.transition = "none"
  const spin = setInterval(() => {
    t += 0.15
    cube.style.transform = "rotateX(" + (t*137) + "deg) rotateY(" + (t*247) + "deg) rotateZ(" + (t*83) + "deg)"
  }, 16)

  setTimeout(() => {
    clearInterval(spin)
    // Aligner la face sur le rÃ©sultat
    const displayVal = ((final - 1) % 6) + 1
    const rot = _DICE_FACE_ROTS[displayVal]
    cube.style.transition = "transform 0.45s cubic-bezier(0.2,0.8,0.3,1.15)"
    cube.style.transform = "rotateX(" + rot.rx + "deg) rotateY(" + rot.ry + "deg)"

    setTimeout(() => {
      resLabel.textContent = String(final)
      addDiceLog(playerName, max, final)

      if (playerName === "MJ") { resultBox.classList.add("mjRoll"); flashGold(); screenShake() }

      if (final === max) {
        resultBox.classList.add("crit")
        resLabel.textContent = "? " + final + " ?"
        playSound("critSound"); screenShake(); flashGold()
        tryRuneEventOnDice()
        if (playerName !== "MJ" && playerName !== "MOB") {
          db.ref("characters/" + playerName + "/corruption").once("value", snap => {
            db.ref("characters/" + playerName + "/corruption").set(Math.min(10, (parseInt(snap.val()) || 0) + 1))
            showNotification("? " + playerName.toUpperCase() + " gagne 1 point de Pouvoir !")
          })
        }
      }

      if (final === 1) {
        resultBox.classList.add("fail")
        playSound("failSound"); screenShakeHard(); flashRed()
        tryRuneEventOnDice()
        if (playerName !== "MJ" && playerName !== "MOB") {
          db.ref("characters/" + playerName + "/curse").once("value", snap => {
            db.ref("characters/" + playerName + "/curse").set(Math.min(8, (parseInt(snap.val()) || 0) + 1))
            showNotification("? " + playerName.toUpperCase() + " gagne 1 point de Malediction !")
          })
        }
      }

      // Idle aprÃ¨s affichage
      setTimeout(() => {
        cube.style.transition = ""
        cube.style.animation = "diceIdle 10s linear infinite"
      }, 500)

      // Disparition
      setTimeout(() => {
        resultBox.style.opacity = 0
        setTimeout(() => {
          resultBox.style.display = "none"
          resultBox.classList.remove("crit","fail","mjRoll")
          cube.style.animation = ""
        }, 500)
      }, 4000)
    }, 300)
  }, 1800)
}

function rollStat(stat) {
  const sheet = document.getElementById("characterSheet")
  if (sheet && sheet.style.display === "block") return
  if (!myToken) return
  const field = document.getElementById(stat); if (!field) return
  const statValue = parseInt(field.value) || 0
  const dice = Math.floor(Math.random() * 20) + 1
  showDiceAnimation(myToken.id, 20, dice + statValue)
}

/* ========================= */
/* GAME STATE                */
/* ========================= */

function buildLegacyPanelPlaceholder(title, body) {
  return (
    `<div style="padding:14px 12px;text-align:center;font-family:Cinzel,serif;">` +
      `<div style="font-size:14px;letter-spacing:2px;color:#e6c27a;margin-bottom:8px;">${title}</div>` +
      `<div style="font-size:12px;line-height:1.5;color:rgba(255,240,210,0.82);">${body}</div>` +
    `</div>`
  )
}

function getSandboxContentItems(type) {
  try {
    if (typeof getCustomization !== "function") return []
    const data = getCustomization()
    const content = data && data.content ? data.content : {}
    if (type === "map") {
      return ensureSandboxMapRuntimeState()
    }
    if (type === "pnj") return content.pnjs || []
    if (type === "mob") return content.mobs || []
    if (type === "document") return content.documents || []
  } catch (_) {}
  return []
}

function getSandboxCollectionInfo(type) {
  const map = {
    map: { key: "maps", label: "map" },
    pnj: { key: "pnjs", label: "PNJ" },
    mob: { key: "mobs", label: "mob" },
    document: { key: "documents", label: "document" }
  }
  return map[String(type || "").toLowerCase()] || null
}

function ensureSandboxMapRuntimeState(forceRefresh) {
  try {
    if (!forceRefresh && Array.isArray(window.__sandboxMapPanelState)) {
      window.__sandboxMapPanelState = window.__sandboxMapPanelState.map((item, index) => ({
        ...item,
        __runtimeKey: String(item && item.__runtimeKey || item && item.id || ("map_" + index))
      }))
      return window.__sandboxMapPanelState
    }
    if (typeof getCustomization !== "function") {
      window.__sandboxMapPanelState = []
      return window.__sandboxMapPanelState
    }
    const data = getCustomization()
    const content = data && data.content ? data.content : {}
    const savedMaps = Array.isArray(content.maps) ? content.maps.map((item, index) => ({
      ...item,
      __runtimeKey: String(item && item.__runtimeKey || item && item.id || ("map_" + index))
    })) : []
    window.__sandboxMapPanelState = savedMaps
    return window.__sandboxMapPanelState
  } catch (_) {}
  window.__sandboxMapPanelState = Array.isArray(window.__sandboxMapPanelState) ? window.__sandboxMapPanelState : []
  return window.__sandboxMapPanelState
}

function findSandboxMapIndexByKey(mapKey) {
  const maps = ensureSandboxMapRuntimeState()
  return maps.findIndex(item => item && String(item.__runtimeKey || "") === String(mapKey || ""))
}

function persistSandboxMapRuntimeState() {
  try {
    if (typeof getCustomization !== "function" || typeof saveCustomization !== "function") return false
    const next = getCustomization()
    next.content = next.content || { maps: [], pnjs: [], highPnjs: [], mobs: [], documents: [] }
    next.content.maps = ensureSandboxMapRuntimeState().map(item => {
      const clone = { ...item }
      delete clone.__runtimeKey
      delete clone.__runtimeOnly
      return clone
    })
    saveCustomization(next)
    if (typeof applyCustomizationToUI === "function") applyCustomizationToUI()
    return true
  } catch (_) {}
  return false
}

function persistSandboxMapsDirect(maps) {
  try {
    if (typeof getCustomization !== "function" || typeof saveCustomization !== "function") return false
    const next = getCustomization()
    next.content = next.content || { maps: [], pnjs: [], highPnjs: [], mobs: [], documents: [] }
    next.content.maps = (Array.isArray(maps) ? maps : []).map((item, index) => ({
      label: String(item && item.label || "Sans titre"),
      category: String(item && item.category || "Custom"),
      map: String(item && item.map || ""),
      section: String(item && item.section || "lieux"),
      audio: String(item && item.audio || ""),
      id: String(item && (item.id || item.__runtimeKey) || ("map_" + index))
    }))
    saveCustomization(next)
    window.__sandboxMapPanelState = next.content.maps.map((item, index) => ({
      ...item,
      __runtimeKey: String(item && item.id || ("map_" + index))
    }))
    if (typeof applyCustomizationToUI === "function") applyCustomizationToUI()
    return true
  } catch (_) {}
  return false
}

function updateSandboxCustomization(mutator) {
  try {
    if (typeof getCustomization !== "function" || typeof saveCustomization !== "function") return false
    const next = getCustomization()
    next.content = next.content || { maps: [], pnjs: [], highPnjs: [], mobs: [], documents: [] }
    mutator(next)
    saveCustomization(next)
    if (typeof applyCustomizationToUI === "function") applyCustomizationToUI()
    if (typeof renderNativeStudioContentList === "function") renderNativeStudioContentList()
    try { renderSandboxManagerPanelById("mapMenu") } catch (_) {}
    try { forceRenderMapMenuPanelList() } catch (_) {}
    try { renderSandboxManagerPanelById("pnjMenu") } catch (_) {}
    try { renderSandboxManagerPanelById("mobMenu2") } catch (_) {}
    try { renderSandboxManagerPanelById("elementsMenu") } catch (_) {}
    sanitizeLegacySandboxUI()
    return true
  } catch (error) {
    console.warn("updateSandboxCustomization failed:", error)
    return false
  }
}

function findCustomMapEntry(mapName) {
  try {
    const maps = getSandboxContentItems("map")
    return maps.find(item => String(item.map || "") === String(mapName || "")) || null
  } catch (_) {
    return null
  }
}

function getMapDisplayLabel(mapName) {
  try {
    const customization = typeof getCustomization === "function" ? getCustomization() : null
    const startMapId = customization && customization.project ? String(customization.project.startMapId || "") : ""
    const startMapLabel = customization && customization.project ? String(customization.project.startMapLabel || "") : ""
    if (startMapId && String(mapName || "") === startMapId && startMapLabel) return startMapLabel
  } catch (_) {}
  const customEntry = findCustomMapEntry(mapName)
  if (customEntry && customEntry.label) return String(customEntry.label)
  if (typeof mapNames === "object" && mapNames && mapNames[mapName]) return mapNames[mapName]
  return ""
}

function launchSandboxMap(index) {
  const maps = getSandboxContentItems("map")
  const item = maps[index]
  if (!item) return
  const mapValue = String(item.map || "").trim()
  if (/^(data:|blob:|https?:|\/)/i.test(mapValue)) {
    try {
      const map = document.getElementById("map")
      const layer = document.getElementById("sandboxStartMapLayer")
      if (layer) {
        layer.src = mapValue
        layer.style.display = "block"
      }
      if (map) {
        map.style.backgroundImage = "url('" + mapValue.replace(/'/g, "\\'") + "')"
        map.style.backgroundSize = "cover"
        map.style.backgroundPosition = "center center"
        map.style.backgroundRepeat = "no-repeat"
      }
      if (typeof updateCamera === "function") updateCamera()
    } catch (_) {}
    if (item.label) {
      setTimeout(() => {
        try { showLocation(String(item.label)) } catch (_) {}
      }, 120)
    }
    return
  }
  changeMap(mapValue || "background.jpg", item.audio || "")
  if (item.label) {
    setTimeout(() => {
      try { showLocation(String(item.label)) } catch (_) {}
    }, 2000)
  }
}

function launchSandboxMapByKey(mapKey) {
  const index = findSandboxMapIndexByKey(mapKey)
  if (index < 0) return false
  launchSandboxMap(index)
  return false
}

function renameSandboxMap(index) {
  const maps = getSandboxContentItems("map")
  const item = maps[index]
  if (!item) return false
  const nextLabel = prompt("Nom de la map :", String(item.label || ""))
  if (nextLabel == null) return false
  const trimmedLabel = String(nextLabel).trim()
  if (!trimmedLabel) {
    if (typeof showNotification === "function") showNotification("Nom obligatoire")
    return false
  }
  const runtimeMaps = ensureSandboxMapRuntimeState().slice()
  if (!runtimeMaps[index]) return false
  runtimeMaps[index].label = trimmedLabel
  persistSandboxMapsDirect(runtimeMaps)
  try { renderSandboxManagerPanelById("mapMenu") } catch (_) {}
  try { forceRenderMapMenuPanelList() } catch (_) {}
  try { renderSandboxMapManagerOverlay() } catch (_) {}
  return false
}

function renameSandboxMapByKey(mapKey) {
  const index = findSandboxMapIndexByKey(mapKey)
  if (index < 0) return false
  return renameSandboxMap(index)
}

function deleteSandboxMap(index) {
  const runtimeMaps = ensureSandboxMapRuntimeState().slice()
  if (index < 0 || index >= runtimeMaps.length) return false
  runtimeMaps.splice(index, 1)
  persistSandboxMapsDirect(runtimeMaps)
  try { renderSandboxManagerPanelById("mapMenu") } catch (_) {}
  try { forceRenderMapMenuPanelList() } catch (_) {}
  try { renderSandboxMapManagerOverlay() } catch (_) {}
  return false
}

function deleteSandboxMapByKey(mapKey) {
  const index = findSandboxMapIndexByKey(mapKey)
  if (index < 0) return false
  return deleteSandboxMap(index)
}

function createSandboxMapFromPanel() {
  try {
    const chooser = document.createElement("input")
    chooser.type = "file"
    chooser.accept = "image/*"
    chooser.style.display = "none"
    chooser.addEventListener("change", async function() {
      const file = chooser.files && chooser.files[0] ? chooser.files[0] : null
      if (!file) {
        if (chooser.parentNode) chooser.parentNode.removeChild(chooser)
        return
      }
      const defaultLabel = String(file.name || "Nouvelle map").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Nouvelle map"
      const chosenLabel = prompt("Nom de la map :", defaultLabel)
      if (chosenLabel == null) {
        if (chooser.parentNode) chooser.parentNode.removeChild(chooser)
        return
      }
      const trimmedLabel = String(chosenLabel).trim()
      if (!trimmedLabel) {
        if (typeof showNotification === "function") showNotification("Nom obligatoire")
        if (chooser.parentNode) chooser.parentNode.removeChild(chooser)
        return
      }
      try {
        const asset = typeof readNativeStudioFileAsDataURL === "function"
          ? String(await readNativeStudioFileAsDataURL(file) || "").trim()
          : ""
        if (!asset) {
          if (typeof showNotification === "function") showNotification("Image invalide")
          if (chooser.parentNode) chooser.parentNode.removeChild(chooser)
          return
        }
        const runtimeMaps = ensureSandboxMapRuntimeState().slice()
        const runtimeKey = "runtime_map_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6)
        runtimeMaps.push({
          label: trimmedLabel,
          category: "Custom",
          map: asset,
          section: "lieux",
          audio: "",
          __runtimeKey: runtimeKey,
          id: runtimeKey
        })
        persistSandboxMapsDirect(runtimeMaps)
        try { forceRenderMapMenuPanelList() } catch (_) {}
        try { renderSandboxMapManagerOverlay() } catch (_) {}
        const panel = document.getElementById("mapMenu")
        if (panel) panel.style.display = "block"
        if (typeof showNotification === "function") showNotification("Map ajoutee")
      } catch (_) {
        if (typeof showNotification === "function") showNotification("Lecture du fichier impossible")
      }
      if (chooser.parentNode) chooser.parentNode.removeChild(chooser)
    }, { once: true })
    document.body.appendChild(chooser)
    chooser.click()
    return false
  } catch (_) {}
  return false
}

function startSandboxMapDrag(index) {
  window.__sandboxDraggedMapIndex = Number(index)
}

function startSandboxMapDragByKey(mapKey) {
  window.__sandboxDraggedMapIndex = findSandboxMapIndexByKey(mapKey)
}

function allowSandboxMapDrop(event) {
  if (event) event.preventDefault()
  return false
}

function dropSandboxMap(targetIndex) {
  const sourceIndex = Number(window.__sandboxDraggedMapIndex)
  const destIndex = Number(targetIndex)
  window.__sandboxDraggedMapIndex = null
  if (!Number.isFinite(sourceIndex) || !Number.isFinite(destIndex) || sourceIndex === destIndex) return false
  const runtimeMaps = ensureSandboxMapRuntimeState().slice()
  if (sourceIndex < 0 || destIndex < 0 || sourceIndex >= runtimeMaps.length || destIndex >= runtimeMaps.length) return false
  const moved = runtimeMaps.splice(sourceIndex, 1)[0]
  runtimeMaps.splice(destIndex, 0, moved)
  persistSandboxMapsDirect(runtimeMaps)
  try { renderSandboxManagerPanelById("mapMenu") } catch (_) {}
  try { forceRenderMapMenuPanelList() } catch (_) {}
  try { renderSandboxMapManagerOverlay() } catch (_) {}
  return false
}

function dropSandboxMapByKey(targetKey) {
  const targetIndex = findSandboxMapIndexByKey(targetKey)
  if (targetIndex < 0) return false
  return dropSandboxMap(targetIndex)
}

function endSandboxMapDrag() {
  window.__sandboxDraggedMapIndex = null
}

function editSandboxItemSettings(type, index) {
  const info = getSandboxCollectionInfo(type)
  if (!info) return
  const items = getSandboxContentItems(type)
  const item = items[index]
  if (!item) return

  const nextLabel = prompt("Titre :", String(item.label || ""))
  if (nextLabel == null) return
  const trimmedLabel = String(nextLabel).trim()
  if (!trimmedLabel) {
    showNotification("Titre obligatoire")
    return
  }

  const nextCategory = prompt("Categorie :", String(item.category || "Custom"))
  if (nextCategory == null) return
  const trimmedCategory = String(nextCategory).trim() || "Custom"

  let nextAudio = null
  if (type === "map") {
    const audioValue = prompt("Musique de la map (nom de fichier, URL ou vide) :", String(item.audio || ""))
    if (audioValue == null) return
    nextAudio = String(audioValue).trim()
  }

  updateSandboxCustomization(next => {
    const target = next.content[info.key] && next.content[info.key][index]
    if (!target) return
    target.label = trimmedLabel
    target.category = trimmedCategory
    if (type === "map") target.audio = nextAudio
    if (type === "document") target.title = trimmedLabel
  })
}

function buildSandboxManagerPanel(options) {
  const items = getSandboxContentItems(options.type)
  const customization = typeof getCustomization === "function" ? getCustomization() : null
  const project = customization && customization.project ? customization.project : null
  const startMapAsset = options.type === "map"
    ? String((project && project.startMapAsset) || window.__onboardingStartMapAsset || "").trim()
    : ""
  const startMapLabel = options.type === "map"
    ? String((project && project.startMapLabel) || window.__onboardingStartMapLabel || "").trim() || "Map de depart"
    : ""
  const startMapLaunch = options.type === "map"
    ? (
        `<button type="button" onclick="return launchOnboardingStartMap()" ` +
        `style="padding:9px 10px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;${startMapAsset ? "" : "opacity:0.92;"}">` +
          `${startMapLabel}` +
        `</button>`
      )
    : ""
  const mapActions = options.type === "map"
    ? `<div style="display:flex;flex-wrap:wrap;gap:8px;">` +
        startMapLaunch +
        `<button type="button" onclick="return createSandboxMapFromPanel()" style="padding:9px 10px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Nouvelle map</button>` +
      `</div>`
    : ""
  const actions = options.type === "map"
    ? ""
    : items.length
    ? items.map((item, index) => {
        const label = String(item.label || "Sans titre")
        const category = String(item.category || "Custom")
        const launchButton = options.type === "map"
          ? `<button type="button" onclick="launchSandboxMap(${index})" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 10px;background:linear-gradient(180deg, rgba(36,68,92,0.96), rgba(12,34,50,0.98));border:1px solid rgba(240,202,112,0.36);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;cursor:pointer;flex:1;">` +
              `<span style="text-align:left;">${label}</span>` +
              `<span style="font-size:11px;color:#bfae8b;">Ouvrir</span>` +
            `</button>`
          : `<button type="button" onclick="focusNativeStudioItem('${options.type}', ${index})" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 10px;background:rgba(255,255,255,0.05);border:1px solid rgba(214,180,106,0.2);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;cursor:pointer;flex:1;">` +
              `<span style="text-align:left;">${label}</span>` +
              `<span style="font-size:11px;color:#bfae8b;">${category}</span>` +
            `</button>`
        return (
          `<div style="display:grid;gap:8px;padding:10px;background:rgba(0,0,0,0.18);border:1px solid rgba(214,180,106,0.18);border-radius:10px;">` +
            `<div style="display:flex;gap:8px;align-items:stretch;">` +
              launchButton +
              `<button type="button" onclick="editSandboxItemSettings('${options.type}', ${index})" title="Personnaliser" style="width:42px;min-width:42px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:16px;">?</button>` +
            `</div>` +
            `<div style="font-size:11px;color:#bfae8b;">${category}${options.type === "map" && item.audio ? " • musique perso" : ""}</div>` +
            `<div style="display:flex;flex-wrap:wrap;gap:6px;">` +
              `<button type="button" onclick="moveNativeStudioItem('${options.type}', ${index}, -1)" style="padding:7px 9px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;">Monter</button>` +
              `<button type="button" onclick="moveNativeStudioItem('${options.type}', ${index}, 1)" style="padding:7px 9px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;">Descendre</button>` +
              `<button type="button" onclick="deleteNativeStudioItem('${options.type}', ${index})" style="padding:7px 9px;background:rgba(90,22,22,0.55);color:#ffd7d7;border:1px solid rgba(214,110,110,0.28);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;">Supprimer</button>` +
            `</div>` +
          `</div>`
        )
      }).join("")
    : `<div style="font-size:12px;color:#bfae8b;padding:10px;background:rgba(0,0,0,0.18);border:1px dashed rgba(214,180,106,0.18);border-radius:10px;">Aucun element pour le moment.</div>`

  return (
    `<div style="display:grid;gap:12px;padding:14px;font-family:Cinzel,serif;">` +
      `<div style="display:grid;gap:6px;">` +
        `<div style="font-size:14px;letter-spacing:2px;color:#e6c27a;">${options.title}</div>` +
        `<div style="font-size:12px;line-height:1.6;color:rgba(255,240,210,0.82);">${options.body}</div>` +
      `</div>` +
      (options.type === "map"
        ? mapActions
        : `<div style="display:flex;flex-wrap:wrap;gap:8px;">` +
            `<button type="button" onclick="triggerNativeStudioLocalAdd('${options.type}')" style="padding:9px 10px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Ajouter un fichier local</button>` +
            `<button type="button" onclick="openNativeStudioQuickCreate('${options.type}')" style="padding:9px 10px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Ajouter manuellement</button>` +
          `</div>`
      ) +
      (options.type === "map"
        ? `<div data-sandbox-map-debug style="font-size:11px;color:#bfae8b;">Maps en memoire : ${items.length}</div>`
        : ``) +
      `<div data-sandbox-map-list style="display:grid;gap:10px;">${actions}</div>` +
    `</div>`
  )
}

function renderSandboxManagerPanelById(id) {
  const panel = document.getElementById(id)
  if (!panel) return
  const panelFactories = {
    mapMenu: function() {
      return buildSandboxManagerPanel({
        type: "map",
        title: "Maps et lieux",
        body: "Ici ajoute tes maps et lieux. Nomme-les de facon claire pour t'y retrouver et donner une bonne scenerie aux joueurs."
      })
    },
    pnjMenu: function() {
      return buildSandboxManagerPanel({
        type: "pnj",
        title: "PNJ",
        body: "Ici ajoute tes PNJ. Donne-leur des noms clairs et des categories simples pour garder un casting lisible."
      })
    },
    mobMenu2: function() {
      return buildSandboxManagerPanel({
        type: "mob",
        title: "Mobs et ennemis",
        body: "Ici ajoute tes mobs. Classe-les proprement pour retrouver vite tes menaces et tester tes combats."
      })
    },
    elementsMenu: function() {
      return buildSandboxManagerPanel({
        type: "document",
        title: "Documents et visuels",
        body: "Ici ajoute tes documents, indices et images de narration. Donne-leur un nom clair pour les retrouver facilement en partie."
      })
    }
  }
  if (!panelFactories[id]) return
  panel.innerHTML = panelFactories[id]()
  panel.dataset.cleaned = "1"
  if (id === "mapMenu") ensureSandboxMapMenuInteractions()
}

function forceRenderMapMenuPanelList() {
  try {
    const panel = document.getElementById("mapMenu")
    if (!panel) return
    const host = panel.querySelector("[data-sandbox-map-list]")
    const debug = panel.querySelector("[data-sandbox-map-debug]")
    if (!host) return
    const maps = getSandboxContentItems("map")
    if (debug) {
      debug.textContent = "Maps en memoire : " + maps.length
    }
    if (!maps.length) {
      host.innerHTML = `<div style="font-size:12px;color:#bfae8b;padding:10px;background:rgba(0,0,0,0.18);border:1px dashed rgba(214,180,106,0.18);border-radius:10px;">Aucun element pour le moment.</div>`
      return
    }
    host.innerHTML = ""
    maps.forEach((item, index) => {
      const label = String(item && item.label || "Sans titre")
      const card = document.createElement("div")
      card.setAttribute("data-map-card", "true")
      card.setAttribute("data-map-index", String(index))
      card.style.cssText = "display:grid;gap:8px;padding:10px;background:rgba(0,0,0,0.18);border:1px solid rgba(214,180,106,0.18);border-radius:10px;cursor:grab;"

      const topRow = document.createElement("div")
      topRow.style.cssText = "display:flex;gap:8px;align-items:center;"

      const launchBtn = document.createElement("button")
      launchBtn.type = "button"
      launchBtn.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;background:linear-gradient(180deg, rgba(36,68,92,0.96), rgba(12,34,50,0.98));border:1px solid rgba(240,202,112,0.36);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;cursor:pointer;flex:1;text-align:left;"
      launchBtn.innerHTML = `<span>${label}</span><span style="font-size:11px;color:#bfae8b;">Lancer</span>`
      launchBtn.addEventListener("click", function(event) {
        event.preventDefault()
        event.stopPropagation()
        launchSandboxMap(index)
      })

      const dragHandle = document.createElement("span")
      dragHandle.title = "Glisser pour reordonner"
      dragHandle.setAttribute("draggable", "true")
      dragHandle.style.cssText = "width:32px;min-width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid rgba(214,180,106,0.24);background:rgba(255,255,255,0.05);color:#f0d087;font-size:16px;"
      dragHandle.textContent = "::"
      dragHandle.addEventListener("dragstart", function(event) {
        event.stopPropagation()
        startSandboxMapDrag(index)
      })

      topRow.appendChild(launchBtn)
      topRow.appendChild(dragHandle)

      const actionsRow = document.createElement("div")
      actionsRow.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;"

      const renameBtn = document.createElement("button")
      renameBtn.type = "button"
      renameBtn.style.cssText = "padding:7px 9px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;"
      renameBtn.textContent = "Renommer"
      renameBtn.addEventListener("click", function(event) {
        event.preventDefault()
        event.stopPropagation()
        renameSandboxMap(index)
      })

      const deleteBtn = document.createElement("button")
      deleteBtn.type = "button"
      deleteBtn.style.cssText = "padding:7px 9px;background:rgba(90,22,22,0.55);color:#ffd7d7;border:1px solid rgba(214,110,110,0.28);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;"
      deleteBtn.textContent = "Supprimer"
      deleteBtn.addEventListener("click", function(event) {
        event.preventDefault()
        event.stopPropagation()
        deleteSandboxMap(index)
      })

      actionsRow.appendChild(renameBtn)
      actionsRow.appendChild(deleteBtn)

      card.addEventListener("dragover", function(event) {
        event.preventDefault()
      })
      card.addEventListener("drop", function(event) {
        event.preventDefault()
        dropSandboxMap(index)
      })
      card.addEventListener("dragend", function() {
        endSandboxMapDrag()
      })

      card.appendChild(topRow)
      card.appendChild(actionsRow)
      host.appendChild(card)
    })
  } catch (_) {}
}

function appendSandboxMapCardToVisiblePanel(item) {
  try {
    const panel = document.getElementById("mapMenu")
    if (!panel) return
    const host = panel.querySelector("[data-sandbox-map-list]")
    const debug = panel.querySelector("[data-sandbox-map-debug]")
    if (!host) return
    const mapKey = String(item && item.__runtimeKey || "")
    const maps = getSandboxContentItems("map")
    if (debug) debug.textContent = "Maps en memoire : " + maps.length
    if (host.textContent && host.textContent.indexOf("Aucun element pour le moment.") !== -1) {
      host.innerHTML = ""
    }
    const card = document.createElement("div")
    card.setAttribute("draggable", "true")
    card.setAttribute("data-map-card", "true")
    card.setAttribute("data-map-key", mapKey)
    card.style.cssText = "display:grid;gap:8px;padding:10px;background:rgba(0,0,0,0.18);border:1px solid rgba(214,180,106,0.18);border-radius:10px;cursor:grab;"
    card.innerHTML =
      `<div style="display:flex;gap:8px;align-items:center;">` +
        `<button type="button" data-map-action="launch" data-map-key="${mapKey}" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;background:linear-gradient(180deg, rgba(36,68,92,0.96), rgba(12,34,50,0.98));border:1px solid rgba(240,202,112,0.36);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;cursor:pointer;flex:1;text-align:left;">` +
          `<span>${String(item && item.label || "Sans titre")}</span>` +
          `<span style="font-size:11px;color:#bfae8b;">Lancer</span>` +
        `</button>` +
        `<span title="Glisser pour reordonner" style="width:32px;min-width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid rgba(214,180,106,0.24);background:rgba(255,255,255,0.05);color:#f0d087;font-size:16px;">::</span>` +
      `</div>` +
      `<div style="display:flex;flex-wrap:wrap;gap:6px;">` +
        `<button type="button" data-map-action="rename" data-map-key="${mapKey}" style="padding:7px 9px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;">Renommer</button>` +
        `<button type="button" data-map-action="delete" data-map-key="${mapKey}" style="padding:7px 9px;background:rgba(90,22,22,0.55);color:#ffd7d7;border:1px solid rgba(214,110,110,0.28);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:11px;">Supprimer</button>` +
      `</div>`
    host.appendChild(card)
  } catch (_) {}
}

function ensureSandboxMapMenuInteractions() {
  const panel = document.getElementById("mapMenu")
  if (!panel || panel.dataset.mapInteractionsBound === "1") return
  panel.dataset.mapInteractionsBound = "1"
  panel.addEventListener("click", function(event) {
    const actionButton = event.target.closest("[data-map-action]")
    if (!actionButton) return
    event.preventDefault()
    event.stopPropagation()
    const action = String(actionButton.getAttribute("data-map-action") || "")
    const mapKey = String(actionButton.getAttribute("data-map-key") || "")
    if (!mapKey) return
    if (action === "launch") launchSandboxMapByKey(mapKey)
    if (action === "rename") renameSandboxMapByKey(mapKey)
    if (action === "delete") deleteSandboxMapByKey(mapKey)
  })
  panel.addEventListener("dragstart", function(event) {
    const card = event.target.closest("[data-map-card]")
    if (!card) return
    startSandboxMapDragByKey(card.getAttribute("data-map-key"))
  })
  panel.addEventListener("dragover", function(event) {
    const card = event.target.closest("[data-map-card]")
    if (!card) return
    event.preventDefault()
  })
  panel.addEventListener("drop", function(event) {
    const card = event.target.closest("[data-map-card]")
    if (!card) return
    event.preventDefault()
    dropSandboxMapByKey(card.getAttribute("data-map-key"))
  })
  panel.addEventListener("dragend", function() {
    endSandboxMapDrag()
  })
}

function closeSandboxMapManagerV2() {
  const overlay = document.getElementById("sandboxMapManagerOverlay")
  if (overlay) overlay.style.display = "none"
  return false
}

function getSimpleSandboxPnjs() {
  try {
    if (Array.isArray(window.__simpleSandboxPnjs)) {
      window.__simpleSandboxPnjs = window.__simpleSandboxPnjs.map((item, index) => ({
        id: String(item && item.id || ("pnj_" + index)),
        label: String(item && item.label || "PNJ"),
        image: String(item && item.image || ""),
        category: String(item && item.category || "Custom")
      }))
      return window.__simpleSandboxPnjs
    }
    if (typeof getCustomization !== "function") {
      window.__simpleSandboxPnjs = []
      return window.__simpleSandboxPnjs
    }
    const data = getCustomization()
    const content = data && data.content ? data.content : {}
    window.__simpleSandboxPnjs = Array.isArray(content.pnjs) ? content.pnjs.map((item, index) => ({
      id: String(item && item.id || ("pnj_" + index)),
      label: String(item && item.label || "PNJ"),
      image: String(item && item.image || ""),
      category: String(item && item.category || "Custom")
    })) : []
    return window.__simpleSandboxPnjs
  } catch (_) {}
  window.__simpleSandboxPnjs = Array.isArray(window.__simpleSandboxPnjs) ? window.__simpleSandboxPnjs : []
  return window.__simpleSandboxPnjs
}

function saveSimpleSandboxPnjs(items) {
  try {
    const safeItems = Array.isArray(items) ? items.map((item, index) => ({
      id: String(item && item.id || ("pnj_" + index)),
      label: String(item && item.label || "PNJ"),
      image: String(item && item.image || ""),
      category: String(item && item.category || "Custom")
    })) : []
    window.__simpleSandboxPnjs = safeItems
    if (typeof getCustomization === "function" && typeof saveCustomization === "function") {
      const next = getCustomization()
      next.content = next.content || { maps: [], pnjs: [], highPnjs: [], mobs: [], documents: [] }
      next.content.pnjs = safeItems.map(item => ({
        id: item.id,
        label: item.label,
        image: item.image,
        category: item.category
      }))
      saveCustomization(next)
      try { if (typeof applyCustomizationToUI === "function") applyCustomizationToUI() } catch (_) {}
    }
    return true
  } catch (_) {}
  return false
}

function launchSandboxPnj(index) {
  try {
    const items = getSimpleSandboxPnjs()
    const item = items[Number(index)]
    if (!item || !item.image) return false
    const preferredSlot = (typeof currentPNJSlot !== "undefined" && Number(currentPNJSlot) > 0)
      ? Number(currentPNJSlot)
      : 1
    if (typeof openPNJ === "function") {
      openPNJ(String(item.image || ""), { slot: preferredSlot, name: String(item.label || "PNJ") })
    }
    try {
      if (preferredSlot === 1 && typeof showStoryImage === "function") {
        showStoryImage(String(item.image || ""))
      } else {
        const boxId = preferredSlot === 2 ? "storyImage2" : "storyImage3"
        const imgId = preferredSlot === 2 ? "storyImageContent2" : "storyImageContent3"
        const box = document.getElementById(boxId)
        const img = document.getElementById(imgId)
        if (box && img) {
          img.src = typeof resolvePNJImageSrc === "function"
            ? resolvePNJImageSrc(String(item.image || ""))
            : String(item.image || "")
          box.style.opacity = "0"
          box.style.display = "flex"
          if (typeof pnjSlotOrder !== "undefined" && Array.isArray(pnjSlotOrder) && !pnjSlotOrder.includes(preferredSlot)) {
            pnjSlotOrder.push(preferredSlot)
          }
          if (typeof updatePNJPositions === "function") setTimeout(updatePNJPositions, 50)
          setTimeout(function() { box.style.opacity = "1" }, 60)
        }
      }
      if (item.label) {
        document.querySelectorAll("[id^='pnjNameTag']").forEach(function(el) { el.remove() })
        const tag = document.createElement("div")
        tag.id = "pnjNameTag_custom_" + String(index)
        tag.innerText = String(item.label)
        tag.style.cssText = "position:fixed;bottom:12%;left:50%;transform:translateX(-50%);font-family:'Cinzel Decorative','Cinzel',serif;font-size:20px;color:#f0e8c8;letter-spacing:3px;text-shadow:0 0 8px rgba(30,160,180,0.6),1px 1px 4px black;pointer-events:none;z-index:2147483647;opacity:0;transition:opacity 0.6s ease;background:rgba(8,20,24,0.9);border:1px solid rgba(30,90,102,0.5);border-radius:3px;padding:6px 20px;white-space:nowrap;"
        document.body.appendChild(tag)
        setTimeout(function() { tag.style.opacity = "1" }, 100)
      }
    } catch (_) {}
    try {
      if (typeof showNotification === "function") showNotification("PNJ affiche")
    } catch (_) {}
    try {
      const overlay = document.getElementById("sandboxPnjManagerOverlay")
      if (overlay) overlay.style.display = "flex"
      const content = overlay ? overlay.querySelector("[data-sandbox-pnj-list]") : null
      if (content) content.scrollTop = 0
    } catch (_) {}
    try {
      if (typeof renderSandboxPnjManagerOverlayV2 === "function") renderSandboxPnjManagerOverlayV2()
    }
    catch (_) {}
    return false
  } catch (_) {}
  return false
}

function renameSandboxPnj(index) {
  try {
    const items = getSimpleSandboxPnjs().slice()
    const item = items[Number(index)]
    if (!item) return false
    const nextLabel = prompt("Nom du PNJ :", String(item.label || "PNJ"))
    if (nextLabel == null) return false
    const trimmedLabel = String(nextLabel).trim()
    if (!trimmedLabel) {
      if (typeof showNotification === "function") showNotification("Nom obligatoire")
      return false
    }
    item.label = trimmedLabel
    saveSimpleSandboxPnjs(items)
    closeSandboxPnjManagerV2()
    return false
  } catch (_) {}
  return false
}

function deleteSandboxPnj(index) {
  try {
    const items = getSimpleSandboxPnjs().slice()
    const item = items[Number(index)]
    if (!item) return false
    if (!confirm("Supprimer ce PNJ ?")) return false
    items.splice(Number(index), 1)
    saveSimpleSandboxPnjs(items)
    closeSandboxPnjManagerV2()
    if (typeof showNotification === "function") showNotification("PNJ supprime")
    return false
  } catch (_) {}
  return false
}

function startSandboxPnjDrag(index) {
  window.__sandboxDraggedPnjIndex = Number(index)
}

function dropSandboxPnj(targetIndex) {
  const sourceIndex = Number(window.__sandboxDraggedPnjIndex)
  const destIndex = Number(targetIndex)
  window.__sandboxDraggedPnjIndex = null
  if (!Number.isFinite(sourceIndex) || !Number.isFinite(destIndex) || sourceIndex === destIndex) return false
  const items = getSimpleSandboxPnjs().slice()
  if (sourceIndex < 0 || destIndex < 0 || sourceIndex >= items.length || destIndex >= items.length) return false
  const moved = items.splice(sourceIndex, 1)[0]
  items.splice(destIndex, 0, moved)
  saveSimpleSandboxPnjs(items)
  renderSandboxPnjManagerOverlayV2()
  return false
}

function endSandboxPnjDrag() {
  window.__sandboxDraggedPnjIndex = null
}

function closeSandboxPnjCreateComposerV2() {
  const overlay = document.getElementById("sandboxPnjManagerOverlay")
  if (!overlay) return false
  const composer = overlay.querySelector("[data-pnj-manager-composer]")
  if (composer) composer.style.display = "none"
  return false
}

function openSandboxPnjCreateComposerV2() {
  const overlay = document.getElementById("sandboxPnjManagerOverlay")
  if (!overlay) return false
  const composer = overlay.querySelector("[data-pnj-manager-composer]")
  const nameInput = overlay.querySelector("[data-pnj-manager-name]")
  const fileInput = overlay.querySelector("[data-pnj-manager-file]")
  if (composer) composer.style.display = "grid"
  if (nameInput) nameInput.value = ""
  if (fileInput) fileInput.value = ""
  return false
}

function submitSandboxPnjManagerCreateV2() {
  try {
    const overlay = document.getElementById("sandboxPnjManagerOverlay")
    if (!overlay) return false
    const nameInput = overlay.querySelector("[data-pnj-manager-name]")
    const fileInput = overlay.querySelector("[data-pnj-manager-file]")
    const fallbackName = fileInput && fileInput.files && fileInput.files[0]
      ? String(fileInput.files[0].name || "PNJ").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim()
      : "PNJ"
    const nextLabel = String(nameInput && nameInput.value || fallbackName).trim()
    const file = fileInput && fileInput.files ? fileInput.files[0] : null
    if (!nextLabel) {
      if (typeof showNotification === "function") showNotification("Nom obligatoire")
      return false
    }
    if (!file) {
      if (typeof showNotification === "function") showNotification("Image obligatoire")
      return false
    }
    Promise.resolve(
      typeof readNativeStudioFileAsDataURL === "function"
        ? readNativeStudioFileAsDataURL(file)
        : ""
    ).then(function(asset) {
      const image = String(asset || "").trim()
      if (!image) {
        if (typeof showNotification === "function") showNotification("Image invalide")
        return
      }
      const items = getSimpleSandboxPnjs().slice()
      items.push({
        id: "pnj_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
        label: nextLabel,
        image: image,
        category: "Custom"
      })
      saveSimpleSandboxPnjs(items)
      closeSandboxPnjCreateComposerV2()
      try { renderSandboxPnjManagerOverlayV2() } catch (_) {}
      if (typeof showNotification === "function") showNotification("PNJ ajoute")
    }).catch(function() {
      if (typeof showNotification === "function") showNotification("Lecture du fichier impossible")
    })
  } catch (_) {}
  return false
}

function createSandboxPnjManagerCard(item, index) {
  const label = String(item && item.label || "PNJ")
  const previewMode = !!(document.body && document.body.classList.contains("sandbox-preview-mode"))
  const card = document.createElement("div")
  card.className = "sandboxMapManagerCard"
  card.style.cssText = "display:grid;gap:8px;padding:12px;background:rgba(0,0,0,0.18);border:1px solid rgba(214,180,106,0.18);border-radius:12px;"

  const topRow = document.createElement("div")
  topRow.className = "sandboxMapManagerCardTopRow"
  topRow.style.cssText = "display:flex;gap:8px;align-items:center;"

  const launchBtn = document.createElement("button")
  launchBtn.type = "button"
  launchBtn.className = "sandboxMapManagerLaunchButton"
  launchBtn.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;background:linear-gradient(180deg, rgba(36,68,92,0.96), rgba(12,34,50,0.98));border:1px solid rgba(240,202,112,0.36);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;cursor:pointer;flex:1;text-align:left;"
  launchBtn.innerHTML = previewMode
    ? `<span>${label}</span>`
    : `<span>${label}</span><span style="font-size:11px;color:#bfae8b;">Afficher</span>`
  launchBtn.addEventListener("click", function(event) {
    event.preventDefault()
    event.stopPropagation()
    launchSandboxPnj(index)
  })
  topRow.appendChild(launchBtn)

  const dragHandle = document.createElement("span")
  dragHandle.className = "sandboxMapManagerDragHandle"
  dragHandle.setAttribute("draggable", "true")
  dragHandle.title = "Glisser pour reordonner"
  dragHandle.style.cssText = "width:32px;min-width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid rgba(214,180,106,0.24);background:rgba(255,255,255,0.05);color:#f0d087;font-size:16px;cursor:grab;"
  dragHandle.textContent = "::"
  dragHandle.addEventListener("dragstart", function(event) {
    event.stopPropagation()
    startSandboxPnjDrag(index)
  })
  if (!previewMode) topRow.appendChild(dragHandle)

  const actionsRow = document.createElement("div")
  actionsRow.className = "sandboxMapManagerActionsRow"
  actionsRow.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;"

  const renameBtn = document.createElement("button")
  renameBtn.type = "button"
  renameBtn.className = "sandboxMapManagerActionButton"
  renameBtn.style.cssText = "padding:8px 10px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;"
  renameBtn.textContent = "Renommer"
  renameBtn.addEventListener("click", function(event) {
    event.preventDefault()
    event.stopPropagation()
    renameSandboxPnj(index)
  })

  const deleteBtn = document.createElement("button")
  deleteBtn.type = "button"
  deleteBtn.className = "sandboxMapManagerDeleteButton"
  deleteBtn.style.cssText = "padding:8px 10px;background:rgba(90,22,22,0.55);color:#ffd7d7;border:1px solid rgba(214,110,110,0.28);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;"
  deleteBtn.textContent = "Supprimer"
  deleteBtn.addEventListener("click", function(event) {
    event.preventDefault()
    event.stopPropagation()
    deleteSandboxPnj(index)
  })

  if (!previewMode) {
    actionsRow.appendChild(renameBtn)
    actionsRow.appendChild(deleteBtn)
    card.addEventListener("dragover", function(event) {
      event.preventDefault()
    })
    card.addEventListener("drop", function(event) {
      event.preventDefault()
      dropSandboxPnj(index)
    })
    card.addEventListener("dragend", function() {
      endSandboxPnjDrag()
    })
  }

  card.appendChild(topRow)
  if (!previewMode) card.appendChild(actionsRow)
  return card
}

function renderSandboxPnjManagerOverlayV2() {
  const overlay = document.getElementById("sandboxPnjManagerOverlay")
  if (!overlay) return
  const panel = overlay.querySelector(".sandboxMapManagerPanel")
  const title = overlay.querySelector(".sandboxMapManagerTitle")
  const subtitle = overlay.querySelector(".sandboxMapManagerSubtitle")
  const content = overlay.querySelector("[data-pnj-manager-content]")
  const debug = overlay.querySelector("[data-pnj-manager-debug]")
  const previewMode = !!(document.body && document.body.classList.contains("sandbox-preview-mode"))
  if (panel) panel.classList.toggle("sandboxMapManagerPanel--preview", previewMode)
  if (title) title.textContent = "PNJ"
  if (subtitle) subtitle.style.display = previewMode ? "none" : ""
  if (!content) return
  const items = getSimpleSandboxPnjs()
  if (debug) debug.textContent = "PNJ : " + items.length
  content.innerHTML = ""
  if (!items.length) {
    content.innerHTML = `<div style="font-size:12px;color:#bfae8b;padding:10px;background:rgba(0,0,0,0.18);border:1px dashed rgba(214,180,106,0.18);border-radius:10px;">Aucun PNJ pour le moment.</div>`
    return
  }
  items.forEach(function(item, index) {
    content.appendChild(createSandboxPnjManagerCard(item, index))
  })
}

function closeSandboxPnjManagerV2() {
  const overlay = document.getElementById("sandboxPnjManagerOverlay")
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay)
  try {
    const legacy = document.getElementById("pnjMenu")
    if (legacy) legacy.style.display = "none"
  } catch (_) {}
  try {
    if (window.__sandboxPnjEscapeHandlerAttached) {
      window.removeEventListener("keydown", window.__sandboxPnjEscapeHandlerAttached, true)
      window.__sandboxPnjEscapeHandlerAttached = null
    }
    if (window.__sandboxPnjEscapeHandlerKeyupAttached) {
      window.removeEventListener("keyup", window.__sandboxPnjEscapeHandlerKeyupAttached, true)
      window.__sandboxPnjEscapeHandlerKeyupAttached = null
    }
  } catch (_) {}
  return false
}

function closeVisibleSandboxPnjLocal() {
  try {
    const ids = [
      ["storyImage", "storyImageContent"],
      ["storyImage2", "storyImageContent2"],
      ["storyImage3", "storyImageContent3"]
    ]
    let closed = false
    ids.forEach(function(pair) {
      const box = document.getElementById(pair[0])
      const img = document.getElementById(pair[1])
      if (!box || box.style.display === "none") return
      closed = true
      box.style.opacity = "0"
      box.style.display = "none"
      box.style.left = ""
      box.style.right = ""
      box.style.transform = ""
      if (img) img.removeAttribute("src")
    })
    document.querySelectorAll("[id^='pnjNameTag']").forEach(function(tag) {
      tag.remove()
    })
    try {
      if (typeof pnjSlotOrder !== "undefined" && Array.isArray(pnjSlotOrder)) pnjSlotOrder.length = 0
    } catch (_) {}
    try {
      if (typeof updatePNJPositions === "function") updatePNJPositions()
    } catch (_) {}
    try {
      if (closed && typeof db !== "undefined" && db && typeof db.ref === "function") {
        db.ref("game/storyImage").remove().catch(function() {})
        db.ref("game/storyImage2").remove().catch(function() {})
        db.ref("game/storyImage3").remove().catch(function() {})
        db.ref("game/highPNJName").remove().catch(function() {})
      }
    } catch (_) {}
    return closed
  } catch (_) {}
  return false
}

function openSandboxPnjManagerV2() {
  try {
    const previewMode = !!(document.body && document.body.classList.contains("sandbox-preview-mode"))
    document.querySelectorAll(".gmSection").forEach(function(sec) {
      sec.style.display = "none"
    })
    let overlay = document.getElementById("sandboxPnjManagerOverlay")
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay)
    overlay = document.createElement("div")
    overlay.id = "sandboxPnjManagerOverlay"
    overlay.className = "sandboxMapManagerOverlay"
    overlay.tabIndex = -1
    overlay.style.cssText = "position:fixed;inset:0;z-index:10060;background:rgba(8,10,18,0.46);display:flex;align-items:center;justify-content:center;padding:24px;"
    overlay.innerHTML =
        `<div class="sandboxMapManagerPanel" style="width:min(960px, 92vw);max-height:88vh;overflow:auto;display:grid;gap:14px;padding:22px;border-radius:22px;background:linear-gradient(180deg, rgba(38,52,88,0.96), rgba(16,22,36,0.98));border:1px solid rgba(214,180,106,0.28);box-shadow:0 24px 80px rgba(0,0,0,0.42);font-family:Cinzel,serif;">` +
          `<div class="sandboxMapManagerHeader" style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">` +
            `<div class="sandboxMapManagerHeaderText" style="display:grid;gap:6px;">` +
              `<div class="sandboxMapManagerTitle" style="font-size:14px;letter-spacing:2px;color:#e6c27a;">PNJ</div>` +
              `<div class="sandboxMapManagerSubtitle" style="font-size:12px;line-height:1.6;color:rgba(255,240,210,0.82);">Ajoute tes PNJ, donne-leur un nom, puis clique dessus pour les afficher sur le board.</div>` +
            `</div>` +
            `<button type="button" class="sandboxMapManagerActionButton sandboxMapManagerCloseButton" data-pnj-manager-action="close" style="padding:8px 12px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:10px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Fermer</button>` +
          `</div>` +
          (previewMode ? `` : `<div class="sandboxMapManagerToolbar" style="display:flex;flex-wrap:wrap;gap:8px;">` +
            `<button type="button" class="sandboxMapManagerActionButton sandboxMapManagerPrimaryButton" data-pnj-manager-action="new-pnj" style="padding:9px 10px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Nouveau PNJ</button>` +
          `</div>`) +
          `<div class="sandboxMapManagerComposer" data-pnj-manager-composer style="display:none;grid-template-columns:1fr;gap:10px;padding:12px;border-radius:14px;background:rgba(0,0,0,0.16);border:1px solid rgba(214,180,106,0.18);">` +
            `<input type="text" class="sandboxMapManagerInput" data-pnj-manager-name placeholder="Nom du PNJ" style="padding:10px 12px;border-radius:10px;border:1px solid rgba(214,180,106,0.2);background:rgba(10,18,30,0.55);color:#f5e6c8;font-family:Cinzel,serif;">` +
            `<input type="file" class="sandboxMapManagerFileInput" data-pnj-manager-file accept="image/*" style="color:#f5e6c8;font-family:Cinzel,serif;">` +
            `<div class="sandboxMapManagerComposerActions" style="display:flex;gap:8px;flex-wrap:wrap;">` +
              `<button type="button" class="sandboxMapManagerActionButton sandboxMapManagerPrimaryButton" data-pnj-manager-action="confirm-create" style="padding:9px 10px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Ajouter</button>` +
              `<button type="button" class="sandboxMapManagerActionButton" data-pnj-manager-action="cancel-create" style="padding:9px 10px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Annuler</button>` +
            `</div>` +
          `</div>` +
          `<div class="sandboxMapManagerDebug" data-pnj-manager-debug style="font-size:11px;color:#bfae8b;"></div>` +
          `<div class="sandboxMapManagerContent" data-pnj-manager-content style="display:grid;gap:10px;"></div>` +
        `</div>`
    document.body.appendChild(overlay)
    overlay.addEventListener("click", function(event) {
      const actionButton = event.target.closest("[data-pnj-manager-action]")
      if (actionButton) {
        event.preventDefault()
        event.stopPropagation()
        const action = String(actionButton.getAttribute("data-pnj-manager-action") || "")
        if (action === "close") closeSandboxPnjManagerV2()
        if (action === "new-pnj") openSandboxPnjCreateComposerV2()
        if (action === "cancel-create") closeSandboxPnjCreateComposerV2()
        if (action === "confirm-create") submitSandboxPnjManagerCreateV2()
        return
      }
      if (event.target === overlay) closeSandboxPnjManagerV2()
    })
    overlay.addEventListener("keydown", function(event) {
      if (String(event.key || "").toLowerCase() !== "escape") return
      event.preventDefault()
      event.stopPropagation()
      closeSandboxPnjManagerV2()
    })
    var currentTheme = "medieval_fantasy"
    try {
      currentTheme = String(
        window.__currentProjectTheme
        || document.body.getAttribute("data-project-theme")
        || "medieval_fantasy"
      ).trim() || "medieval_fantasy"
    } catch (_) {}
    overlay.setAttribute("data-map-theme", currentTheme)
    const panel = overlay.querySelector(".sandboxMapManagerPanel")
    if (panel) panel.setAttribute("data-map-theme", currentTheme)
    overlay.classList.toggle("sandboxMapManagerOverlay--preview", !!(document.body && document.body.classList.contains("sandbox-preview-mode")))
    overlay.style.display = "flex"
    try { overlay.focus() } catch (_) {}
    try {
      if (!window.__sandboxPnjEscapeHandlerAttached) {
        window.__sandboxPnjEscapeHandlerAttached = function(event) {
          if (String(event.key || "").toLowerCase() !== "escape") return
          const visibleOverlay = document.getElementById("sandboxPnjManagerOverlay")
          const legacy = document.getElementById("pnjMenu")
          if ((!visibleOverlay || visibleOverlay.style.display === "none") && (!legacy || legacy.style.display === "none")) return
          event.preventDefault()
          event.stopPropagation()
          if (typeof closeSandboxPnjManagerV2 === "function") closeSandboxPnjManagerV2()
          else {
            if (visibleOverlay && visibleOverlay.parentNode) visibleOverlay.parentNode.removeChild(visibleOverlay)
            if (legacy) legacy.style.display = "none"
          }
        }
        window.addEventListener("keydown", window.__sandboxPnjEscapeHandlerAttached, true)
      }
      if (!window.__sandboxPnjEscapeHandlerKeyupAttached) {
        window.__sandboxPnjEscapeHandlerKeyupAttached = function(event) {
          if (String(event.key || "").toLowerCase() !== "escape") return
          const visibleOverlay = document.getElementById("sandboxPnjManagerOverlay")
          const legacy = document.getElementById("pnjMenu")
          if ((!visibleOverlay || visibleOverlay.style.display === "none") && (!legacy || legacy.style.display === "none")) return
          event.preventDefault()
          event.stopPropagation()
          if (typeof closeSandboxPnjManagerV2 === "function") closeSandboxPnjManagerV2()
        }
        window.addEventListener("keyup", window.__sandboxPnjEscapeHandlerKeyupAttached, true)
      }
    } catch (_) {}
    renderSandboxPnjManagerOverlayV2()
  } catch (_) {}
  return false
}

function createSandboxMapManagerCard(item, index) {
  const label = String(item && item.label || "Sans titre")
  const previewMode = !!(document.body && document.body.classList.contains("sandbox-preview-mode"))

  const card = document.createElement("div")
  card.className = "sandboxMapManagerCard"
  card.style.cssText = "display:grid;gap:8px;padding:12px;background:rgba(0,0,0,0.18);border:1px solid rgba(214,180,106,0.18);border-radius:12px;"

  const topRow = document.createElement("div")
  topRow.className = "sandboxMapManagerCardTopRow"
  topRow.style.cssText = "display:flex;gap:8px;align-items:center;"

  const launchBtn = document.createElement("button")
  launchBtn.type = "button"
  launchBtn.className = "sandboxMapManagerLaunchButton"
  launchBtn.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;background:linear-gradient(180deg, rgba(36,68,92,0.96), rgba(12,34,50,0.98));border:1px solid rgba(240,202,112,0.36);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;cursor:pointer;flex:1;text-align:left;"
  launchBtn.innerHTML = previewMode
    ? `<span>${label}</span>`
    : `<span>${label}</span><span style="font-size:11px;color:#bfae8b;">Lancer</span>`
  launchBtn.addEventListener("click", function(event) {
    event.preventDefault()
    event.stopPropagation()
    launchSandboxMap(index)
  })

  const dragHandle = document.createElement("span")
  dragHandle.className = "sandboxMapManagerDragHandle"
  dragHandle.setAttribute("draggable", "true")
  dragHandle.title = "Glisser pour reordonner"
  dragHandle.style.cssText = "width:32px;min-width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid rgba(214,180,106,0.24);background:rgba(255,255,255,0.05);color:#f0d087;font-size:16px;cursor:grab;"
  dragHandle.textContent = "::"
  dragHandle.addEventListener("dragstart", function(event) {
    event.stopPropagation()
    startSandboxMapDrag(index)
  })

  topRow.appendChild(launchBtn)
  if (!previewMode) topRow.appendChild(dragHandle)

  const actionsRow = document.createElement("div")
  actionsRow.className = "sandboxMapManagerActionsRow"
  actionsRow.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;"

  const renameBtn = document.createElement("button")
  renameBtn.type = "button"
  renameBtn.className = "sandboxMapManagerActionButton"
  renameBtn.style.cssText = "padding:8px 10px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;"
  renameBtn.textContent = "Renommer"
  renameBtn.addEventListener("click", function(event) {
    event.preventDefault()
    event.stopPropagation()
    renameSandboxMap(index)
    renderSandboxMapManagerOverlayV2()
  })

  const deleteBtn = document.createElement("button")
  deleteBtn.type = "button"
  deleteBtn.className = "sandboxMapManagerDeleteButton"
  deleteBtn.style.cssText = "padding:8px 10px;background:rgba(90,22,22,0.55);color:#ffd7d7;border:1px solid rgba(214,110,110,0.28);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;"
  deleteBtn.textContent = "Supprimer"
  deleteBtn.addEventListener("click", function(event) {
    event.preventDefault()
    event.stopPropagation()
    deleteSandboxMap(index)
  })

  if (!previewMode) {
    actionsRow.appendChild(renameBtn)
    actionsRow.appendChild(deleteBtn)
  }

  if (!previewMode) {
    card.addEventListener("dragover", function(event) {
      event.preventDefault()
    })
    card.addEventListener("drop", function(event) {
      event.preventDefault()
      dropSandboxMap(index)
    })
    card.addEventListener("dragend", function() {
      endSandboxMapDrag()
    })
  }

  card.appendChild(topRow)
  if (!previewMode) card.appendChild(actionsRow)
  return card
}

function renderSandboxMapManagerOverlayV2() {
  try { ensureTutorialStartMapInSimpleMaps() } catch (_) {}
  const overlay = document.getElementById("sandboxMapManagerOverlay")
  if (!overlay) return
  const panel = overlay.querySelector(".sandboxMapManagerPanel")
  const title = overlay.querySelector(".sandboxMapManagerTitle")
  const subtitle = overlay.querySelector(".sandboxMapManagerSubtitle")
  const content = overlay.querySelector("[data-map-manager-content]")
  const debug = overlay.querySelector("[data-map-manager-debug]")
  const previewMode = !!(document.body && document.body.classList.contains("sandbox-preview-mode"))
  if (panel) panel.classList.toggle("sandboxMapManagerPanel--preview", previewMode)
  if (title) title.textContent = "Maps et lieux"
  if (subtitle) subtitle.style.display = previewMode ? "none" : ""
  if (!content) return
  const maps = getSimpleSandboxMaps()
  if (debug) debug.textContent = "Maps : " + maps.length
  content.innerHTML = ""
  if (!maps.length) {
    content.innerHTML = `<div style="font-size:12px;color:#bfae8b;padding:10px;background:rgba(0,0,0,0.18);border:1px dashed rgba(214,180,106,0.18);border-radius:10px;">Aucune map pour le moment.</div>`
    return
  }
  maps.forEach((item, index) => {
    content.appendChild(createSandboxMapManagerCard(item, index))
  })
}

function openSandboxMapManager() {
  try {
    document.querySelectorAll(".gmSection").forEach(sec => {
      sec.style.display = "none"
    })
    let overlay = document.getElementById("sandboxMapManagerOverlay")
    if (!overlay) {
      overlay = document.createElement("div")
      overlay.id = "sandboxMapManagerOverlay"
      overlay.style.cssText = "position:fixed;inset:0;z-index:10060;background:rgba(8,10,18,0.46);display:flex;align-items:center;justify-content:center;padding:24px;"
      overlay.innerHTML =
        `<div style="width:min(960px, 92vw);max-height:88vh;overflow:auto;display:grid;gap:14px;padding:22px;border-radius:22px;background:linear-gradient(180deg, rgba(38,52,88,0.96), rgba(16,22,36,0.98));border:1px solid rgba(214,180,106,0.28);box-shadow:0 24px 80px rgba(0,0,0,0.42);font-family:Cinzel,serif;">` +
          `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">` +
            `<div style="display:grid;gap:6px;">` +
              `<div style="font-size:14px;letter-spacing:2px;color:#e6c27a;">Maps et lieux</div>` +
              `<div style="font-size:12px;line-height:1.6;color:rgba(255,240,210,0.82);">Ici ajoute tes maps et lieux. Nomme-les de facon claire pour t'y retrouver et donner une bonne scenerie aux joueurs.</div>` +
            `</div>` +
            `<button type="button" onclick="return closeSandboxMapManager()" style="padding:8px 12px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:10px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Fermer</button>` +
          `</div>` +
          `<div style="display:flex;flex-wrap:wrap;gap:8px;">` +
            `<button type="button" onclick="return launchOnboardingStartMap()" style="padding:9px 10px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Map de depart</button>` +
            `<button type="button" onclick="return createSandboxMapFromPanel()" style="padding:9px 10px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Nouvelle map</button>` +
          `</div>` +
          `<div data-map-manager-debug style="font-size:11px;color:#bfae8b;"></div>` +
          `<div data-map-manager-content style="display:grid;gap:10px;"></div>` +
        `</div>`
      document.body.appendChild(overlay)
      overlay.addEventListener("click", function(event) {
        if (event.target === overlay) closeSandboxMapManager()
      })
    }
    overlay.style.display = "flex"
    renderSandboxMapManagerOverlay()
  } catch (_) {}
  return false
}

function sanitizeLegacySandboxUI() {
  const gmSaveBtn = document.getElementById("gmSaveBtn")
  if (gmSaveBtn) gmSaveBtn.textContent = "Save"

  const diceToggle = document.getElementById("diceBarToggle")
  if (diceToggle) {
    diceToggle.textContent = "?"
    diceToggle.setAttribute("aria-label", "Replier les dés")
  }

  const playerAttackBtn = document.getElementById("playerAttackBtn")
  if (playerAttackBtn) playerAttackBtn.textContent = "?"

  const combatIntroText = document.getElementById("combatIntroText")
  if (combatIntroText) combatIntroText.textContent = "? PREPAREZ-VOUS AU COMBAT ?"

  const mobMenuTitle = document.getElementById("mobMenuTitle")
  if (mobMenuTitle) mobMenuTitle.textContent = "? CONFIGURATION DU COMBAT"

  const mobMenuLaunch = document.getElementById("mobMenuLaunch")
  if (mobMenuLaunch) mobMenuLaunch.textContent = "? Lancer"

  const wantedTitle = document.querySelector("#wantedEditor div")
  if (wantedTitle) wantedTitle.textContent = "? CREER UNE AFFICHE"

  const wantedReward = document.getElementById("wantedReward")
  if (wantedReward) wantedReward.placeholder = "Recompense"

  const defeatText = document.getElementById("defeatText")
  if (defeatText) defeatText.textContent = "DEFAITE"

  const defeatSubText = document.getElementById("defeatSubText")
  if (defeatSubText) defeatSubText.innerHTML = "Vos heros tombent dans l'obscurite...<br>La partie peut reprendre depuis le bac a sable."

  const playerCombatPanel = document.getElementById("playerCombatPanel")
  if (playerCombatPanel) {
    playerCombatPanel.innerHTML = `
      <div class="playerCombatTitle">Stats</div>
      <div class="playerStat">Force : <input id="combat_force"></div>
      <div class="playerStat">Charme : <input id="combat_charme"></div>
      <div class="playerStat">Perspi : <input id="combat_perspi"></div>
      <div class="playerStat">Chance : <input id="combat_chance"></div>
      <div class="playerStat">Defense : <input id="combat_defense"></div>
      <div class="playerStat">HP : <input id="combat_hp"><div id="combatHPBarContainer"><div id="combatHPBar"></div></div></div>
    `
  }

  const gmCharacters = document.getElementById("gmCharacters")
  if (gmCharacters) {
    if (typeof applyCustomizationToUI === "function") {
      setTimeout(applyCustomizationToUI, 20)
    } else {
      gmCharacters.innerHTML = `
        <button class="gmCharacterSlotButton" onclick="return openCharacterSheetFromMenuWithFallback('greg', event)">Joueur 1</button>
        <button class="gmCharacterSlotButton" onclick="return openCharacterSheetFromMenuWithFallback('ju', event)">Joueur 2</button>
        <button class="gmCharacterSlotButton" onclick="return openCharacterSheetFromMenuWithFallback('elo', event)">Joueur 3</button>
        <button class="gmCharacterSlotButton" onclick="return openCharacterSheetFromMenuWithFallback('bibi', event)">Joueur 4</button>
      `
    }
  }

  ;["mapMenu", "pnjMenu", "mobMenu2", "elementsMenu"].forEach(renderSandboxManagerPanelById)

  const mjLogTitle = document.querySelector("#mjLog .mjTitle span")
  if (mjLogTitle) mjLogTitle.textContent = "Journal du MJ"

  const mjLogToggle = document.getElementById("mjLogToggle")
  if (mjLogToggle) {
    mjLogToggle.textContent = "?"
    mjLogToggle.title = "Reduire"
  }
}

window.addEventListener("load", () => {
  setTimeout(sanitizeLegacySandboxUI, 30)
})

  function setGameState(state) {
    sanitizeLegacySandboxUI()
    gameState = state
  if (state !== "GAME" && state !== "COMBAT" && typeof cleanupRuneChallengeUI === "function") cleanupRuneChallengeUI()
  switch (state) {
    case "MENU":
      document.getElementById("intro").style.display    = "flex"
      document.getElementById("camera").style.display   = "none"
      document.getElementById("playerSelect").style.display = "none"
      document.getElementById("diceBar").style.display = "none"
      document.getElementById("diceLog").style.display = "none"
      startMenuSparks()
      break
    case "INTRO":
      document.getElementById("intro").style.display  = "flex"
      document.getElementById("camera").style.display = "none"
      document.getElementById("diceBar").style.display = "none"
      document.getElementById("diceLog").style.display = "none"
      ;["storyImage","storyImage2","storyImage3"].forEach(id => { const el=document.getElementById(id); if(el) { el.style.display="none"; el.style.opacity="0" } })
      document.querySelectorAll("[id^='pnjNameTag']").forEach(t => t.remove())
      break
    case "DIALOGUE":
      document.getElementById("dialogueBox").style.display = "flex"
      document.getElementById("intro").style.display       = "none"
      document.getElementById("diceBar").style.display = "none"
      document.getElementById("diceLog").style.display = "none"
      break
    case "GAME":
      document.getElementById("camera").style.display = "block"
      document.getElementById("diceBar").style.display = "flex"
      document.getElementById("diceLog").style.display = "block"
      // Ne montrer le menu de sÃ©lection que si le joueur n'a pas encore choisi
      if (!myToken) document.getElementById("playerSelect").style.display = "block"
      setTimeout(updateThuumButton, 500)
      break
      case "COMBAT":
        break
    }
    if (state !== "GAME") closeMapLoreBookOverlay()
    setTimeout(updateMadnessVisibility, 30)
    setTimeout(updateThuumButton, 30)
    setTimeout(updateMapLoreBookVisibility, 30)
  }

function hideIntroLayers() {
  const start = document.getElementById("startScreen")
  const intro = document.getElementById("intro")
  const introBox = document.getElementById("introBox")

  if (start) {
    start.style.display = "none"
    start.style.opacity = "0"
    start.style.pointerEvents = "none"
    start.style.visibility = "hidden"
  }

  if (intro) {
    intro.style.display = "none"
    intro.style.opacity = "0"
    intro.style.pointerEvents = "none"
    intro.style.visibility = "hidden"
    intro.style.zIndex = "-1"
  }
  if (introBox) {
    introBox.style.display = ""
    introBox.style.opacity = ""
    introBox.style.visibility = ""
    introBox.style.pointerEvents = ""
  }
}

function showIntroLayer() {
  const intro = document.getElementById("intro")
  const introBox = document.getElementById("introBox")
  if (!intro) return
  intro.style.display = "flex"
  intro.style.opacity = "1"
  intro.style.pointerEvents = "auto"
  intro.style.visibility = "visible"
  intro.style.zIndex = "15"
  if (introBox) {
    introBox.style.display = "flex"
    introBox.style.opacity = "1"
    introBox.style.visibility = "visible"
    introBox.style.pointerEvents = "auto"
  }
}

function startGame() {
        db.ref("combat/mob").remove(); db.ref("combat/mob2").remove(); db.ref("combat/mob3").remove(); db.ref("combat/usedAllies").remove()
        db.ref("combat/usedThuum").remove()
        db.ref("game/combatState").remove(); db.ref("game/combatOutcome").remove(); db.ref("game/playerAllyAccess").remove(); db.ref("game/playerThuum").remove(); db.ref("game/playerThuumAccess").remove(); db.ref("game/thuumCast").remove(); db.ref("game/thuumUnlockEvent").remove()
      db.ref("game/worldMapFogTopLeftHidden").set(false)
      db.ref("game/mapLoreBook").remove(); db.ref("game/readLoreBooks").remove()
      db.ref("events/aurora").remove()
      db.ref("game/shop").remove()
  db.ref("game/highPNJName").remove(); db.ref("game/runeChallenge").remove()
  db.ref("game/cemeterySpell").remove()
  cemeteryEventDone = false
    combatActive = false
    combatStarting = false
    window.__localPlayerId = ""
    try { localStorage.removeItem("rpg_local_player") } catch (e) {}
    if (window.__localDefeatRef && window.__localDefeatCb) {
      window.__localDefeatRef.off("value", window.__localDefeatCb)
      window.__localDefeatRef = null
      window.__localDefeatCb = null
    }
    window.__combatOutcomeShowing = false
    window.__pendingLocalDefeat = false
    window.playerThuumData = {}
    window.playerThuumAccessData = {}
    window.usedThuumData = {}
    window.mapLoreBookData = null
    window.readLoreBooksData = {}
    closeMapLoreBookOverlay()
    window.__shopWasOpen = false
    window.__shopInitDone = false
    window.__lastShopSoundState = null
    window.__lastShopSoundAt = 0
    window.__lastShopEventSignature = null
    window.__lastOpenedShopTime = null
    if (window.__combatStatsRef && window.__combatStatsCb) {
      window.__combatStatsRef.off("value", window.__combatStatsCb)
      window.__combatStatsRef = null
      window.__combatStatsCb = null
    }
    resetMadnessPresentation()
    if (typeof resetAuroraPresentation === "function") resetAuroraPresentation()
    updateMadnessVisibility()
    const playerThuumBtn = document.getElementById("playerThuumBtn")
    if (playerThuumBtn) playerThuumBtn.style.display = "none"
  if (typeof stopMenuSparks === "function") stopMenuSparks()
  const titleEl = document.getElementById("gameTitle")
  if (titleEl) { titleEl.classList.remove("visible"); titleEl.innerText = "" }
  document.body.focus()
  if (gameStarted) return
  gameStarted = true
  primeMapMusicChannels()
  playInitialMapMusic(window.__latestMapValue || "background.jpg")
  hideIntroLayers()
  setGameState(GAME_STATE.INTRO)
  const fade = document.getElementById("fadeScreen"); fade.style.opacity = 1
  const music = document.getElementById("music"); if (music) { music.pause(); music.currentTime = 0 }
  db.ref("game/map").once("value", snapshot => {
    const mapName = snapshot.val(); if (!mapName) return
    const map = document.getElementById("map")
    map.style.backgroundImage = "url('" + resolveImagePath(mapName) + "')"
    calculateMinZoom(); cameraZoom = minZoom; cameraX = 0; cameraY = 0; updateCamera()
  })
  setTimeout(() => {
    if (window.isNewGame) { window.isNewGame = false; playOpeningCinematic(startDialogue) }
    else showTavern()
  }, 1500)
}

function fadeOut() {
  const fade = document.getElementById("fadeScreen"); if (!fade) return; fade.style.opacity = 0
}

function showTavern() {
  if (typeof setBuilderShellVisible === "function") setBuilderShellVisible(false)
  hideIntroLayers()
  setGameState("GAME")
  const fade = document.getElementById("fadeScreen"); const map = document.getElementById("map")
  fadeOut()
  document.getElementById("camera").style.display  = "block"
  document.getElementById("diceBar").style.display  = "flex"
  document.getElementById("diceLog").style.display  = "block"
  tryAutoSelectAuthenticatedPlayer()
  // Ne montrer le menu de sÃ©lection que si le joueur n'a pas encore choisi
  if (!myToken) {
    document.getElementById("playerSelect").style.display = "block"
    setTimeout(openPlayerMenuOnStart, 100)
  }
  // Lire la vraie map depuis Firebase plutÃ´t que forcer la taverne
  db.ref("game/map").once("value", snap => {
    const mapName = snap.val() || "background.jpg"
    map.style.backgroundImage = "url('" + resolveImagePath(mapName) + "')"
    if (mapName === "MAPMONDE.jpg") { map.style.backgroundSize = "contain"; map.style.backgroundColor = "#0a0a1a" }
    else                            { map.style.backgroundSize = "cover";   map.style.backgroundColor = "" }
    currentMap = mapName
    calculateMinZoom(); cameraZoom = minZoom; cameraX = 0; cameraY = 0; updateCamera()
    if (isGM) syncCameraZoomToPlayers()
    if (isGM) maybeSpawnMapLoreBook(mapName)
    syncMapElementsFromDB()
    syncWantedStateFromDB()
    playInitialMapMusic(mapName)
    ensureMapMusicPlayback(mapName, 0)
    setTimeout(() => { fade.style.opacity = 0 }, 500)
    ensureMapMusicPlayback(mapName, 800)
    setTimeout(() => {
      const displayName = getMapDisplayLabel(mapName)
      if (displayName) showLocation(displayName)
    }, 2000)
    // Forcer rechargement des stats et positions des tokens
    setTimeout(() => {
      ;["greg","ju","elo","bibi"].forEach(pid => updateTokenStats(pid))
    }, 600)
  })
}

function startIntro() {
  if (window.__skipIntroHub) {
    setSandboxStudioMode(true)
    hideIntroLayers()
    return
  }
  setSandboxStudioMode(false)
  if (typeof startMenuSparks === "function") startMenuSparks()
  if (typeof stopAllMusic === "function") stopAllMusic()
  if (typeof preloadAssets === "function") preloadAssets()
  setGameState("INTRO")
  setTimeout(animateGameTitle, 300)
  const start = document.getElementById("startScreen")
  if (start) start.classList.add("fadeOut")
  setTimeout(() => {
    if (start) {
      start.style.display = "none"
      start.style.pointerEvents = "none"
      start.style.visibility = "hidden"
    }
    showIntroLayer()
    if (window.__skipIntroHub || document.body.classList.contains("sandbox-studio-mode")) return
    const music = document.getElementById("music"); music.volume = 0; music.play().catch(() => {})
    music.__baseVolume = 1
    music.__audioChannel = "music"
    let v = 0
    if (window.__menuMusicFadeInterval) clearInterval(window.__menuMusicFadeInterval)
    window.__menuMusicFadeInterval = setInterval(() => {
      const targetVolume = (typeof getScaledAudioVolume === "function")
        ? getScaledAudioVolume(1, "music")
        : ((typeof getUserMusicVolume === "function") ? getUserMusicVolume() : 0.8)
      if (v < targetVolume) {
        v = Math.min(targetVolume, v + 0.05)
        music.volume = v
      } else {
        music.volume = targetVolume
        clearInterval(window.__menuMusicFadeInterval)
        window.__menuMusicFadeInterval = null
      }
    }, 200)
  }, 120)
}

function animateGameTitle() {
  const titleEl = document.getElementById("gameTitle"); if (!titleEl) return
  let nextTitle = "Roleplay It Yourself"
  if (typeof getCustomization === "function") {
    const customization = getCustomization()
    nextTitle = String(customization?.project?.title || nextTitle).trim() || nextTitle
  }
  titleEl.innerText = nextTitle
  titleEl.classList.remove("visible")
  setTimeout(() => titleEl.classList.add("visible"), 50)
}

function startDialogue() {
  hideIntroLayers()
  setGameState("DIALOGUE")
  index = 0
  document.getElementById("dialogueBox").style.display = "flex"
  showDialogue()
  dialogueLock = true; setTimeout(() => { dialogueLock = false }, 300)
}

function showDialogue() {
  const d = dialogue[index]
  document.getElementById("dialoguePortrait").src = d.portrait
  document.getElementById("dialogueText").textContent = d.text
}

document.addEventListener("click", e => {
  if (gameState !== "DIALOGUE") return
  if (e.target.tagName === "BUTTON" || e.target.closest("button")) return
  index++
  if (index < dialogue.length) showDialogue()
  else { document.getElementById("dialogueBox").style.display = "none"; showTavern() }
})

/* ========================= */
/* GM                        */
/* ========================= */

function requestGM() {
  activateGM()
}

function activateGM(fromFirebaseRole = false) {
  isGM = true
  ensureSandboxStudioChromeVisible()
  const gmBar = document.getElementById("gmBar")
  const mjLog = document.getElementById("mjLog")
  const gmSaveBar = document.getElementById("gmSaveBar")
  if (gmBar) gmBar.style.display = "flex"
  if (mjLog) mjLog.style.display = "block"
  if (gmSaveBar) gmSaveBar.style.display = "block"
  try {
    if (document.body && document.body.classList.contains("sandbox-studio-mode")) {
      const diceBar = document.getElementById("diceBar")
      const diceLog = document.getElementById("diceLog")
      if (diceBar) diceBar.style.display = "flex"
      if (diceLog) diceLog.style.display = "block"
    }
  } catch (_) {}
  ensureMadnessGMButton()
  updateThuumButton()
  if (!window.__gmModeActivatedOnce) {
    window.__gmModeActivatedOnce = true
    showNotification(fromFirebaseRole ? "Mode MJ active (Firebase)" : "Mode MJ active")
  }
  // Fermer et masquer complÃ¨tement le menu de sÃ©lection
  const select = document.getElementById("playerSelect")
  if (select) {
    select.style.transition = "opacity 0.4s ease"
    select.style.opacity = "0"
    setTimeout(() => { select.style.display = "none" }, 400)
  }
  setTimeout(syncWantedStateFromDB, 60)
}

function openGMCharacterPicker() {
  if (typeof window !== "undefined" && typeof window.openGMCharacterPickerInline === "function") {
    return window.openGMCharacterPickerInline()
  }
  const existing = document.getElementById("gmCharacterPickerOverlay")
  if (existing) existing.remove()

  const overlay = document.createElement("div")
  overlay.id = "gmCharacterPickerOverlay"
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;z-index:2147483601;padding:20px;"
  overlay.addEventListener("click", event => {
    if (event.target === overlay) overlay.remove()
  })

  const panel = document.createElement("div")
  panel.style.cssText = "width:min(560px,92vw);display:grid;gap:14px;padding:22px 22px 18px;border-radius:18px;border:1px solid rgba(214,180,106,0.38);background:linear-gradient(180deg,rgba(28,22,17,0.98),rgba(16,13,10,0.98));box-shadow:0 28px 90px rgba(0,0,0,0.55);"

  const title = document.createElement("div")
  title.textContent = "Fiches personnages"
  title.style.cssText = "font-family:Cinzel,serif;font-size:24px;letter-spacing:2px;color:#f3dfb1;text-align:center;"
  panel.appendChild(title)

  const subtitle = document.createElement("div")
  subtitle.textContent = "Choisis la fiche a ouvrir."
  subtitle.style.cssText = "font-size:13px;line-height:1.6;color:#cdbb96;text-align:center;"
  panel.appendChild(subtitle)

  const grid = document.createElement("div")
  grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;"

  let count = 4
  try {
    if (typeof getCustomization === "function") {
      const data = getCustomization()
      if (data && data.project && data.project.playerCount) count = Math.max(1, parseInt(data.project.playerCount, 10) || 4)
    }
  } catch (e) {}

  const ids = ["greg", "ju", "elo", "bibi"]
  for (let i = 1; i <= count; i += 1) {
    const slotId = i <= 4 ? ids[i - 1] : ("slot_" + i)
    const button = document.createElement("button")
    let label = "Joueur " + i
    try {
      if (typeof getPlayerDisplayName === "function") label = getPlayerDisplayName(slotId) || label
    } catch (e) {}
    button.textContent = label
    button.style.cssText = "padding:14px 16px;border-radius:12px;border:1px solid rgba(214,180,106,0.32);background:linear-gradient(180deg,rgba(122,85,51,0.96),rgba(75,50,28,0.96));color:#f5e6c8;font-family:Cinzel,serif;font-size:15px;cursor:pointer;"
    button.addEventListener("click", event => {
      overlay.remove()
      if (typeof openCharacterSheetFromMenuWithFallback === "function") openCharacterSheetFromMenuWithFallback(slotId, event)
    })
    grid.appendChild(button)
  }

  panel.appendChild(grid)

  const closeBtn = document.createElement("button")
  closeBtn.textContent = "Fermer"
  closeBtn.style.cssText = "justify-self:center;padding:10px 16px;border-radius:10px;border:1px solid rgba(214,180,106,0.24);background:rgba(255,255,255,0.05);color:#f5e6c8;font-family:Cinzel,serif;cursor:pointer;"
  closeBtn.addEventListener("click", () => overlay.remove())
  panel.appendChild(closeBtn)

  overlay.appendChild(panel)
  document.body.appendChild(overlay)
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("gmCharactersBtn")
  if (!btn || btn.dataset.sheetPickerBound === "true") return
  if (btn.hasAttribute("onclick")) return
  btn.dataset.sheetPickerBound = "true"
  btn.addEventListener("click", event => {
    event.preventDefault()
    event.stopPropagation()
    openGMCharacterPicker()
  })
})

function toggleGMSection(id) {
  if (id === "gmCharacters") {
    openGMCharacterPicker()
    return
  }
  if (id === "mapMenu") {
    openSandboxMapManagerV2()
    return
  }
  if (id === "pnjMenu") {
    openSandboxPnjManagerV2()
    return
  }
  const section = document.getElementById(id); if (!section) return
  const isOpen = section.style.display === "block"
  document.querySelectorAll(".gmSection").forEach(sec => {
    sec.style.display = "none"
  })
  if (!isOpen) {
    try { renderSandboxManagerPanelById(id) } catch (_) {}
    if (id === "mapMenu") {
      try { forceRenderMapMenuPanelList() } catch (_) {}
      try { if (typeof syncOnboardingStartMapMenuButton === "function") syncOnboardingStartMapMenuButton() } catch (_) {}
    }
    section.style.display = "block"
  }
}

function toggleCategory(id, button) {
  const cat     = document.getElementById(id)
  if (!cat) return
  const opening = cat.style.display !== "block"

  // Trouve le panel parent (gmSection ou pnjTabContent)
  const parent = button.closest(".gmSection, .pnjTabContent")

  // Ferme tous les sous-menus du mÃªme panel parent seulement
  const scope = parent || document
  scope.querySelectorAll(".mapCategory").forEach(c => {
    if (c !== cat) {
      c.style.display = "none"
      c.style.maxHeight = ""
    }
  })
  scope.querySelectorAll(".mapCategoryButton").forEach(btn => {
    if (btn !== button) { btn.classList.remove("active"); const a = btn.querySelector(".arrow"); if (a) a.classList.remove("open") }
  })

  // Ouvre/ferme la cible avec animation
  if (opening) {
    cat.style.display = "block"
    cat.style.maxHeight = "0px"
    cat.style.overflow  = "hidden"
    cat.style.transition = "max-height 0.25s ease"
    requestAnimationFrame(() => { cat.style.maxHeight = cat.scrollHeight + "px" })
    button.classList.add("active")
    const arrow = button.querySelector(".arrow"); if (arrow) arrow.classList.add("open")
  } else {
    cat.style.transition = "max-height 0.2s ease"
    cat.style.maxHeight  = "0px"
    setTimeout(() => { cat.style.display = "none"; cat.style.maxHeight = "" }, 200)
    button.classList.remove("active")
    const arrow = button.querySelector(".arrow"); if (arrow) arrow.classList.remove("open")
  }
}

window.launchSandboxMapByKey = launchSandboxMapByKey
window.renameSandboxMapByKey = renameSandboxMapByKey
window.deleteSandboxMapByKey = deleteSandboxMapByKey
window.startSandboxMapDragByKey = startSandboxMapDragByKey
window.dropSandboxMapByKey = dropSandboxMapByKey
window.createSandboxMapFromPanel = createSandboxMapFromPanel
window.launchSandboxMap = launchSandboxMap
window.renameSandboxMap = renameSandboxMap
window.deleteSandboxMap = deleteSandboxMap
window.startSandboxMapDrag = startSandboxMapDrag
window.allowSandboxMapDrop = allowSandboxMapDrop
window.dropSandboxMap = dropSandboxMap
window.endSandboxMapDrag = endSandboxMapDrag

function openPNJTab(id, el) {
  if (window.event) window.event.stopPropagation()
  document.querySelectorAll(".pnjTabContent").forEach(tab => { tab.style.display = "none"; tab.classList.remove("active") })
  document.querySelectorAll(".pnjTab").forEach(tab => tab.classList.remove("active"))
  const target = document.getElementById(id)
  if (target) { target.style.display = "block"; target.classList.add("active") }
  el.classList.add("active")
}

document.addEventListener("click", function(event) {
  const button = event.target && event.target.closest ? event.target.closest(".gmSection button") : null
  if (!button) return
  if (button.classList.contains("pnjTab")) return
  if (button.classList.contains("mapCategoryButton")) return
  const panel = button.closest(".gmSection")
  if (!panel) return
  setTimeout(function() {
    if (panel && panel.style.display === "block") panel.style.display = "none"
  }, 40)
}, true)

function watchFreePoints(playerId) {
  db.ref("characters/" + playerId + "/freePoints").on("value", snap => {
    const pts = parseInt(snap.val()) || 0
    if (pts > 0 && typeof showFreePointsPanel === "function") {
      // N'afficher le panel que si ce joueur est bien le joueur local
      const localId = getLocalPlayerId()
      if (localId && localId === String(playerId).toLowerCase()) {
        showFreePointsPanel(playerId, pts)
      }
    }
  })
}

function choosePlayer(id) {
  if (isGM) {
    myToken = document.getElementById(id); window.myToken = myToken
    selected = null; _state.tokenDragging = false; _state.tokenDragStart = null
    document.querySelectorAll(".token").forEach(t => t.classList.remove("selectedPlayer", "gmSelected"))
    if (myToken) myToken.classList.add("selectedPlayer")
    showNotification("MJ joue : " + id.toUpperCase())
    watchLocalPlayerDefeat(id)
    updateThuumButton()
    _collapsePlayerMenu(id)
    setTimeout(() => openCharacterSheet(id), 50)
    return
  }
  if (!window.__activeJoinCode) { showNotification("Entre d'abord le code de partie"); return }
  if (myToken) { showNotification("Personnage deja choisi"); return }
  const presenceId = getLocalPresenceId()
  getSessionSlotRef(id).transaction(current => {
    if (current && current.claimedBy && current.claimedBy !== presenceId) return
    return {
      claimedBy: presenceId,
      claimedAt: Date.now()
    }
  }, (error, committed) => {
    if (error || !committed) {
      showNotification("Ce slot est deja pris")
      refreshSessionSlotAvailability()
      return
    }
    document.querySelectorAll(".token").forEach(t => t.classList.remove("selectedPlayer"))
    myToken = document.getElementById(id); window.myToken = myToken
    myToken.classList.add("selectedPlayer")
    showNotification("Votre heros est : " + id.toUpperCase())
    watchLocalPlayerDefeat(id)
    updateThuumButton()
    watchFreePoints(id)
    refreshSessionSlotAvailability()
    _collapsePlayerMenu(id)
  })
}

function _collapsePlayerMenu(id) {
  const select = document.getElementById("playerSelect")
  if (!select) return
  // Disparition complÃ¨te aprÃ¨s choix du personnage
  select.style.transition = "opacity 0.4s ease"
  select.style.opacity = "0"
  setTimeout(() => { select.style.display = "none" }, 400)
}

function togglePlayerMenu() {
  document.getElementById("playerMenu").classList.toggle("open")
}

function openPlayerMenuOnStart() {
  const menu = document.getElementById("playerMenu")
  updatePlayerAuthMenuState()
  refreshSessionSlotAvailability()
  if (menu && !myToken) menu.classList.add("open")
}

window.addEventListener("beforeunload", releaseLocalSessionSlot)

/* ========================= */
/* DRAG TOKENS               */
/* ========================= */

document.querySelectorAll(".token").forEach(token => {
  token.addEventListener("contextmenu", e => {
    e.preventDefault()
    if (isGM) { openCharacterSheet(token.id); return }
    if (myToken && token.id === myToken.id) openCharacterSheet()
  })
  token.addEventListener("mousedown", e => {
    if (e.target.closest("#playerSelect") || e.target.closest("button")) return
    const sandboxStudio = document.body.classList.contains("sandbox-studio-mode")
    if (sandboxStudio) return
    const now = Date.now()
    if (now - lastClickTime < 300) {
      if (isGM && token.id !== "mobToken") openCharacterSheet(token.id)
      else if (myToken && token.id === myToken.id) openCharacterSheet(token.id)
    }
    lastClickTime = now
    if (isGM) {
      const map = document.getElementById("map")
      const mapRect = map ? map.getBoundingClientRect() : { left: 0, top: 0 }
      document.querySelectorAll(".token").forEach(t => t.classList.remove("gmSelected"))
      token.classList.add("gmSelected"); selected = token; lastX = selected.offsetLeft
      _state.tokenDragOffset = {
        x: e.clientX - mapRect.left - selected.offsetLeft,
        y: e.clientY - mapRect.top - selected.offsetTop
      }
      _state.tokenDragStart = { x: e.clientX, y: e.clientY }; _state.tokenDragging = false
      selected.style.transition = "none"
      e.preventDefault(); e.stopPropagation(); return
    }
    if (!myToken || token.id !== myToken.id) return
    selected = token; lastX = selected.offsetLeft; e.preventDefault()
  })
})

window.__sandboxTokenDrag = null

document.querySelectorAll(".token").forEach(token => {
  token.addEventListener("pointerdown", e => {
    if (!document.body.classList.contains("sandbox-studio-mode")) return
    if (e.button !== 0) return
    if (token.id === "mobToken") return
    const map = document.getElementById("map")
    if (!map) return
    const rect = map.getBoundingClientRect()
    document.querySelectorAll(".token").forEach(t => t.classList.remove("gmSelected"))
    token.classList.add("gmSelected")
    window.__sandboxTokenDrag = {
      token,
      offsetX: e.clientX - rect.left - token.offsetLeft,
      offsetY: e.clientY - rect.top - token.offsetTop
    }
    token.dataset.mjPlaced = "true"
    token.style.transition = "none"
    token.style.cursor = "grabbing"
    e.preventDefault()
    e.stopPropagation()
  })
})

document.addEventListener("pointerdown", e => {
  if (!document.body.classList.contains("sandbox-studio-mode")) return
  const token = e.target && e.target.closest ? e.target.closest(".token") : null
  if (!token || token.id === "mobToken") return
  const map = document.getElementById("map")
  if (!map) return
  const rect = map.getBoundingClientRect()
  document.querySelectorAll(".token").forEach(t => t.classList.remove("gmSelected"))
  token.classList.add("gmSelected")
  window.__sandboxTokenDrag = {
    token,
    offsetX: e.clientX - rect.left - token.offsetLeft,
    offsetY: e.clientY - rect.top - token.offsetTop
  }
  token.dataset.mjPlaced = "true"
  token.style.transition = "none"
  token.style.cursor = "grabbing"
  e.preventDefault()
  e.stopPropagation()
}, true)

document.addEventListener("pointermove", e => {
  const drag = window.__sandboxTokenDrag
  if (!drag) return
  const map = document.getElementById("map")
  if (!map) return
  const rect = map.getBoundingClientRect()
  const token = drag.token
  const x = Math.max(0, Math.min(rect.width - token.offsetWidth, e.clientX - rect.left - drag.offsetX))
  const y = Math.max(0, Math.min(rect.height - token.offsetHeight, e.clientY - rect.top - drag.offsetY))
  token.style.left = x + "px"
  token.style.top = y + "px"
})

document.addEventListener("pointerup", () => {
  const drag = window.__sandboxTokenDrag
  if (!drag) return
  const token = drag.token
  token.style.transition = ""
  token.style.cursor = ""
  if (token && token.id && !/^sandbox_extra_/.test(token.id)) {
    const finalX = parseInt(token.style.left, 10) || 0
    const finalY = parseInt(token.style.top, 10) || 0
    db.ref("tokens/" + token.id).update({ x: finalX, y: finalY })
  }
  window.__sandboxTokenDrag = null
})

document.addEventListener("mousemove", e => {
  if (!selected) return
  const sandboxStudio = document.body.classList.contains("sandbox-studio-mode")
  if (_state.tokenDragStart && !_state.tokenDragging) {
    if (Math.abs(e.clientX - _state.tokenDragStart.x) < 5 && Math.abs(e.clientY - _state.tokenDragStart.y) < 5) return
    _state.tokenDragging = true
  }
  if (!isGM && (!myToken || selected.id !== myToken.id)) return
  const map  = document.getElementById("map"); const rect = map.getBoundingClientRect()
  const offsetX = (isGM && _state.tokenDragOffset) ? _state.tokenDragOffset.x : 0
  const offsetY = (isGM && _state.tokenDragOffset) ? _state.tokenDragOffset.y : 0
  const rawX = e.clientX - rect.left - offsetX
  const rawY = e.clientY - rect.top - offsetY
  const gx   = sandboxStudio && isGM
    ? Math.max(0, Math.min(rect.width - selected.offsetWidth, rawX))
    : Math.floor((rawX + grid / 2) / grid) * grid
  const gy   = sandboxStudio && isGM
    ? Math.max(0, Math.min(rect.height - selected.offsetHeight, rawY))
    : Math.floor((rawY + grid / 2) / grid) * grid
  if (gx < lastX) selected.classList.add("faceLeft")
  if (gx > lastX) selected.classList.remove("faceLeft")
  lastX = gx; selected.style.left = gx + "px"; selected.style.top = gy + "px"
  if (sandboxStudio && isGM) selected.dataset.mjPlaced = "true"
  const now = Date.now()
  if (now - lastSend > sendDelay && (gx !== lastSentX || gy !== lastSentY)) {
    if (!selected._fbSlot) db.ref("tokens/" + selected.id).update({ x: gx, y: gy })
    lastSentX = gx; lastSentY = gy; lastSend = now
  }
})

document.addEventListener("mouseup", () => {
  if (selected) {
    selected.style.transition = ""
    if (isGM && !selected._fbSlot) {
      const finalX = parseInt(selected.style.left, 10) || 0
      const finalY = parseInt(selected.style.top, 10) || 0
      db.ref("tokens/" + selected.id).update({ x: finalX, y: finalY })
    }
  }
  _state.tokenDragging = false; _state.tokenDragStart = null; _state.tokenDragOffset = null; selected = null
})

/* ========================= */
/* CAMÃ‰RA DRAG & ZOOM        */
/* ========================= */

document.addEventListener("mousedown", e => {
  if (!isGM) return
  if (e.target.closest("button") || e.target.closest("input") ||
      e.target.closest("#playerSelect") || e.target.closest("#gmBar") ||
      e.target.closest(".gmSection") || e.target.closest("#diceBar") ||
      e.target.closest("#characterSheet") || e.target.closest("#shopOverlay") ||
      e.target.closest("#spellMiniGame") || e.target.closest("#runeChallengeOverlay") ||
      e.target.closest("#mobSelectionMenu") || e.target.closest("#wantedEditor")) return
  if (e.button === 0 && !e.target.closest(".token")) {
    cameraDragging = true; cameraStartX = e.clientX - cameraX; cameraStartY = e.clientY - cameraY
    document.body.style.cursor = "grabbing"
  }
})

document.addEventListener("mousemove", e => {
  if (!cameraDragging) return
  cameraX = e.clientX - cameraStartX; cameraY = e.clientY - cameraStartY
  clampCamera(); updateCamera()
})

document.addEventListener("mouseup", () => { cameraDragging = false; document.body.style.cursor = "default" })

document.addEventListener("wheel", e => {
  if (!isGM) return
  let target = e.target
  while (target && target !== document.body) {
    const style = window.getComputedStyle(target)
    if ((style.overflowY === "auto" || style.overflowY === "scroll") && target.scrollHeight > target.clientHeight) return
    if (target.id === "gmBar" || target.classList.contains("gmSection") || target.classList.contains("mapCategory") ||
        target.classList.contains("pnjTabContent") || target.id === "diceLog" || target.id === "mjLog") return
    target = target.parentElement
  }
  e.preventDefault()
  cameraZoom = Math.max(minZoom, Math.min(2, cameraZoom + (e.deltaY < 0 ? 0.1 : -0.1)))
  updateCamera()
  syncCameraZoomToPlayers()
}, { passive: false })

document.addEventListener("contextmenu", e => { if (isGM) e.preventDefault() })

/* ========================= */
/* TOUCHES CLAVIER           */
/* ========================= */

document.addEventListener("keydown", e => {
  const key    = e.key.toLowerCase()
  const active = document.activeElement
  const simpleSheetOverlay = document.getElementById("simpleSheetTestOverlay")
  const simpleSheetActive = !!(simpleSheetOverlay && (
    simpleSheetOverlay.contains(active) ||
    (e.target && simpleSheetOverlay.contains(e.target))
  ))
  if (simpleSheetActive) {
    if (key === "escape") return
    return
  }
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
    if (key !== "j" && key !== "b" && key !== "escape") return
    active.blur(); document.body.focus()
  }

  if (key === "escape") {
    const pnjManagerOverlay = document.getElementById("sandboxPnjManagerOverlay")
    if (pnjManagerOverlay && pnjManagerOverlay.style.display !== "none") {
      if (typeof closeSandboxPnjManagerV2 === "function") closeSandboxPnjManagerV2()
      else pnjManagerOverlay.style.display = "none"
      return
    }
    const mapManagerOverlay = document.getElementById("sandboxMapManagerOverlay")
    if (mapManagerOverlay && mapManagerOverlay.style.display !== "none") {
      if (typeof closeSandboxMapManagerV2 === "function") closeSandboxMapManagerV2()
      else mapManagerOverlay.style.display = "none"
      return
    }
    try {
      if (closeVisibleSandboxPnjLocal()) {
        return
      }
    } catch (_) {}
    if (document.body.classList.contains("sandbox-preview-mode")) {
      toggleSandboxPreviewMode(false)
      return
    }
    const onboardingOverlay = document.getElementById("mjSandboxOnboardingOverlay")
    if (onboardingOverlay) {
      if (typeof closeMJSandboxOnboarding === "function") closeMJSandboxOnboarding()
      else onboardingOverlay.remove()
      return
    }
    const inlinePicker = document.getElementById("gmCharacterPickerInline")
    if (inlinePicker) { inlinePicker.remove(); return }
    const legacyPicker = document.getElementById("gmCharacterPickerOverlay")
    if (legacyPicker) { legacyPicker.remove(); return }
    const nativeStudioDialog = document.getElementById("nativeStudioDialog")
    if (nativeStudioDialog && nativeStudioDialog.open) { nativeStudioDialog.close(); return }
    const nativeStudioDraftDialog = document.getElementById("nativeStudioDraftDialog")
    if (nativeStudioDraftDialog && nativeStudioDraftDialog.open) {
      nativeStudioDraftDialog.close()
      try { window.__nativeStudioDraft = null } catch (_) {}
      return
    }
    const savePanel = document.getElementById("savePanel"); if (savePanel) { savePanel.remove(); return }
    const wantedEditor = document.getElementById("wantedEditor"); if (wantedEditor && wantedEditor.style.display !== "none") { wantedEditor.style.display = "none"; return }
    const mobSelectionMenu = document.getElementById("mobSelectionMenu"); if (mobSelectionMenu && mobSelectionMenu.style.display !== "none") { mobSelectionMenu.style.display = "none"; return }
    const wantedBoard = document.getElementById("wantedBoardOverlay")
    const wantedOverlay = document.getElementById("wantedOverlay")
    if (wantedBoard && wantedOverlay) { if (typeof closeWantedBoard === "function") closeWantedBoard(); else wantedBoard.remove(); return }
    if (wantedBoard) { if (typeof closeWantedBoard === "function") closeWantedBoard(); else wantedBoard.remove(); return }
    let anyGMOpen = false
    document.querySelectorAll(".gmSection").forEach(sec => { if (sec.style.display !== "none" && sec.style.display !== "") anyGMOpen = true })
    if (anyGMOpen) { document.querySelectorAll(".gmSection").forEach(sec => { sec.style.display = "none" }); return }
    const playerMenu = document.getElementById("playerMenu"); if (playerMenu && playerMenu.classList.contains("open")) { playerMenu.classList.remove("open"); return }
    const freePointsPanel = document.getElementById("freePointsPanel"); if (freePointsPanel) { freePointsPanel.remove(); return }
    const allyPNJPanel = document.getElementById("allyPNJPanel"); if (allyPNJPanel) { allyPNJPanel.remove(); return }
    const allyViewerPanel = document.getElementById("allyViewerPanel"); if (allyViewerPanel) { allyViewerPanel.remove(); return }
    const powersPanel = document.getElementById("playerThuumPanel"); if (powersPanel && powersPanel.style.display === "block") { closePlayerPowersPanel(); return }
    const docOverlay = document.getElementById("documentOverlay"); if (docOverlay && isGM) { hideDocument(); return }
    const loreOverlay = document.getElementById("mapLoreBookOverlay"); if (loreOverlay) { closeMapLoreBookOverlay(); return }
    const runeOverlay = document.getElementById("runeChallengeOverlay"); if (runeOverlay) { if (typeof closeRuneChallenge === "function") closeRuneChallenge(); else { runeOverlay.remove(); _state.runeJustOpened = false } return }
    const sheet = document.getElementById("characterSheet"); if (sheet && sheet.style.display !== "none" && sheet.style.display !== "") { closeCharacterSheet(); return }
    const shopOverlay = document.getElementById("shopOverlay"); if (shopOverlay && isGM) { closeShop(); return }
    if (wantedOverlay) { wantedOverlay.remove(); return }
    const combatHUD = document.getElementById("combatHUD"); if (combatHUD && combatHUD.style.display === "flex") { combatHUD.style.display = "none"; return }
    if (isGM && pnjSlotOrder && pnjSlotOrder.length) {
      if (typeof hideHighPNJScrollImmediate === "function") hideHighPNJScrollImmediate()
      db.ref("game/highPNJName").remove()
      closeLastPNJ()
      return
    }
    return
  }

  if (isGM) {
    if (key === "m") { toggleGMSection("mapMenu"); return }
    if (key === "r") { toggleGMSection("pnjMenu"); return }
    if (key === "p") { toggleGMSection("gmCharacters"); return }
    if (key === "x") { toggleGMSection("xpMenu"); return }
    if (key === "e") { toggleGMSection("elementsMenu"); return }
    if (key === "t") { toggleGMSection("mobMenu2"); return }
    if (key === "a" && combatActive) { openAllyPNJPanel(); return }
    if (key === "?") { toggleGMShortcutHelp(); return }
  }

  if (key === "b") {
    showNotification("Raccourci reserve")
    return
  }

  if (key === "j") {
    const sheet = document.getElementById("characterSheet")
    if (sheet && sheet.style.display === "block") { closeCharacterSheet(); return }
    if (isGM) {
      if (selected) openCharacterSheet(selected.id)
      else if (currentSheetPlayer) openCharacterSheet(currentSheetPlayer)
      else showNotification("Selectionne un joueur")
      return
    }
    if (myToken) { openCharacterSheet(); return }
    showNotification("Choisissez un personnage")
  }
})

// Simple, single-source sandbox map manager.
function getSimpleSandboxMaps() {
  try {
    const runtimeMaps = Array.isArray(window.__simpleSandboxMaps) ? window.__simpleSandboxMaps : []
    if (typeof getCustomization !== "function") {
      return runtimeMaps.map((item, index) => ({
        id: String(item && item.id || ("map_" + index)),
        label: String(item && item.label || "Sans titre"),
        map: String(item && item.map || ""),
        category: String(item && item.category || "Custom"),
        section: String(item && item.section || "lieux"),
        audio: String(item && item.audio || "")
      }))
    }
    const data = getCustomization()
    const content = data && data.content ? data.content : {}
    const savedMaps = Array.isArray(content.maps) ? content.maps : []
    const sourceMaps = savedMaps.length ? savedMaps : runtimeMaps
    window.__simpleSandboxMaps = sourceMaps.map((item, index) => ({
      id: String(item && item.id || ("map_" + index)),
      label: String(item && item.label || "Sans titre"),
      map: String(item && item.map || ""),
      category: String(item && item.category || "Custom"),
      section: String(item && item.section || "lieux"),
      audio: String(item && item.audio || "")
    }))
    return window.__simpleSandboxMaps
  } catch (_) {}
  return []
}

function saveSimpleSandboxMaps(maps) {
  try {
    window.__simpleSandboxMaps = (Array.isArray(maps) ? maps : []).map((item, index) => ({
      id: String(item && item.id || ("map_" + index)),
      label: String(item && item.label || "Sans titre"),
      map: String(item && item.map || ""),
      category: String(item && item.category || "Custom"),
      section: String(item && item.section || "lieux"),
      audio: String(item && item.audio || "")
    }))
    if (typeof getCustomization !== "function" || typeof saveCustomization !== "function") return false
    const next = getCustomization()
    next.content = next.content || { maps: [], pnjs: [], highPnjs: [], mobs: [], documents: [] }
    next.content.maps = window.__simpleSandboxMaps.map((item, index) => ({
      id: String(item && item.id || ("map_" + index)),
      label: String(item && item.label || "Sans titre"),
      map: String(item && item.map || ""),
      category: String(item && item.category || "Custom"),
      section: String(item && item.section || "lieux"),
      audio: String(item && item.audio || "")
    }))
    saveCustomization(next)
    window.__sandboxMapPanelState = null
    if (typeof applyCustomizationToUI === "function") applyCustomizationToUI()
    return true
  } catch (_) {}
  return Array.isArray(window.__simpleSandboxMaps)
}

function ensureTutorialStartMapInSimpleMaps() {
  try {
    const data = typeof getCustomization === "function" ? getCustomization() : {}
    const project = data && data.project ? data.project : {}
    const asset = String(project.startMapAsset || window.__onboardingStartMapAsset || "").trim()
    if (!asset) return false
    const mapId = String(project.startMapId || window.__onboardingStartMapId || "tutorial_start_map").trim() || "tutorial_start_map"
    const label = String(project.startMapLabel || window.__onboardingStartMapLabel || "").trim() || "Map de depart"
    const runtimeMaps = Array.isArray(window.__simpleSandboxMaps) ? window.__simpleSandboxMaps.map(item => ({ ...item })) : []
    const savedMaps = data && data.content && Array.isArray(data.content.maps) ? data.content.maps.map(item => ({ ...item })) : []
    const maps = savedMaps.length ? savedMaps : runtimeMaps
    const exists = maps.some(item => String(item && item.id || "") === mapId)
    if (!exists) {
      maps.unshift({
        id: mapId,
        label: label,
        category: "Tutoriel MJ",
        map: asset,
        section: "villes",
        audio: ""
      })
      window.__simpleSandboxMaps = maps.map((item, index) => ({
        id: String(item && item.id || ("map_" + index)),
        label: String(item && item.label || "Sans titre"),
        map: String(item && item.map || ""),
        category: String(item && item.category || "Custom"),
        section: String(item && item.section || "lieux"),
        audio: String(item && item.audio || "")
      }))
      if (typeof getCustomization === "function" && typeof saveCustomization === "function") {
        const next = getCustomization()
        next.content = next.content || {}
        next.content.maps = window.__simpleSandboxMaps.map(item => ({ ...item }))
        saveCustomization(next)
      }
      return true
    }
    window.__simpleSandboxMaps = maps.map((item, index) => ({
      id: String(item && item.id || ("map_" + index)),
      label: String(item && item.label || "Sans titre"),
      map: String(item && item.map || ""),
      category: String(item && item.category || "Custom"),
      section: String(item && item.section || "lieux"),
      audio: String(item && item.audio || "")
    }))
    return true
  } catch (_) {}
  return false
}

function simpleRenderSandboxMap(label, asset) {
  const safeAsset = String(asset || "").trim()
  if (!safeAsset) return false
  try {
    const map = document.getElementById("map")
    const layer = document.getElementById("sandboxStartMapLayer")
    const fade = document.getElementById("fadeScreen")
    try {
      currentMap = safeAsset
      window.__latestMapValue = safeAsset
    } catch (_) {}

    if (fade) {
      fade.style.transition = "opacity 0.75s ease"
      fade.style.opacity = "1"
      fade.style.pointerEvents = "none"
    }

    setTimeout(function() {
      try {
        if (layer) {
          layer.src = safeAsset
          layer.style.display = "block"
        }
        if (map) {
          map.style.backgroundImage = "url('" + safeAsset.replace(/'/g, "\\'") + "')"
          map.style.backgroundSize = "cover"
          map.style.backgroundPosition = "center center"
          map.style.backgroundRepeat = "no-repeat"
        }
        if (typeof updateCamera === "function") updateCamera()
      } catch (_) {}
    }, fade ? 700 : 0)

    setTimeout(function() {
      try {
        if (fade) {
          fade.style.transition = "opacity 0.95s ease"
          fade.style.opacity = "0"
          fade.style.pointerEvents = "none"
        }
      } catch (_) {}
    }, fade ? 1080 : 0)

    if (label) {
      setTimeout(function() {
        try { showSandboxMapTitle(String(label)) } catch (_) {}
      }, fade ? 1750 : 80)
    }
    return true
  } catch (_) {}
  return false
}

function showSandboxMapTitle(label) {
  const safeLabel = String(label || "").trim()
  if (!safeLabel) return false
  try {
    if (typeof showLocation === "function") {
      showLocation(safeLabel)
      return true
    }
  } catch (_) {}
  try {
    const banner = document.getElementById("locationBanner")
    const paper = document.getElementById("locationPaper")
    const text = document.getElementById("locationText")
    if (!banner || !paper || !text) return false
    banner.style.display = "flex"
    banner.classList.add("visible")
    banner.style.opacity = "1"
    banner.style.zIndex = "1000001"
    paper.classList.add("open")
    text.classList.add("show")
    text.textContent = safeLabel
    setTimeout(function() {
      banner.style.opacity = "0"
      setTimeout(function() {
        banner.style.display = "none"
        banner.classList.remove("visible")
        paper.classList.remove("open")
        text.classList.remove("show")
      }, 900)
    }, 3200)
    return true
  } catch (_) {}
  return false
}

function launchSandboxMap(index) {
  const maps = getSimpleSandboxMaps()
  const item = maps[index]
  if (!item) return false
  if (/^(data:|blob:|https?:|\/)/i.test(String(item.map || "").trim())) {
    simpleRenderSandboxMap(item.label, item.map)
    return false
  }
  if (typeof changeMap === "function") {
    changeMap(String(item.map || "background.jpg"), String(item.audio || ""))
    if (item.label && typeof showLocation === "function") {
      setTimeout(function() {
        try { showLocation(String(item.label)) } catch (_) {}
      }, 2000)
    }
  }
  return false
}

function launchSandboxMapFromManager(index) {
  launchSandboxMap(index)
  closeSandboxMapManagerV2()
  return false
}

function renameSandboxMap(index) {
  const maps = getSimpleSandboxMaps()
  const item = maps[index]
  if (!item) return false
  const nextLabel = prompt("Nom de la map :", item.label || "")
  if (nextLabel == null) return false
  const trimmedLabel = String(nextLabel).trim()
  if (!trimmedLabel) {
    if (typeof showNotification === "function") showNotification("Nom obligatoire")
    return false
  }
  maps[index].label = trimmedLabel
  saveSimpleSandboxMaps(maps)
  closeSandboxMapManagerV2()
  return false
}

function deleteSandboxMap(index) {
  const maps = getSimpleSandboxMaps()
  if (index < 0 || index >= maps.length) return false
  const item = maps[index]
  const confirmed = typeof confirm === "function"
    ? confirm(`Supprimer la map "${String(item && item.label || "Sans titre")}" ?`)
    : true
  if (!confirmed) return false
  maps.splice(index, 1)
  saveSimpleSandboxMaps(maps)
  closeSandboxMapManagerV2()
  return false
}

function startSandboxMapDrag(index) {
  window.__simpleSandboxMapDragIndex = Number(index)
}

function dropSandboxMap(targetIndex) {
  const sourceIndex = Number(window.__simpleSandboxMapDragIndex)
  const destIndex = Number(targetIndex)
  window.__simpleSandboxMapDragIndex = null
  if (!Number.isFinite(sourceIndex) || !Number.isFinite(destIndex) || sourceIndex === destIndex) return false
  const maps = getSimpleSandboxMaps()
  if (sourceIndex < 0 || destIndex < 0 || sourceIndex >= maps.length || destIndex >= maps.length) return false
  const moved = maps.splice(sourceIndex, 1)[0]
  maps.splice(destIndex, 0, moved)
  saveSimpleSandboxMaps(maps)
  renderSandboxMapManagerOverlayV2()
  return false
}

function endSandboxMapDrag() {
  window.__simpleSandboxMapDragIndex = null
}

function closeSandboxMapManager() {
  const overlay = document.getElementById("sandboxMapManagerOverlay")
  if (overlay) overlay.style.display = "none"
  return false
}

function createSimpleSandboxMapCard(item, index) {
  const previewMode = !!(document.body && document.body.classList.contains("sandbox-preview-mode"))
  const card = document.createElement("div")
  card.className = "sandboxMapManagerCard"
  card.style.cssText = "display:grid;gap:8px;padding:12px;background:rgba(0,0,0,0.18);border:1px solid rgba(214,180,106,0.18);border-radius:12px;"

  const topRow = document.createElement("div")
  topRow.className = "sandboxMapManagerCardTopRow"
  topRow.style.cssText = "display:flex;gap:8px;align-items:center;"

  const launchBtn = document.createElement("button")
  launchBtn.type = "button"
  launchBtn.className = "sandboxMapManagerLaunchButton"
  launchBtn.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;background:linear-gradient(180deg, rgba(36,68,92,0.96), rgba(12,34,50,0.98));border:1px solid rgba(240,202,112,0.36);border-radius:8px;color:#f5e6c8;font-family:Cinzel,serif;cursor:pointer;flex:1;text-align:left;"
  launchBtn.innerHTML = previewMode
    ? `<span>${String(item.label || "Sans titre")}</span>`
    : `<span>${String(item.label || "Sans titre")}</span><span style="font-size:11px;color:#bfae8b;">Lancer</span>`
  launchBtn.addEventListener("click", function(event) {
    event.preventDefault()
    event.stopPropagation()
    launchSandboxMapFromManager(index)
  })

  const dragHandle = document.createElement("span")
  dragHandle.className = "sandboxMapManagerDragHandle"
  dragHandle.setAttribute("draggable", "true")
  dragHandle.title = "Glisser pour reordonner"
  dragHandle.style.cssText = "width:32px;min-width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid rgba(214,180,106,0.24);background:rgba(255,255,255,0.05);color:#f0d087;font-size:16px;cursor:grab;"
  dragHandle.textContent = "::"
  dragHandle.addEventListener("dragstart", function(event) {
    event.stopPropagation()
    startSandboxMapDrag(index)
  })

  const actionsRow = document.createElement("div")
  actionsRow.className = "sandboxMapManagerActionsRow"
  actionsRow.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;"

  const renameBtn = document.createElement("button")
  renameBtn.type = "button"
  renameBtn.className = "sandboxMapManagerActionButton"
  renameBtn.style.cssText = "padding:8px 10px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;"
  renameBtn.textContent = "Renommer"
  renameBtn.addEventListener("click", function(event) {
    event.preventDefault()
    event.stopPropagation()
    renameSandboxMap(index)
  })

  const deleteBtn = document.createElement("button")
  deleteBtn.type = "button"
  deleteBtn.className = "sandboxMapManagerDeleteButton"
  deleteBtn.style.cssText = "padding:8px 10px;background:rgba(90,22,22,0.55);color:#ffd7d7;border:1px solid rgba(214,110,110,0.28);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;"
  deleteBtn.textContent = "Supprimer"
  deleteBtn.addEventListener("click", function(event) {
    event.preventDefault()
    event.stopPropagation()
    deleteSandboxMap(index)
  })

  if (!previewMode) {
    card.addEventListener("dragover", function(event) {
      event.preventDefault()
    })
    card.addEventListener("drop", function(event) {
      event.preventDefault()
      dropSandboxMap(index)
    })
    card.addEventListener("dragend", function() {
      endSandboxMapDrag()
    })
  }

  topRow.appendChild(launchBtn)
  if (!previewMode) topRow.appendChild(dragHandle)
  if (!previewMode) actionsRow.appendChild(renameBtn)
  if (!previewMode) actionsRow.appendChild(deleteBtn)
  card.appendChild(topRow)
  if (!previewMode) card.appendChild(actionsRow)
  return card
}

function renderSandboxMapManagerOverlay() {
  const overlay = document.getElementById("sandboxMapManagerOverlay")
  if (!overlay) return
  const panel = overlay.querySelector(".sandboxMapManagerPanel")
  const title = overlay.querySelector(".sandboxMapManagerTitle")
  const subtitle = overlay.querySelector(".sandboxMapManagerSubtitle")
  const content = overlay.querySelector("[data-map-manager-content]")
  const debug = overlay.querySelector("[data-map-manager-debug]")
  const theme = String(overlay.getAttribute("data-map-theme") || "medieval_fantasy").trim() || "medieval_fantasy"
  const previewMode = !!(document.body && document.body.classList.contains("sandbox-preview-mode"))
  if (panel) panel.setAttribute("data-map-theme", theme)
  if (panel) panel.classList.toggle("sandboxMapManagerPanel--preview", previewMode)
  if (title) title.textContent = "Maps et lieux"
  if (subtitle) subtitle.style.display = previewMode ? "none" : ""
  if (!content) return
  const maps = getSimpleSandboxMaps()
  if (debug) debug.textContent = "Maps : " + maps.length
  content.innerHTML = ""
  if (!maps.length) {
    content.innerHTML = `<div class="sandboxMapManagerEmptyState" style="font-size:12px;color:#bfae8b;padding:10px;background:rgba(0,0,0,0.18);border:1px dashed rgba(214,180,106,0.18);border-radius:10px;">Aucune map pour le moment.</div>`
    return
  }
  maps.forEach(function(item, index) {
    content.appendChild(createSimpleSandboxMapCard(item, index))
  })
}

function closeSandboxMapCreateComposerV2() {
  const overlay = document.getElementById("sandboxMapManagerOverlay")
  if (!overlay) return false
  const composer = overlay.querySelector("[data-map-manager-composer]")
  const nameInput = overlay.querySelector("[data-map-manager-name]")
  const fileInput = overlay.querySelector("[data-map-manager-file]")
  if (composer) composer.style.display = "none"
  if (nameInput) nameInput.value = ""
  if (fileInput) fileInput.value = ""
  return false
}

function openSandboxMapCreateComposerV2() {
  if (document.body && document.body.classList.contains("sandbox-preview-mode")) return false
  const overlay = document.getElementById("sandboxMapManagerOverlay")
  if (!overlay) return false
  const composer = overlay.querySelector("[data-map-manager-composer]")
  const nameInput = overlay.querySelector("[data-map-manager-name]")
  const fileInput = overlay.querySelector("[data-map-manager-file]")
  if (composer) composer.style.display = "grid"
  if (fileInput && !fileInput.dataset.autofillBound) {
    fileInput.dataset.autofillBound = "1"
    fileInput.addEventListener("change", function() {
      const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null
      if (!file || !nameInput) return
      if (String(nameInput.value || "").trim()) return
      nameInput.value = String(file.name || "Nouvelle map").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Nouvelle map"
    })
  }
  if (nameInput) {
    setTimeout(function() {
      try { nameInput.focus() } catch (_) {}
    }, 0)
  }
  return false
}

async function submitSandboxMapManagerCreateV2() {
  try {
    const overlay = document.getElementById("sandboxMapManagerOverlay")
    if (!overlay) return false
    const nameInput = overlay.querySelector("[data-map-manager-name]")
    const fileInput = overlay.querySelector("[data-map-manager-file]")
    let trimmedLabel = String(nameInput && nameInput.value || "").trim()
    const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null
    if (!file) {
      if (typeof showNotification === "function") showNotification("Choisis une image")
      return false
    }
    if (!trimmedLabel) {
      trimmedLabel = String(file.name || "Nouvelle map").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Nouvelle map"
      if (nameInput) nameInput.value = trimmedLabel
    }
    let asset = typeof readNativeStudioFileAsDataURL === "function"
      ? String(await readNativeStudioFileAsDataURL(file) || "").trim()
      : ""
    if (!asset && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      asset = String(URL.createObjectURL(file) || "").trim()
    }
    if (!asset) {
      if (typeof showNotification === "function") showNotification("Image invalide")
      return false
    }
    const maps = getSimpleSandboxMaps()
    maps.push({
      id: "map_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
      label: trimmedLabel,
      map: asset,
      category: "Custom",
      section: "lieux",
      audio: ""
    })
    saveSimpleSandboxMaps(maps)
    closeSandboxMapManagerV2()
    if (typeof showNotification === "function") showNotification("Map ajoutee")
  } catch (_) {}
  return false
}

async function createSandboxMapFromPanel() {
  try {
    window.__sandboxMapFilePicking = true
    const chooser = document.createElement("input")
    chooser.type = "file"
    chooser.accept = "image/*"
    chooser.style.display = "none"
    chooser.addEventListener("change", async function() {
      const file = chooser.files && chooser.files[0] ? chooser.files[0] : null
      if (!file) {
        window.__sandboxMapFilePicking = false
        if (chooser.parentNode) chooser.parentNode.removeChild(chooser)
        return
      }
      const defaultLabel = String(file.name || "Nouvelle map").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Nouvelle map"
      const chosenLabel = prompt("Nom de la map :", defaultLabel)
      if (chosenLabel == null) {
        window.__sandboxMapFilePicking = false
        if (chooser.parentNode) chooser.parentNode.removeChild(chooser)
        return
      }
      const trimmedLabel = String(chosenLabel).trim()
      if (!trimmedLabel) {
        if (typeof showNotification === "function") showNotification("Nom obligatoire")
        window.__sandboxMapFilePicking = false
        if (chooser.parentNode) chooser.parentNode.removeChild(chooser)
        return
      }
      const asset = typeof readNativeStudioFileAsDataURL === "function"
        ? String(await readNativeStudioFileAsDataURL(file) || "").trim()
        : ""
      if (!asset) {
        if (typeof showNotification === "function") showNotification("Image invalide")
        window.__sandboxMapFilePicking = false
        if (chooser.parentNode) chooser.parentNode.removeChild(chooser)
        return
      }
      const maps = getSimpleSandboxMaps()
      maps.push({
        id: "map_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
        label: trimmedLabel,
        map: asset,
        category: "Custom",
        section: "lieux",
        audio: ""
      })
      saveSimpleSandboxMaps(maps)
      renderSandboxMapManagerOverlayV2()
      if (typeof showNotification === "function") showNotification("Map ajoutee")
      window.__sandboxMapFilePicking = false
      if (chooser.parentNode) chooser.parentNode.removeChild(chooser)
    }, { once: true })
    document.body.appendChild(chooser)
    chooser.click()
  } catch (_) {}
  window.__sandboxMapFilePicking = false
  return false
}

function openSandboxMapManagerV2() {
  try {
    try { ensureTutorialStartMapInSimpleMaps() } catch (_) {}
    var currentTheme = "medieval_fantasy"
    try {
      currentTheme = String(
        window.__currentProjectTheme
        || document.body.getAttribute("data-project-theme")
        || "medieval_fantasy"
      ).trim() || "medieval_fantasy"
    } catch (_) {}
    document.querySelectorAll(".gmSection").forEach(function(sec) {
      sec.style.display = "none"
    })
    let overlay = document.getElementById("sandboxMapManagerOverlay")
    if (!overlay) {
      overlay = document.createElement("div")
      overlay.id = "sandboxMapManagerOverlay"
      overlay.className = "sandboxMapManagerOverlay"
      overlay.style.cssText = "position:fixed;inset:0;z-index:10060;background:rgba(8,10,18,0.46);display:flex;align-items:center;justify-content:center;padding:24px;"
      overlay.innerHTML =
        `<div class="sandboxMapManagerPanel" style="width:min(960px, 92vw);max-height:88vh;overflow:auto;display:grid;gap:14px;padding:22px;border-radius:22px;background:linear-gradient(180deg, rgba(38,52,88,0.96), rgba(16,22,36,0.98));border:1px solid rgba(214,180,106,0.28);box-shadow:0 24px 80px rgba(0,0,0,0.42);font-family:Cinzel,serif;">` +
          `<div class="sandboxMapManagerHeader" style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">` +
            `<div class="sandboxMapManagerHeaderText" style="display:grid;gap:6px;">` +
              `<div class="sandboxMapManagerTitle" style="font-size:14px;letter-spacing:2px;color:#e6c27a;">Maps et lieux</div>` +
              `<div class="sandboxMapManagerSubtitle" style="font-size:12px;line-height:1.6;color:rgba(255,240,210,0.82);">Ajoute tes maps, donne-leur un nom, puis clique dessus pour les afficher.</div>` +
            `</div>` +
            `<button type="button" class="sandboxMapManagerActionButton sandboxMapManagerCloseButton" data-map-manager-action="close" style="padding:8px 12px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:10px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Fermer</button>` +
          `</div>` +
          `<div class="sandboxMapManagerToolbar" style="display:flex;flex-wrap:wrap;gap:8px;">` +
            `<button type="button" class="sandboxMapManagerActionButton sandboxMapManagerPrimaryButton" data-map-manager-action="new-map" style="padding:9px 10px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Nouvelle map</button>` +
          `</div>` +
          `<div class="sandboxMapManagerComposer" data-map-manager-composer style="display:none;grid-template-columns:1fr;gap:10px;padding:12px;border-radius:14px;background:rgba(0,0,0,0.16);border:1px solid rgba(214,180,106,0.18);">` +
            `<input type="text" class="sandboxMapManagerInput" data-map-manager-name placeholder="Nom de la map" style="padding:10px 12px;border-radius:10px;border:1px solid rgba(214,180,106,0.2);background:rgba(10,18,30,0.55);color:#f5e6c8;font-family:Cinzel,serif;">` +
            `<input type="file" class="sandboxMapManagerFileInput" data-map-manager-file accept="image/*" style="color:#f5e6c8;font-family:Cinzel,serif;">` +
            `<div class="sandboxMapManagerComposerActions" style="display:flex;gap:8px;flex-wrap:wrap;">` +
              `<button type="button" class="sandboxMapManagerActionButton sandboxMapManagerPrimaryButton" data-map-manager-action="confirm-create" style="padding:9px 10px;background:linear-gradient(#7a5533,#4b321c);color:#f5e6c8;border:1px solid #caa46b;border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Ajouter</button>` +
              `<button type="button" class="sandboxMapManagerActionButton" data-map-manager-action="cancel-create" style="padding:9px 10px;background:rgba(255,255,255,0.05);color:#f5e6c8;border:1px solid rgba(214,180,106,0.24);border-radius:8px;cursor:pointer;font-family:Cinzel,serif;font-size:12px;">Annuler</button>` +
            `</div>` +
          `</div>` +
          `<div class="sandboxMapManagerDebug" data-map-manager-debug style="font-size:11px;color:#bfae8b;"></div>` +
          `<div class="sandboxMapManagerContent" data-map-manager-content style="display:grid;gap:10px;"></div>` +
        `</div>`
      document.body.appendChild(overlay)
      overlay.addEventListener("click", function(event) {
        const actionButton = event.target.closest("[data-map-manager-action]")
        if (actionButton) {
          event.preventDefault()
          event.stopPropagation()
          const action = String(actionButton.getAttribute("data-map-manager-action") || "")
          if (action === "close") closeSandboxMapManagerV2()
          if (action === "new-map") openSandboxMapCreateComposerV2()
          if (action === "cancel-create") closeSandboxMapCreateComposerV2()
          if (action === "confirm-create") submitSandboxMapManagerCreateV2()
          return
        }
        if (event.target === overlay) closeSandboxMapManagerV2()
      })
    }
    overlay.setAttribute("data-map-theme", currentTheme)
    const panel = overlay.querySelector(".sandboxMapManagerPanel")
    if (panel) panel.setAttribute("data-map-theme", currentTheme)
    overlay.classList.toggle("sandboxMapManagerOverlay--preview", !!(document.body && document.body.classList.contains("sandbox-preview-mode")))
    overlay.style.display = "flex"
    renderSandboxMapManagerOverlayV2()
  } catch (_) {}
  return false
}

try {
  openSandboxMapManager = openSandboxMapManagerV2
  closeSandboxMapManager = closeSandboxMapManagerV2
  renderSandboxMapManagerOverlay = renderSandboxMapManagerOverlayV2
  window.openSandboxMapManagerV2 = openSandboxMapManagerV2
  window.closeSandboxMapManagerV2 = closeSandboxMapManagerV2
  window.submitSandboxMapManagerCreateV2 = submitSandboxMapManagerCreateV2
  window.openSandboxMapManager = openSandboxMapManagerV2
  window.closeSandboxMapManager = closeSandboxMapManagerV2
  window.renderSandboxMapManagerOverlay = renderSandboxMapManagerOverlayV2
  window.launchSandboxMap = launchSandboxMap
  window.renameSandboxMap = renameSandboxMap
  window.deleteSandboxMap = deleteSandboxMap
  window.startSandboxMapDrag = startSandboxMapDrag
  window.dropSandboxMap = dropSandboxMap
  window.endSandboxMapDrag = endSandboxMapDrag
  window.openSandboxPnjManagerV2 = openSandboxPnjManagerV2
  window.closeSandboxPnjManagerV2 = closeSandboxPnjManagerV2
  window.openSandboxPnjCreateComposerV2 = openSandboxPnjCreateComposerV2
  window.submitSandboxPnjManagerCreateV2 = submitSandboxPnjManagerCreateV2
  window.launchSandboxPnj = launchSandboxPnj
  window.renameSandboxPnj = renameSandboxPnj
  window.deleteSandboxPnj = deleteSandboxPnj
  window.startSandboxPnjDrag = startSandboxPnjDrag
  window.dropSandboxPnj = dropSandboxPnj
  window.endSandboxPnjDrag = endSandboxPnjDrag
} catch (_) {}



