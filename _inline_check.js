
const THEME_MAP = {
  "1": "medieval_fantasy",
  "2": "science_fiction",
  "3": "pirate",
  "4": "contemporain",
  "medieval fantasy": "medieval_fantasy",
  "medieval_fantasy": "medieval_fantasy",
  "science-fiction": "science_fiction",
  "science fiction": "science_fiction",
  "science_fiction": "science_fiction",
  "sf": "science_fiction",
  "pirate": "pirate",
  "contemporaine": "contemporain",
  "contemporain": "contemporain"
}

function applyCustomizationToUI() {
  if (typeof getCustomization !== "function") return
  const customization = getCustomization()
  const title = (customization.project && customization.project.title) || "Roleplay It Yourself"
  const gameTitle = document.getElementById("gameTitle")
  if (gameTitle) gameTitle.textContent = title
  document.title = title

  const playerIds = ["greg", "ju", "elo", "bibi"]
  playerIds.forEach(function(playerId) {
    const player = customization.players && customization.players[playerId] ? customization.players[playerId] : null
    const label = player && player.name ? String(player.name).trim() : ""
    const safeName = label || ({
      greg: "Joueur 1",
      ju: "Joueur 2",
      elo: "Joueur 3",
      bibi: "Joueur 4"
    })[playerId]

    const choice = document.querySelector('[data-player-choice="' + playerId + '"]')
    if (choice) choice.textContent = safeName

    const token = document.getElementById(playerId)
    const tag = token ? token.querySelector(".nameTag") : null
    if (tag) tag.textContent = safeName
  })
}

function openCustomizationPanel() {
  if (typeof getCustomization !== "function" || typeof saveCustomization !== "function") {
    if (typeof showNotification === "function") showNotification("Editeur indisponible pour le moment.")
    return
  }

  const current = getCustomization()
  const currentTitle = current.project && current.project.title ? current.project.title : "Roleplay It Yourself"
  const currentTheme = current.project && current.project.theme ? current.project.theme : "medieval_fantasy"
  const nextTitle = window.prompt("Nom du projet :", currentTitle)
  if (nextTitle == null) return

  const themeMessage = [
    "Ambiance du projet :",
    "1. Medieval fantasy",
    "2. Science-fiction",
    "3. Pirate",
    "4. Contemporaine"
  ].join("\n")
  const currentThemeChoice = ({
    medieval_fantasy: "1",
    science_fiction: "2",
    pirate: "3",
    contemporain: "4"
  })[currentTheme] || "1"
  const nextThemeInput = window.prompt(themeMessage, currentThemeChoice)
  if (nextThemeInput == null) return

  const next = getCustomization()
  next.project.title = String(nextTitle || "").trim() || currentTitle
  next.project.theme = THEME_MAP[String(nextThemeInput || "").trim().toLowerCase()] || currentTheme
  saveCustomization(next)
  applyCustomizationToUI()
  if (typeof showNotification === "function") showNotification("Projet mis a jour")
}

function closeProjectCreationWizard() {
  const overlay = document.getElementById("projectCreationWizardOverlay")
  if (overlay) overlay.remove()
}

function openProjectCreationWizard() {
  const themeOptions = typeof getProjectThemeOptions === "function"
    ? getProjectThemeOptions()
    : [
        { value: "medieval_fantasy", label: "Medieval fantasy", description: "Royaumes, magie, quetes, monstres et grandes tavernes." },
        { value: "science_fiction", label: "Science-fiction", description: "Technologie, vaisseaux, stations et futur." },
        { value: "pirate", label: "Pirate", description: "Iles, tresors, tempetes et aventures maritimes." },
        { value: "contemporain", label: "Contemporaine", description: "Ville actuelle, enquete, mystere ou survie moderne." }
      ]

  const projectName = window.prompt("Donne un nom a ton projet :", "Mon nouveau projet")
  if (projectName == null) return
  const cleanTitle = String(projectName || "").trim()
  if (!cleanTitle) {
    if (typeof showNotification === "function") showNotification("Donne d'abord un nom au projet")
    return
  }

  const themeMessage = [
    "Dans quelle aventure nous embarques-tu ?",
    "1. Medieval fantasy",
    "2. Science-fiction",
    "3. Pirate",
    "4. Contemporaine"
  ].join("\n")
  const themeChoice = window.prompt(themeMessage, "1")
  if (themeChoice == null) return

  const normalizedChoice = String(themeChoice || "").trim().toLowerCase()
  const selectedTheme = THEME_MAP[normalizedChoice] || "medieval_fantasy"

  const baseCustomization = typeof getDefaultCustomization === "function"
    ? getDefaultCustomization()
    : { project: { title: "Roleplay It Yourself", theme: "medieval_fantasy" } }
  baseCustomization.project.title = cleanTitle
  baseCustomization.project.theme = selectedTheme

  if (typeof saveCustomization === "function") saveCustomization(baseCustomization)
  if (typeof applyCustomizationToUI === "function") applyCustomizationToUI()
  window.__pendingProjectSeed = {
    title: baseCustomization.project.title,
    theme: baseCustomization.project.theme
  }

  if (typeof newGame === "function") newGame()
}

function closeCreatorStudioEntry() {
  const overlay = document.getElementById("creatorStudioEntryOverlay")
  if (overlay) overlay.remove()
}

