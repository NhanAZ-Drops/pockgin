(function () {
  "use strict";

  const DATA_URL = "public/data/plugins.json";
  const DEFAULT_ICON = "happy_ghast.png";

  let allPlugins = [];

  const listEl = document.getElementById("plugin-list");
  const searchEl = document.getElementById("search-input");
  const sortDropdownEl = document.getElementById("sort-dropdown");
  const sortTriggerEl = document.getElementById("sort-trigger");
  const sortLabelEl = document.getElementById("sort-label");
  const sortMenuEl = document.getElementById("sort-menu");
  const sortOptionEls = document.querySelectorAll(".sort-option");
  let currentSort = "name";

  async function init() {
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error("Failed to fetch plugins data");
      allPlugins = await res.json();
      applyFilters();
    } catch (err) {
      listEl.innerHTML =
        '<div class="empty-state"><p>Unable to load plugins. Please try again later.</p></div>';
      console.error(err);
    }
  }

  function render(plugins) {
    if (plugins.length === 0) {
      listEl.innerHTML =
        '<div class="empty-state"><p>No plugins found.</p></div>';
      return;
    }
    listEl.innerHTML = plugins.map(pluginCard).join("");
  }

  function pluginCard(p) {
    var icon = p.icon_url || DEFAULT_ICON;
    var badges = "";
    if (p.featured) {
      badges += '<span class="badge badge-featured">Featured</span>';
    }
    badges += p.verified
      ? '<span class="badge badge-verified">Verified</span>'
      : '<span class="badge badge-unverified">Unverified</span>';
    var version = p.stable_version || "-";

    return (
      '<div class="plugin-card">' +
        '<div class="card-header">' +
          '<img class="card-icon image-loading" src="' + escapeAttr(icon) + '" alt="" width="48" height="48" loading="lazy" onload="this.classList.remove(\'image-loading\')" onerror="this.classList.remove(\'image-loading\');this.src=\'' + DEFAULT_ICON + '\'">' +
          '<div class="card-title-area">' +
            '<h3><a href="plugin.html?id=' + encodeURIComponent(p.id) + '">' + escapeHtml(p.name) + "</a></h3>" +
            '<span class="card-author">' + escapeHtml(p.author || "Unknown") + "</span>" +
          "</div>" +
        "</div>" +
        '<p class="card-desc">' + escapeHtml(p.description || "") + "</p>" +
        '<div class="card-meta">' +
          badges +
          '<span class="meta-item">' + iconSvg("tag") + version + "</span>" +
          '<span class="meta-item">' + iconSvg("download") + formatNumber(p.total_downloads || 0) + "</span>" +
          '<span class="meta-item">' + iconSvg("star") + formatNumber(p.stars || 0) + "</span>" +
        "</div>" +
      "</div>"
    );
  }

  /* ---- Search & Sort ---- */

  searchEl.addEventListener("input", applyFilters);
  initSortDropdown();

  function applyFilters() {
    var q = searchEl.value.trim().toLowerCase();
    var sorted = allPlugins.slice();

    if (q) {
      sorted = sorted.filter(function (p) {
        return (
          p.name.toLowerCase().indexOf(q) !== -1 ||
          (p.author || "").toLowerCase().indexOf(q) !== -1 ||
          (p.description || "").toLowerCase().indexOf(q) !== -1 ||
          p.id.toLowerCase().indexOf(q) !== -1
        );
      });
    }

    var key = currentSort;
    sorted.sort(function (a, b) {
      var featuredDelta = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (featuredDelta !== 0) return featuredDelta;
      var verifiedDelta = Number(Boolean(b.verified)) - Number(Boolean(a.verified));
      if (verifiedDelta !== 0) return verifiedDelta;
      if (key === "downloads") return (b.total_downloads || 0) - (a.total_downloads || 0);
      if (key === "stars") return (b.stars || 0) - (a.stars || 0);
      return a.name.localeCompare(b.name);
    });

    render(sorted);
  }

  /* ---- Helpers ---- */

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(s));
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function iconSvg(name) {
    var icons = {
      tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
      download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
      star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    };
    return icons[name] || "";
  }

  function initSortDropdown() {
    sortTriggerEl.addEventListener("click", function () {
      var isOpen = sortMenuEl.classList.toggle("open");
      sortTriggerEl.setAttribute("aria-expanded", String(isOpen));
    });

    sortOptionEls.forEach(function (option) {
      option.addEventListener("click", function () {
        currentSort = option.getAttribute("data-sort") || "name";
        sortLabelEl.textContent = option.textContent;
        sortOptionEls.forEach(function (o) {
          var active = o === option;
          o.classList.toggle("active", active);
          o.setAttribute("aria-selected", String(active));
        });
        sortMenuEl.classList.remove("open");
        sortTriggerEl.setAttribute("aria-expanded", "false");
        applyFilters();
      });
    });

    document.addEventListener("click", function (event) {
      if (!sortDropdownEl.contains(event.target)) {
        sortMenuEl.classList.remove("open");
        sortTriggerEl.setAttribute("aria-expanded", "false");
      }
    });
  }

  init();
})();
