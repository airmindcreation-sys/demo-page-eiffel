/* ============================================================
   Airmind Estate — Démo Projet Eiffel (Isambert)
   Script principal : sliders avant/après + petits utilitaires
   ============================================================ */

(function () {
  "use strict";

  /* -----------------------------------------------------------
     Année dynamique dans le footer
     ----------------------------------------------------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* -----------------------------------------------------------
     Slider de comparaison avant / après — approche clip-path
     -----------------------------------------------------------
     Les deux images sont superposées en taille réelle (100%/100%).
     Seul le clip-path de l'image "before" change : pas d'étirement
     possible, alignement pixel-perfect garanti, comportement « rideau ».
     ----------------------------------------------------------- */
  const sliders = document.querySelectorAll("[data-comparison]");

  sliders.forEach(function (s) {
    initComparisonSlider(s);
    s.__compInit = true;
  });

  /* Auto-init des sliders ajoutés dynamiquement (ex. cloné dans la lightbox). */
  if (window.MutationObserver) {
    const obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          const items = node.matches && node.matches("[data-comparison]")
            ? [node]
            : (node.querySelectorAll ? Array.from(node.querySelectorAll("[data-comparison]")) : []);
          items.forEach(function (s) {
            if (!s.__compInit) {
              initComparisonSlider(s);
              s.__compInit = true;
            }
          });
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  /* -----------------------------------------------------------
     Lightbox d'agrandissement de slider
     -----------------------------------------------------------
     Clone le <article class="room"> cliqué dans le <dialog>.
     Le MutationObserver ci-dessus init automatiquement le slider cloné.
     Fermeture : bouton ×, touche Esc (native <dialog>), ou clic backdrop.
     ----------------------------------------------------------- */
  const zoomDialog = document.getElementById("zoom-dialog");
  if (zoomDialog) {
    const host = zoomDialog.querySelector(".zoom-host");

    function openZoom(roomEl) {
      if (!host || !roomEl) return;
      const clone = roomEl.cloneNode(true);
      // Pas de bouton agrandir dans la version agrandie
      const innerExpand = clone.querySelector(".room-expand");
      if (innerExpand) innerExpand.remove();
      host.innerHTML = "";
      host.appendChild(clone);
      if (typeof zoomDialog.showModal === "function") {
        zoomDialog.showModal();
      } else {
        zoomDialog.setAttribute("open", "");
      }
    }

    document.addEventListener("click", function (e) {
      const expandBtn = e.target.closest && e.target.closest(".room-expand");
      if (expandBtn) {
        e.preventDefault();
        openZoom(expandBtn.closest(".room"));
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

  function initComparisonSlider(slider) {
    const handle = slider.querySelector(".slider-handle");
    const imgBefore = slider.querySelector(".img-before");

    if (!handle || !imgBefore) return;

    /* Le bouton « agrandir » est superposé à l'intérieur du slider :
       on empêche son pointerdown de déclencher un drag. Le clic, lui,
       continue de remonter jusqu'au handler délégué qui ouvre le zoom. */
    const expandBtn = slider.querySelector(".room-expand");
    if (expandBtn) {
      ["pointerdown", "mousedown", "touchstart"].forEach(function (ev) {
        expandBtn.addEventListener(ev, function (e) { e.stopPropagation(); });
      });
    }

    let dragging = false;
    let rect = null;

    /** Met à jour la position en % (0–100).
     *  Les deux images restent à 100% de largeur, fixes et alignées.
     *  Seul le clip-path de l'image "before" change pour révéler l'image "after". */
    function setPosition(percent) {
      const p = Math.max(0, Math.min(100, percent));
      imgBefore.style.clipPath = "inset(0 " + (100 - p) + "% 0 0)";
      handle.style.left = p + "%";
      handle.setAttribute("aria-valuenow", String(Math.round(p)));
    }

    /** Convertit une position clientX en pourcentage relatif au conteneur. */
    function clientXToPercent(clientX) {
      if (!rect) rect = slider.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * 100;
    }

    /* -------- Pointer events (souris + tactile via Pointer Events) -------- */

    function onPointerDown(e) {
      dragging = true;
      rect = slider.getBoundingClientRect();
      slider.classList.add("is-dragging");
      // Capture du pointeur pour suivre le drag même hors de l'élément
      if (e.pointerId !== undefined && handle.setPointerCapture) {
        try { handle.setPointerCapture(e.pointerId); } catch (_) { /* no-op */ }
      }
      setPosition(clientXToPercent(e.clientX));
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!dragging) return;
      setPosition(clientXToPercent(e.clientX));
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      slider.classList.remove("is-dragging");
    }

    // Si Pointer Events est supporté, on l'utilise (gère souris, tactile, stylet)
    if (window.PointerEvent) {
      handle.addEventListener("pointerdown", onPointerDown);
      slider.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    } else {
      /* -------- Fallback : mouse + touch séparés -------- */
      handle.addEventListener("mousedown", function (e) {
        dragging = true;
        rect = slider.getBoundingClientRect();
        slider.classList.add("is-dragging");
        setPosition(clientXToPercent(e.clientX));
        e.preventDefault();
      });
      slider.addEventListener("mousedown", function (e) {
        dragging = true;
        rect = slider.getBoundingClientRect();
        slider.classList.add("is-dragging");
        setPosition(clientXToPercent(e.clientX));
      });
      window.addEventListener("mousemove", function (e) {
        if (!dragging) return;
        setPosition(clientXToPercent(e.clientX));
      });
      window.addEventListener("mouseup", function () {
        dragging = false;
        slider.classList.remove("is-dragging");
      });

      // Touch
      const touchStart = function (e) {
        const t = e.touches[0];
        if (!t) return;
        dragging = true;
        rect = slider.getBoundingClientRect();
        slider.classList.add("is-dragging");
        setPosition(clientXToPercent(t.clientX));
      };
      const touchMove = function (e) {
        if (!dragging) return;
        const t = e.touches[0];
        if (!t) return;
        setPosition(clientXToPercent(t.clientX));
        e.preventDefault();
      };
      const touchEnd = function () {
        dragging = false;
        slider.classList.remove("is-dragging");
      };

      handle.addEventListener("touchstart", touchStart, { passive: true });
      slider.addEventListener("touchstart", touchStart, { passive: true });
      window.addEventListener("touchmove", touchMove, { passive: false });
      window.addEventListener("touchend", touchEnd);
      window.addEventListener("touchcancel", touchEnd);
    }

    /* -------- Accessibilité : flèches clavier -------- */
    handle.addEventListener("keydown", function (e) {
      const current = parseFloat(handle.getAttribute("aria-valuenow") || "50");
      let next = current;
      const step = e.shiftKey ? 10 : 2;

      if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = current - step;
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = current + step;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = 100;
      else return;

      rect = slider.getBoundingClientRect();
      setPosition(next);
      e.preventDefault();
    });

    /* -------- Recalcul du rect au resize (pour le drag) -------- */
    window.addEventListener("resize", function () {
      rect = slider.getBoundingClientRect();
    });

    /* -------- Initialisation à 50% -------- */
    rect = slider.getBoundingClientRect();
    setPosition(50);
  }

  /* -----------------------------------------------------------
     Vidéos : si un <source> est présent, masquer le placeholder
     ----------------------------------------------------------- */
  document.querySelectorAll(".video-frame").forEach(function (frame) {
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
