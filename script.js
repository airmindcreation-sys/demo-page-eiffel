/* ============================================================
   Airmind Estate — Démo Projet Eiffel (Isambert)
   Script principal : module dossier meublé → démeubler → visite
   ============================================================ */

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -----------------------------------------------------------
     Année dynamique dans le footer
     ----------------------------------------------------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* -----------------------------------------------------------
     Module démonstration : dossier meublé → démeubler → visite
     -----------------------------------------------------------
     Étape 1 : la grille montre les 21 photos meublées (seule source).
     « Démeubler » lance un temps de traitement, puis bascule chaque
     vignette vers son rendu démeublé, en cascade.
     Étape 2 : « Générer la visite » simule la production, puis ouvre
     le panneau lecteur (vidéo générée, distincte de la visite ci-dessous).
     ----------------------------------------------------------- */
  const demo = document.getElementById("demo-eiffel");
  if (demo) initDemo(demo);

  function initDemo(root) {
    const demeubleBtn = root.querySelector("[data-demeuble]");
    const generateBtn = root.querySelector("[data-generate]");
    const panelFolder = root.querySelector('[data-panel="folder"]');
    const panelPlayer = root.querySelector('[data-panel="player"]');
    const progress = root.querySelector("[data-progress]");
    const progressLabel = root.querySelector("[data-progress-label]");
    const resetBtn = root.querySelector("[data-reset]");
    const caption = root.querySelector("[data-caption]");
    const slateLabel = root.querySelector("[data-slate-label]");
    const grid = root.querySelector("[data-folder-grid]");
    const tiles = grid ? Array.from(grid.querySelectorAll(".folder-tile")) : [];
    const video = root.querySelector("[data-gen-video]");
    const playerFrame = root.querySelector(".demo-player-frame");

    const GENERATE_PHASES = [
      "Analyse des volumes…",
      "Composition des trajectoires de caméra…",
      "Montage de la visite…",
    ];

    let timers = [];
    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }
    function later(fn, ms) {
      timers.push(setTimeout(fn, ms));
    }

    function setCaption(key) {
      if (!caption) return;
      const v = caption.getAttribute("data-cap-" + key);
      if (v != null) caption.textContent = v;
    }
    function setSlate(key) {
      if (!slateLabel) return;
      const v = slateLabel.getAttribute("data-label-" + key);
      if (v != null) slateLabel.textContent = v;
    }
    function setProgress(on, label) {
      if (!progress) return;
      progress.classList.toggle("is-on", on);
      if (label && progressLabel) progressLabel.textContent = label;
    }

    /* Bascule des vignettes : cascade gauche→droite, ligne par ligne. */
    function applyDemeuble() {
      tiles.forEach(function (tile, i) {
        const img = tile.querySelector(".tile-demeuble");
        if (img) img.style.transitionDelay = reduceMotion ? "0ms" : i * 55 + "ms";
      });
      root.classList.add("is-demeuble");
      if (demeubleBtn) demeubleBtn.hidden = true;
      if (generateBtn) generateBtn.hidden = false;
      setSlate("demeuble");
      setCaption("demeuble");
    }

    function demeubler() {
      if (reduceMotion) {
        applyDemeuble();
        return;
      }
      demeubleBtn.disabled = true;
      demeubleBtn.classList.remove("is-attn");
      setProgress(true, "Démeublement en cours…");
      later(function () {
        setProgress(false);
        applyDemeuble();
      }, 1700);
    }

    function showPlayer() {
      panelFolder.classList.remove("is-active");
      panelPlayer.classList.add("is-active");
      if (resetBtn) resetBtn.hidden = false;
      setCaption("video");
      if (video && playerFrame && playerFrame.classList.contains("has-video")) {
        try { video.currentTime = 0; } catch (e) { /* no-op */ }
        const p = video.play();
        if (p && p.catch) p.catch(function () {});
      }
    }

    function generate() {
      if (reduceMotion) {
        showPlayer();
        return;
      }
      generateBtn.disabled = true;
      generateBtn.classList.remove("is-attn");
      setProgress(true, GENERATE_PHASES[0]);
      later(function () { setProgress(true, GENERATE_PHASES[1]); }, 850);
      later(function () { setProgress(true, GENERATE_PHASES[2]); }, 1700);
      later(function () {
        setProgress(false);
        showPlayer();
      }, 2500);
    }

    function reset() {
      clearTimers();
      setProgress(false);
      panelPlayer.classList.remove("is-active");
      panelFolder.classList.add("is-active");
      if (resetBtn) resetBtn.hidden = true;

      // retour à l'étape 1 : dossier meublé (la seule source)
      tiles.forEach(function (tile) {
        const img = tile.querySelector(".tile-demeuble");
        if (img) img.style.transitionDelay = "0ms";
      });
      root.classList.remove("is-demeuble");
      if (demeubleBtn) {
        demeubleBtn.hidden = false;
        demeubleBtn.disabled = false;
        demeubleBtn.classList.add("is-attn");
      }
      if (generateBtn) {
        generateBtn.hidden = true;
        generateBtn.disabled = false;
        generateBtn.classList.add("is-attn");
      }
      setSlate("meuble");
      setCaption("meuble");

      if (video) {
        video.pause();
        try { video.currentTime = 0; } catch (e) { /* no-op */ }
      }
    }

    /* Vidéo générée : le placeholder reste affiché tant que la vidéo
       du module n'est pas présente / lisible. */
    if (video && playerFrame) {
      video.addEventListener("loadedmetadata", function () {
        playerFrame.classList.add("has-video");
      });
      if (video.readyState >= 1) playerFrame.classList.add("has-video");
    }

    if (demeubleBtn) demeubleBtn.addEventListener("click", demeubler);
    if (generateBtn) generateBtn.addEventListener("click", generate);
    if (resetBtn) resetBtn.addEventListener("click", reset);
  }

  /* -----------------------------------------------------------
     Lightbox : clic sur une vignette → photo agrandie
     (montre l'état courant : meublé ou démeublé)
     ----------------------------------------------------------- */
  const zoomDialog = document.getElementById("zoom-dialog");
  if (zoomDialog) {
    const host = zoomDialog.querySelector(".zoom-host");

    function openZoom(tile) {
      if (!host || !tile) return;
      const isDemeuble = demo && demo.classList.contains("is-demeuble");
      const src = tile.querySelector(isDemeuble ? ".tile-demeuble" : ".tile-meuble");
      if (!src) return;
      const img = document.createElement("img");
      img.src = src.src;
      img.alt = src.alt;
      img.className = "zoom-img";
      host.innerHTML = "";
      host.appendChild(img);
      if (typeof zoomDialog.showModal === "function") {
        zoomDialog.showModal();
      } else {
        zoomDialog.setAttribute("open", "");
      }
    }

    document.addEventListener("click", function (e) {
      const tile = e.target.closest && e.target.closest(".folder-tile");
      if (tile) {
        openZoom(tile);
        return;
      }
      const closeBtn = e.target.closest && e.target.closest(".zoom-close");
      if (closeBtn) {
        zoomDialog.close();
        return;
      }
      // Clic sur le backdrop : la cible directe est le <dialog> lui-même
      if (e.target === zoomDialog) {
        zoomDialog.close();
      }
    });

    zoomDialog.addEventListener("close", function () {
      if (host) host.innerHTML = "";
    });
  }

  /* -----------------------------------------------------------
     Vidéos statiques : si un <source> est présent, masquer le
     placeholder (hors lecteur du module, géré par loadedmetadata)
     ----------------------------------------------------------- */
  document.querySelectorAll(".video-frame:not(.demo-player-frame)").forEach(function (frame) {
    const video = frame.querySelector("video");
    if (!video) return;
    const hasSource = video.querySelector("source[src]");
    if (hasSource) frame.classList.add("has-video");
  });

  /* -----------------------------------------------------------
     Smooth scroll explicite pour la nav (au cas où le navigateur
     n'honore pas `scroll-behavior: smooth` lors d'un focus)
     ----------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      const id = link.getAttribute("href").slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      // Met à jour le hash sans saut brutal
      history.pushState(null, "", "#" + id);
    });
  });

})();
