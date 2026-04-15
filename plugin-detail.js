(function () {
  "use strict";

  var DEFAULT_ICON = "happy_ghast.png";
  var container = document.getElementById("plugin-detail");

  function getPluginId() {
    var params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  async function init() {
    var id = getPluginId();
    if (!id) {
      container.innerHTML = '<div class="empty-state"><p>No plugin ID provided.</p></div>';
      return;
    }

    try {
      var res = await fetch("public/data/plugins/" + encodeURIComponent(id) + ".json");
      if (!res.ok) throw new Error("Plugin not found");
      var plugin = await res.json();
      document.title = plugin.name + " \u2013 Pockgin";
      renderDetail(plugin);
    } catch (err) {
      container.innerHTML = '<div class="empty-state"><p>Plugin not found or failed to load.</p></div>';
      console.error(err);
    }
  }

  function renderDetail(p) {
    var icon = p.icon_url || DEFAULT_ICON;
    var badge = p.verified
      ? '<span class="badge badge-verified">Verified</span>'
      : '<span class="badge badge-unverified">Unverified</span>';

    var html = "";

    // Header
    html += '<div class="detail-header">';
    html += '  <img class="detail-icon" src="' + escapeAttr(icon) + '" alt="" width="80" height="80" onerror="this.src=\'' + DEFAULT_ICON + '\'">';
    html += '  <div class="detail-title-area">';
    html += "    <h1>" + escapeHtml(p.name) + "</h1>";
    html += '    <p class="detail-author">by ' + escapeHtml(p.author || "Unknown") + "</p>";
    html += '    <p class="detail-desc">' + escapeHtml(p.description || "") + "</p>";
    html += '    <div class="detail-badges">' + badge + "</div>";
    html += "  </div>";
    html += "</div>";

    // Repo link
    if (p.repo) {
      html += '<a class="repo-link" href="' + escapeAttr(p.repo) + '" target="_blank" rel="noopener">';
      html += githubSvg() + " " + escapeHtml(p.repo.replace("https://github.com/", ""));
      html += "</a>";
    }
    if (p.archive_repo) {
      html += '<br><a class="repo-link" href="' + escapeAttr(p.archive_repo) + '" target="_blank" rel="noopener">';
      html += githubSvg() + " Archive: " + escapeHtml(p.archive_repo.replace("https://github.com/", ""));
      html += "</a>";
    }

    // Stats
    html += '<div class="detail-stats">';
    html += statBlock(formatNumber(p.stars || 0), "Stars");
    html += statBlock(formatNumber(p.total_downloads || 0), "Downloads");
    if (p.last_commit_at) {
      html += statBlock(formatDate(p.last_commit_at), "Last Commit");
    }
    html += "</div>";

    // Versions (stable + dev)
    html += '<h2 class="section-title">Versions</h2>';
    if (p.versions && p.versions.stable) {
      html += versionCard(p.versions.stable, "stable");
    }
    if (p.versions && p.versions.dev) {
      html += versionCard(p.versions.dev, "dev");
    }
    if (!p.versions || (!p.versions.stable && !p.versions.dev)) {
      html += '<p style="color:var(--text-secondary);font-size:0.9rem;">No version data available.</p>';
    }

    // Recent Builds accordion
    if (p.recent_builds && p.recent_builds.length > 0) {
      html += '<div class="accordion">';
      html += '  <button class="accordion-trigger" aria-expanded="false" onclick="toggleAccordion(this)">';
      html += "    Recent Builds (" + p.recent_builds.length + ")";
      html += '    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
      html += "  </button>";
      html += '  <div class="accordion-content">';
      p.recent_builds.slice(0, 5).forEach(function (build) {
        html += buildCard(build, p.approved_release_tag);
      });
      html += "  </div>";
      html += "</div>";
    }

    // Comments
    html += '<div class="comments-section">';
    html += '<h2 class="section-title">Comments</h2>';
    if (p.comments && p.comments.enabled) {
      if (p.comments.provider === "giscus" && p.comments.giscus) {
        html += '<div id="giscus-container"></div>';
        html += giscusScript(p.comments.giscus);
      } else {
        html += '<div id="comments-placeholder" style="padding:24px;background:var(--bg-surface);border-radius:var(--radius-md);text-align:center;color:var(--text-secondary);">Comments are enabled. Provider integration pending.</div>';
      }
    } else {
      html += '<div class="comments-disabled">Comments are disabled for this plugin.</div>';
    }
    html += "</div>";

    container.innerHTML = html;
  }

  function versionCard(v, channel) {
    var channelClass = channel === "stable" ? "channel-stable" : "channel-dev";
    var channelLabel = channel.charAt(0).toUpperCase() + channel.slice(1);
    var html = '<div class="version-card">';
    html += '  <div class="version-info">';
    html += '    <span class="version-tag">' + escapeHtml(v.version || v.tag || "-") + "</span>";
    if (v.published_at) {
      html += '    <span class="version-date">Released ' + formatDate(v.published_at) + "</span>";
    }
    if (typeof v.downloads === "number") {
      html += '    <span class="version-downloads">' + formatNumber(v.downloads) + " downloads</span>";
    }
    html += "  </div>";
    html += '  <div style="display:flex;align-items:center;gap:10px;">';
    html += '    <span class="version-channel ' + channelClass + '">' + channelLabel + "</span>";
    if (v.download_url) {
      html += '    <a class="btn btn-primary" href="' + escapeAttr(v.download_url) + '" target="_blank" rel="noopener">Download</a>';
    }
    html += "  </div>";
    html += "</div>";
    return html;
  }

  function buildCard(build, approvedTag) {
    var isApproved = build.tag === approvedTag;
    var html = '<div class="version-card">';
    html += '  <div class="version-info">';
    html += '    <span class="version-tag">' + escapeHtml(build.tag || "-");
    if (!isApproved) {
      html += ' <span class="badge badge-unapproved">Unapproved</span>';
    }
    html += "    </span>";
    if (build.published_at) {
      html += '    <span class="version-date">' + formatDate(build.published_at) + "</span>";
    }
    html += "  </div>";
    if (isApproved && build.download_url) {
      html += '  <a class="btn btn-outline" href="' + escapeAttr(build.download_url) + '" target="_blank" rel="noopener">Download</a>';
    }
    html += "</div>";
    return html;
  }

  function giscusScript(cfg) {
    return '<script src="https://giscus.app/client.js"' +
      ' data-repo="' + escapeAttr(cfg.repo || "") + '"' +
      ' data-repo-id="' + escapeAttr(cfg.repo_id || "") + '"' +
      ' data-category="' + escapeAttr(cfg.category || "") + '"' +
      ' data-category-id="' + escapeAttr(cfg.category_id || "") + '"' +
      ' data-mapping="' + escapeAttr(cfg.mapping || "pathname") + '"' +
      ' data-strict="0"' +
      ' data-reactions-enabled="1"' +
      ' data-emit-metadata="0"' +
      ' data-input-position="bottom"' +
      ' data-theme="light"' +
      ' data-lang="en"' +
      ' crossorigin="anonymous"' +
      " async><\/script>";
  }

  /* ---- Global accordion toggle ---- */
  window.toggleAccordion = function (trigger) {
    var expanded = trigger.getAttribute("aria-expanded") === "true";
    trigger.setAttribute("aria-expanded", String(!expanded));
    var content = trigger.nextElementSibling;
    content.classList.toggle("open", !expanded);
  };

  /* ---- Helpers ---- */

  function statBlock(value, label) {
    return '<div class="stat-block"><div class="stat-value">' + value + '</div><div class="stat-label">' + label + "</div></div>";
  }

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch (_) {
      return iso;
    }
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(s));
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function githubSvg() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.237 1.838 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/></svg>';
  }

  init();
})();
