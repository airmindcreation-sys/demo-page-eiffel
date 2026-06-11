/* ============================================================
   Airmind Creation — Page démo (événement)
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
    const remeubleBtn = root.querySelector("[data-remeuble]");
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
    const pagePrev = root.querySelector("[data-page-prev]");
    const pageNext = root.querySelector("[data-page-next]");
    const pager = root.querySelector("[data-pager]");

    /* ---------- Album paginé + curseur de taille ----------
       Le curseur règle le nombre de colonnes (3 = grandes photos,
       7 = tout l'album d'un coup). La pagination suit : 2 rangées
       par page, ou une page unique quand tout tient à l'écran. */
    const sizeRange = root.querySelector("[data-size-range]");
    let pageSize = 6;
    let pageCount = Math.ceil(tiles.length / pageSize);
    let page = 0;
    let dots = [];

    function buildPager() {
      pageCount = Math.ceil(tiles.length / pageSize);
      if (page > pageCount - 1) page = pageCount - 1;
      const single = pageCount <= 1;
      if (pagePrev) pagePrev.hidden = single;
      if (pageNext) pageNext.hidden = single;
      if (!pager) return;
      pager.hidden = single;
      pager.innerHTML = "";
      dots = [];
      for (let i = 0; i < pageCount; i++) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "pager-dot";
        dot.setAttribute("aria-label", "Page " + (i + 1) + " sur " + pageCount);
        dot.addEventListener("click", goToPage.bind(null, i));
        pager.appendChild(dot);
        dots.push(dot);
      }
    }

    function renderPage(animate) {
      tiles.forEach(function (tile, i) {
        tile.hidden = Math.floor(i / pageSize) !== page;
      });
      if (pagePrev) pagePrev.disabled = page === 0;
      if (pageNext) pageNext.disabled = page === pageCount - 1;
      dots.forEach(function (d, i) { d.classList.toggle("is-active", i === page); });
      if (animate && !reduceMotion && grid) {
        grid.classList.remove("is-turning");
        void grid.offsetWidth; // relance l'animation d'entrée
        grid.classList.add("is-turning");
      }
    }

    function goToPage(p) {
      const next = Math.max(0, Math.min(pageCount - 1, p));
      if (next === page) return;
      page = next;
      renderPage(true);
    }

    /* Sur téléphone la grille est fixée à 2 colonnes (CSS) : pages de
       4 photos, navigation au swipe. Le curseur ne joue que sur desktop. */
    const mqMobile = window.matchMedia("(max-width: 880px)");

    function applySize() {
      if (mqMobile.matches) {
        pageSize = 6; // 2 colonnes × 3 rangées : 4 pages régulières
      } else {
        // curseur à droite (5) = 3 colonnes ; à gauche (1) = 7 colonnes
        const cols = 8 - (sizeRange ? Number(sizeRange.value) : 5);
        if (grid) grid.style.setProperty("--cols", cols);
        pageSize = cols >= 7 ? tiles.length : cols * 2;
      }
      buildPager();
      renderPage(true);
    }

    if (pagePrev) pagePrev.addEventListener("click", function () { goToPage(page - 1); });
    if (pageNext) pageNext.addEventListener("click", function () { goToPage(page + 1); });
    if (sizeRange) sizeRange.addEventListener("input", applySize);
    if (mqMobile.addEventListener) mqMobile.addEventListener("change", applySize);

    /* Swipe gauche/droite pour tourner l'album (tactile) */
    const reel = root.querySelector(".folder-reel");
    if (reel) {
      let touchX = null, touchY = null;
      reel.addEventListener("touchstart", function (e) {
        touchX = e.touches[0].clientX;
        touchY = e.touches[0].clientY;
      }, { passive: true });
      reel.addEventListener("touchend", function (e) {
        if (touchX == null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        const dy = e.changedTouches[0].clientY - touchY;
        touchX = null;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          goToPage(page + (dx < 0 ? 1 : -1));
        }
      }, { passive: true });
    }

    applySize();
    renderPage(false);

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

    /* Cascade sur la page visible, les pages masquées basculent
       instantanément. */
    function setCascadeDelays() {
      let visIdx = 0;
      tiles.forEach(function (tile) {
        const img = tile.querySelector(".tile-demeuble");
        if (!img) return;
        if (tile.hidden || reduceMotion) img.style.transitionDelay = "0ms";
        else img.style.transitionDelay = visIdx++ * 90 + "ms";
      });
    }

    function applyDemeuble() {
      setCascadeDelays();
      root.classList.add("is-demeuble");
      if (demeubleBtn) demeubleBtn.hidden = true;
      if (remeubleBtn) { remeubleBtn.hidden = false; remeubleBtn.disabled = false; }
      if (generateBtn) { generateBtn.hidden = false; generateBtn.disabled = false; generateBtn.classList.add("is-attn"); }
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

    /* Re-meubler : retour aux photos d'origine, cascade inverse,
       sans temps de traitement (c'est une simple annulation). */
    function remeubler() {
      clearTimers();
      setProgress(false);
      setCascadeDelays();
      root.classList.remove("is-demeuble");
      if (remeubleBtn) remeubleBtn.hidden = true;
      if (generateBtn) generateBtn.hidden = true;
      if (demeubleBtn) {
        demeubleBtn.hidden = false;
        demeubleBtn.disabled = false;
        demeubleBtn.classList.add("is-attn");
      }
      setSlate("meuble");
      setCaption("meuble");
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
      panelPlayer.classList.remove("is-active");
      panelFolder.classList.add("is-active");
      if (resetBtn) resetBtn.hidden = true;

      // retour à l'étape 1 : dossier meublé (la seule source), page 1
      remeubler();
      tiles.forEach(function (tile) {
        const img = tile.querySelector(".tile-demeuble");
        if (img) img.style.transitionDelay = "0ms";
      });
      page = 0;
      renderPage(false);

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
    if (remeubleBtn) remeubleBtn.addEventListener("click", remeubler);
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
     Formulaire de demande de démo (relayé vers Brevo via /api/subscribe)
     ----------------------------------------------------------- */
  const form = document.getElementById("demoForm");
  const formSuccess = document.getElementById("formSuccess");
  if (form) {
    const emailInput = document.getElementById("email");
    const prenomInput = document.getElementById("prenom");
    const nomInput = document.getElementById("nom");
    const submitBtn = form.querySelector('button[type="submit"]');

    function showFormError(msg) {
      let err = form.querySelector(".form__error");
      if (!err) {
        err = document.createElement("p");
        err.className = "form__error";
        err.setAttribute("role", "alert");
        err.style.cssText = "color:#c0392b; margin-top:12px; font-size:14px; line-height:1.4;";
        form.appendChild(err);
      }
      err.textContent = msg;
    }
    function clearFormError() {
      const err = form.querySelector(".form__error");
      if (err) err.remove();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
      const valid = prenomInput.value.trim() && nomInput.value.trim() && emailOk;
      if (!valid) {
        [prenomInput, nomInput, emailInput].forEach(function (f) {
          if (!f.value.trim()) f.reportValidity && f.reportValidity();
        });
        if (!emailOk) {
          emailInput.setCustomValidity("Adresse email invalide");
          emailInput.reportValidity();
        }
        return;
      }
      emailInput.setCustomValidity("");
      clearFormError();

      let originalHTML;
      if (submitBtn) {
        originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.style.cursor = "wait";
        submitBtn.textContent = "Envoi…";
      }
      function restoreBtn() {
        if (!submitBtn) return;
        submitBtn.disabled = false;
        submitBtn.style.cursor = "";
        if (originalHTML) submitBtn.innerHTML = originalHTML;
      }

      fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.value.trim(),
          firstname: prenomInput.value.trim(),
          lastname: nomInput.value.trim(),
          source: "demo_eiffel",
        }),
      }).then(function (res) {
        if (res.status === 200 || res.status === 409) {
          form.style.display = "none";
          const kicker = document.querySelector(".form-kicker");
          if (kicker) kicker.style.display = "none";
          if (formSuccess) formSuccess.classList.add("is-on");
        } else {
          restoreBtn();
          showFormError("Une erreur est survenue. Réessayez ou écrivez-nous à contact@airmindcreation.com.");
        }
      }).catch(function () {
        restoreBtn();
        showFormError("Connexion impossible. Vérifiez votre réseau et réessayez.");
      });
    });
    emailInput.addEventListener("input", function () {
      this.setCustomValidity("");
      clearFormError();
    });
  }

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