function openCreatorStudioEntry() {
  closeCreatorStudioEntry()

  const overlay = document.createElement("div")
  overlay.id = "creatorStudioEntryOverlay"
  overlay.style.cssText = "position:fixed;inset:0;z-index:1000000015;background:rgba(0,0,0,0.84);display:flex;align-items:center;justify-content:center;padding:20px;"
  overlay.addEventListener("mousedown", function(event) {
    if (event.target === overlay) closeCreatorStudioEntry()
  })

  const panel = document.createElement("div")
  panel.style.cssText = "width:min(760px,94vw);max-height:90vh;overflow:auto;padding:24px;border-radius:18px;background:linear-gradient(180deg,rgba(18,14,10,0.98),rgba(7,7,7,0.98));border:1px solid rgba(214,180,106,0.42);box-shadow:0 24px 60px rgba(0,0,0,0.78);color:#f3e7cf;font-family:Cinzel,serif;"
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px;">
      <div>
        <div style="font-size:28px;letter-spacing:2px;color:#f0d087;">Studio MJ</div>
        <div style="margin-top:8px;font-size:14px;line-height:1.6;color:#cdbb96;">Centre de creation pour configurer ton projet, ouvrir l'edition et acceder aux outils MJ.</div>
      </div>
      <button type="button" id="creatorStudioEntryClose" style="padding:10px 14px;border-radius:10px;border:1px solid rgba(214,180,106,0.36);background:rgba(255,255,255,0.06);color:#f3e7cf;cursor:pointer;font-family:Cinzel,serif;">Fermer</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
      <button type="button" data-entry-action="customize" style="padding:14px 16px;border-radius:12px;border:1px solid rgba(90,140,165,0.34);background:rgba(14,38,54,0.82);color:#f0dba1;cursor:pointer;font-family:Cinzel,serif;">Editer le projet</button>
      <button type="button" data-entry-action="gm" style="padding:14px 16px;border-radius:12px;border:1px solid rgba(90,140,165,0.34);background:rgba(14,38,54,0.82);color:#f0dba1;cursor:pointer;font-family:Cinzel,serif;">Activer le mode MJ</button>
      <button type="button" data-entry-action="maps" style="padding:14px 16px;border-radius:12px;border:1px solid rgba(90,140,165,0.34);background:rgba(14,38,54,0.82);color:#f0dba1;cursor:pointer;font-family:Cinzel,serif;">Outils maps</button>
      <button type="button" data-entry-action="pnj" style="padding:14px 16px;border-radius:12px;border:1px solid rgba(90,140,165,0.34);background:rgba(14,38,54,0.82);color:#f0dba1;cursor:pointer;font-family:Cinzel,serif;">Outils PNJ</button>
      <button type="button" data-entry-action="mobs" style="padding:14px 16px;border-radius:12px;border:1px solid rgba(90,140,165,0.34);background:rgba(14,38,54,0.82);color:#f0dba1;cursor:pointer;font-family:Cinzel,serif;">Outils mobs</button>
      <button type="button" data-entry-action="docs" style="padding:14px 16px;border-radius:12px;border:1px solid rgba(90,140,165,0.34);background:rgba(14,38,54,0.82);color:#f0dba1;cursor:pointer;font-family:Cinzel,serif;">Outils documents</button>
    </div>
    <div style="margin-top:16px;padding:14px 16px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(214,180,106,0.16);font-size:12px;line-height:1.6;color:#bfae8b;">
      Si l'ancien flux MJ pose encore probleme, ce studio d'entree reste accessible et sert de passerelle vers les outils.
    </div>
  `

  overlay.appendChild(panel)
  document.body.appendChild(overlay)

  document.getElementById("creatorStudioEntryClose").onclick = closeCreatorStudioEntry

  panel.querySelectorAll("[data-entry-action]").forEach(function(button) {
    button.onclick = function() {
      const action = String(button.dataset.entryAction || "")
      if (action === "customize") {
        if (typeof openCustomizationPanel === "function") {
          closeCreatorStudioEntry()
          openCustomizationPanel()
          return
        }
        if (typeof showNotification === "function") showNotification("Editeur indisponible pour le moment.")
        return
      }

      if (action === "gm") {
        if (typeof requestGM === "function") requestGM()
        return
      }

      if (typeof requestGM === "function") requestGM()

      const menuMap = {
        maps: "mapMenu",
        pnj: "pnjMenu",
        mobs: "mobMenu2",
        docs: "elementsMenu"
      }
      const menuId = menuMap[action]
      if (!menuId) return

      if (typeof startGame === "function" && !window.gameStarted) startGame()

      setTimeout(function() {
        if (typeof toggleGMSection === "function") {
          closeCreatorStudioEntry()
          toggleGMSection(menuId)
        }
      }, 900)
    }
  })
}

function safeStartIntro(event) {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  if (window.__introBooted) return
  window.__introBooted = true
  window.__introClickLockUntil = Date.now() + 800
  const start = document.getElementById("startScreen")
  const intro = document.getElementById("intro")
  if (start) {
    start.style.pointerEvents = "none"
    start.style.zIndex = "999999999"
  }
  if (intro) intro.style.pointerEvents = "none"
  if (typeof startIntro === "function") {
    startIntro()
  } else {
    console.error("startIntro introuvable")
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyCustomizationToUI()
  const start = document.getElementById("startScreen")
  if (start) {
    start.style.zIndex = "999999999"
    start.style.pointerEvents = "none"
  }
  setTimeout(() => safeStartIntro(), 60)
  document.addEventListener("click", function(event) {
    if (Date.now() < (window.__introClickLockUntil || 0)) {
      const intro = document.getElementById("intro")
      if (intro && intro.contains(event.target)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
  }, true)
})

