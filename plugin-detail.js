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
      document.title = plugin.name + " – Pockgin";
      renderDetail(plugin);
    } catch (err) {
      container.innerHTML = '<div class="empty-state"><p>Plugin not found or failed to load.</p></div>';
      console.error(err);
    }
  }

  // ─── Main render ───

  function renderDetail(p) {
    var icon = p.icon_url || DEFAULT_ICON;
    var author = buildAuthorMeta(p);
    var displayDescription = sanitizeDisplayDescription(p.description, p.name, p.readme_markdown);
    var pendingGiscus = null;

    var h = "";

    // ── Header ──
    h += '<div class="pd-header">';
    h += '<img class="pd-icon image-loading" src="' + esc(icon) + '" alt="" width="64" height="64"'
       + " onload=\"this.classList.remove('image-loading')\" onerror=\"this.classList.remove('image-loading');this.src='" + DEFAULT_ICON + "'\">";
    h += '<div class="pd-header-info">';
    h += '<div class="pd-name-row">';
    h += '<h1 class="pd-name">' + escHtml(p.name) + '</h1>';
    if (p.featured) h += '<span class="badge badge-featured">Featured</span>';
    h += '</div>';
    h += '<div class="pd-author">';
    if (author.avatar_url) {
      h += '<img class="pd-author-avatar image-loading" src="' + esc(author.avatar_url) + '" alt="" width="20" height="20" loading="lazy"'
         + " onload=\"this.classList.remove('image-loading')\" onerror=\"this.classList.remove('image-loading')\">";
    }
    if (author.profile_url) {
      h += '<a href="' + esc(author.profile_url) + '" target="_blank" rel="noopener">' + escHtml(author.name) + '</a>';
    } else {
      h += '<span>' + escHtml(author.name) + '</span>';
    }
    h += '</div>';
    if (displayDescription) h += '<p class="pd-desc">' + escHtml(displayDescription) + '</p>';
    h += '</div></div>';

    // ── 2-column layout ──
    h += '<div class="pd-layout">';

    // ── Main column ──
    h += '<div class="pd-main">';

    if (p.readme_markdown) {
      var sections = splitReadmeSections(p.readme_markdown);
      h += '<section class="pd-section pd-readme-tabs-section">';
      h += '<div class="pd-tab-bar" role="tablist">';
      sections.forEach(function (sec, idx) {
        var active = idx === 0 ? ' active' : '';
        h += '<button class="pd-tab' + active + '" role="tab" aria-selected="' + (idx === 0 ? 'true' : 'false') + '" data-tab-index="' + idx + '" onclick="switchReadmeTab(this)">' + escHtml(sec.title) + '</button>';
      });
      h += '</div>';
      sections.forEach(function (sec, idx) {
        var hidden = idx === 0 ? '' : ' hidden';
        h += '<div class="pd-tab-panel' + hidden + '" role="tabpanel" data-tab-index="' + idx + '">';
        h += '<div class="pd-readme-content"><div class="markdown-content">' + renderMarkdown(sec.content, p) + '</div></div>';
        h += '</div>';
      });
      h += '</section>';
    }

    if (p.whats_new) {
      h += '<section class="pd-section">';
      h += '<button class="pd-accordion-btn" aria-expanded="false" onclick="toggleAccordion(this)">';
      h += 'What\'s New';
      h += chevronSvg();
      h += '</button>';
      h += '<div class="pd-accordion-body">';
      h += '<div class="pd-readme-content"><div class="markdown-content">' + renderMarkdown(p.whats_new, p) + '</div></div>';
      h += '</div></section>';
    }

    if (p.recent_builds && p.recent_builds.length > 0) {
      h += '<section class="pd-section">';
      h += '<button class="pd-accordion-btn" aria-expanded="false" onclick="toggleAccordion(this)">';
      h += 'Recent Builds (' + p.recent_builds.length + ')';
      h += chevronSvg();
      h += '</button>';
      h += '<div class="pd-accordion-body">';
      p.recent_builds.slice(0, 5).forEach(function (b) {
        h += buildRow(b, p.approved_release_tag);
      });
      h += '</div></section>';
    }

    // Comments
    h += '<section class="pd-section pd-comments">';
    h += '<h2 class="pd-section-title">Comments</h2>';
    if (p.comments && p.comments.enabled) {
      if (p.comments.provider === "giscus") {
        var gCfg = resolveGiscusConfig(p);
        if (gCfg) {
          h += '<div id="giscus-container"></div>';
          pendingGiscus = { cfg: gCfg, pluginId: p.id };
        } else {
          h += '<p class="pd-muted">Giscus config incomplete. Update comments-config.js.</p>';
        }
      } else {
        h += '<p class="pd-muted">Comments provider integration pending.</p>';
      }
    } else {
      h += '<p class="pd-muted">Comments are disabled for this plugin.</p>';
    }
    h += '</section>';

    h += '</div>'; // end .pd-main

    // ── Sidebar ──
    h += '<aside class="pd-sidebar">';

    // Card: Download
    var stable = p.versions && p.versions.stable;
    var dev = p.versions && p.versions.dev;
    if (stable || dev) {
      h += '<div class="pd-card">';
      h += '<h3 class="pd-card-title">Install</h3>';
      if (stable) {
        h += '<div class="pd-install-version">';
        h += '<span class="pd-ver-tag">' + escHtml(stable.version || stable.tag || "?") + '</span>';
        h += '<span class="version-channel channel-stable">Stable</span>';
        h += '</div>';
        if (stable.published_at) h += '<p class="pd-ver-meta">Released ' + fmtDate(stable.published_at) + '</p>';
        if (typeof stable.downloads === "number") h += '<p class="pd-ver-meta">' + fmtNum(stable.downloads) + ' downloads</p>';
        if (stable.download_url) {
          h += '<a class="btn btn-primary pd-dl-btn" href="' + esc(stable.download_url) + '" target="_blank" rel="noopener">';
          h += downloadSvg() + ' Download .phar</a>';
        }
      }
      if (dev) {
        if (stable) h += '<div class="pd-card-divider"></div>';
        h += '<div class="pd-install-version">';
        h += '<span class="pd-ver-tag">' + escHtml(dev.version || dev.tag || "?") + '</span>';
        h += '<span class="version-channel channel-dev">Dev</span>';
        h += '</div>';
        if (dev.published_at) h += '<p class="pd-ver-meta">Released ' + fmtDate(dev.published_at) + '</p>';
        if (dev.download_url) {
          h += '<a class="btn btn-outline pd-dl-btn" href="' + esc(dev.download_url) + '" target="_blank" rel="noopener">';
          h += downloadSvg() + ' Download dev</a>';
        }
      }
      h += '</div>';
    }

    // Card: Repository
    if (p.repo || p.archive_repo) {
      h += '<div class="pd-card">';
      h += '<h3 class="pd-card-title">Repository</h3>';
      if (p.repo) {
        h += '<a class="pd-repo-link" href="' + esc(p.repo) + '" target="_blank" rel="noopener">';
        h += githubSvg() + '<span>' + escHtml(p.repo.replace("https://github.com/", "")) + '</span></a>';
      }
      if (p.archive_repo) {
        h += '<a class="pd-repo-link pd-repo-archive" href="' + esc(p.archive_repo) + '" target="_blank" rel="noopener">';
        h += githubSvg() + '<span>Archive: ' + escHtml(p.archive_repo.replace("https://github.com/", "")) + '</span></a>';
      }
      h += '</div>';
    }

    // Card: Stats
    h += '<div class="pd-card">';
    h += '<h3 class="pd-card-title">Stats</h3>';
    h += '<ul class="pd-stat-list">';
    var starVal = fmtNum(p.stars || 0);
    if (p.repo) {
      h += '<li><span class="pd-stat-label">Stars</span><a class="pd-stat-value pd-stat-link" href="' + esc(buildStarUrl(p.repo)) + '" target="_blank" rel="noopener">' + starVal + '</a></li>';
    } else {
      h += '<li><span class="pd-stat-label">Stars</span><span class="pd-stat-value">' + starVal + '</span></li>';
    }
    h += '<li><span class="pd-stat-label">Downloads</span><span class="pd-stat-value">' + fmtNum(p.total_downloads || 0) + '</span></li>';
    if (p.last_commit_at) {
      h += '<li><span class="pd-stat-label">Last Commit</span><span class="pd-stat-value">' + fmtDate(p.last_commit_at) + '</span></li>';
    }
    if (p.last_updated_at) {
      h += '<li><span class="pd-stat-label">Updated</span><span class="pd-stat-value">' + fmtDate(p.last_updated_at) + '</span></li>';
    }
    h += '</ul></div>';

    // Card: Details (license, api, tags, producers)
    var details = [];
    if (p.license && (p.license.spdx_id || p.license.name)) {
      var lic = p.license.spdx_id && p.license.spdx_id !== "NOASSERTION" ? p.license.spdx_id : (p.license.name || "—");
      details.push({ label: "License", value: lic });
    }
    if (p.api_support && p.api_support.length) details.push({ label: "API", value: p.api_support.join(", ") });
    if (p.tags && p.tags.length) details.push({ label: "Tags", value: p.tags.slice(0, 5).join(", ") });
    if (p.producers && p.producers.length) details.push({ label: "Producers", value: p.producers.slice(0, 3).join(", ") });

    if (details.length) {
      h += '<div class="pd-card">';
      h += '<h3 class="pd-card-title">Details</h3>';
      h += '<ul class="pd-stat-list">';
      details.forEach(function (d) {
        h += '<li><span class="pd-stat-label">' + escHtml(d.label) + '</span><span class="pd-stat-value">' + escHtml(d.value) + '</span></li>';
      });
      h += '</ul></div>';
    }

    // Card: Dependencies
    var deps = p.dependencies;
    if (deps && ((deps.required && deps.required.length) || (deps.optional && deps.optional.length))) {
      h += '<div class="pd-card">';
      h += '<h3 class="pd-card-title">Dependencies</h3>';
      if (deps.required && deps.required.length) {
        h += '<p class="pd-dep-label">Required</p>';
        h += '<ul class="pd-dep-list">' + deps.required.map(function (d) { return '<li>' + escHtml(d) + '</li>'; }).join('') + '</ul>';
      }
      if (deps.optional && deps.optional.length) {
        h += '<p class="pd-dep-label">Optional</p>';
        h += '<ul class="pd-dep-list">' + deps.optional.map(function (d) { return '<li>' + escHtml(d) + '</li>'; }).join('') + '</ul>';
      }
      h += '</div>';
    }

    h += '</aside>'; // end .pd-sidebar
    h += '</div>'; // end .pd-layout

    container.innerHTML = h;
    if (pendingGiscus) mountGiscus(pendingGiscus.cfg, pendingGiscus.pluginId);
  }

  // ─── Build row ───

  function buildRow(build, approvedTag) {
    var approved = build.tag === approvedTag;
    var h = '<div class="pd-build-row">';
    h += '<div class="pd-build-info">';
    h += '<span class="pd-ver-tag">' + escHtml(build.tag || "—");
    if (!approved) h += ' <span class="badge badge-unapproved">Unapproved</span>';
    h += '</span>';
    if (build.published_at) h += '<span class="pd-ver-meta">' + fmtDate(build.published_at) + '</span>';
    h += '</div>';
    if (approved && build.download_url) {
      h += '<a class="btn btn-outline btn-sm" href="' + esc(build.download_url) + '" target="_blank" rel="noopener">Download</a>';
    }
    h += '</div>';
    return h;
  }

  // ─── Giscus ───

  function mountGiscus(cfg, pluginId) {
    var host = document.getElementById("giscus-container");
    if (!host) return;
    var mapping = cfg.mapping || "specific";
    var term = cfg.term || ("plugin:" + String(pluginId || "").trim());
    var s = document.createElement("script");
    s.src = "https://giscus.app/client.js";
    s.async = true;
    s.crossOrigin = "anonymous";
    s.setAttribute("data-repo", cfg.repo || "");
    s.setAttribute("data-repo-id", cfg.repo_id || "");
    s.setAttribute("data-category", cfg.category || "");
    s.setAttribute("data-category-id", cfg.category_id || "");
    s.setAttribute("data-mapping", mapping);
    if (mapping === "specific") s.setAttribute("data-term", term);
    s.setAttribute("data-strict", "0");
    s.setAttribute("data-reactions-enabled", "1");
    s.setAttribute("data-emit-metadata", "0");
    s.setAttribute("data-input-position", "bottom");
    s.setAttribute("data-theme", "light");
    s.setAttribute("data-lang", "en");
    host.appendChild(s);
  }

  function resolveGiscusConfig(plugin) {
    var pluginCfg = plugin && plugin.comments ? plugin.comments.giscus : null;
    var fallbackCfg = (typeof window !== "undefined" && window.POCKGIN_GISCUS_DEFAULT) ? window.POCKGIN_GISCUS_DEFAULT : null;
    var cfg = pluginCfg || fallbackCfg;
    if (!cfg) return null;
    if (!cfg.repo || !cfg.repo_id || !cfg.category || !cfg.category_id) return null;
    return cfg;
  }

  // ─── README Tabs ───

  function splitReadmeSections(markdown) {
    var text = String(markdown || "").replace(/\r\n/g, "\n");
    var lines = text.split("\n");
    var sections = [];
    var currentTitle = "General";
    var currentLines = [];

    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/^##\s+(.+)$/);
      if (m) {
        // Push the previous section
        var content = currentLines.join("\n").trim();
        if (content || sections.length === 0) {
          sections.push({ title: currentTitle, content: content });
        }
        currentTitle = m[1].trim();
        currentLines = [];
      } else {
        currentLines.push(lines[i]);
      }
    }
    // Push the last section
    var lastContent = currentLines.join("\n").trim();
    if (lastContent || sections.length === 0) {
      sections.push({ title: currentTitle, content: lastContent });
    }

    // If "General" section is empty and there are other sections, remove it
    if (sections.length > 1 && !sections[0].content) {
      sections.shift();
    }

    return sections;
  }

  window.switchReadmeTab = function (btn) {
    var container = btn.closest(".pd-readme-tabs-section");
    if (!container) return;
    var idx = btn.getAttribute("data-tab-index");

    // Update tab buttons
    var tabs = container.querySelectorAll(".pd-tab");
    tabs.forEach(function (t) {
      var isActive = t.getAttribute("data-tab-index") === idx;
      t.classList.toggle("active", isActive);
      t.setAttribute("aria-selected", String(isActive));
    });

    // Update panels
    var panels = container.querySelectorAll(".pd-tab-panel");
    panels.forEach(function (p) {
      var isVisible = p.getAttribute("data-tab-index") === idx;
      p.classList.toggle("hidden", !isVisible);
    });
  };

  // ─── Accordion ───

  window.toggleAccordion = function (trigger) {
    var expanded = trigger.getAttribute("aria-expanded") === "true";
    trigger.setAttribute("aria-expanded", String(!expanded));
    trigger.nextElementSibling.classList.toggle("open", !expanded);
  };

  // ─── SVG icons ───

  function chevronSvg() {
    return '<svg class="pd-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  }

  function githubSvg() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.237 1.838 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/></svg>';
  }

  function downloadSvg() {
    return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  }

  // ─── Helpers ───

  function fmtNum(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return String(n);
  }

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
    catch (_) { return iso; }
  }

  function escHtml(s) {
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function buildAuthorMeta(p) {
    var owner = parseGhOwner(p && p.repo);
    var name = String((p && p.author) || owner || "Unknown");
    return {
      name: name,
      profile_url: owner ? "https://github.com/" + encodeURIComponent(owner) : null,
      avatar_url: owner ? "https://avatars.githubusercontent.com/" + encodeURIComponent(owner) + "?s=64" : null,
    };
  }

  function parseGhOwner(url) {
    var m = String(url || "").match(/^https:\/\/github\.com\/([^/]+)\/[^/]+/i);
    return m ? m[1] : null;
  }

  function sanitizeDisplayDescription(description, pluginName, readmeMarkdown) {
    var primary = cleanDescriptionCandidate(description, pluginName);
    if (primary) return primary;

    var fallback = summarizeReadmeForDescription(readmeMarkdown, pluginName);
    return fallback || "";
  }

  function summarizeReadmeForDescription(readmeMarkdown, pluginName) {
    var raw = String(readmeMarkdown || "").replace(/\r\n/g, "\n");
    if (!raw) return "";

    var lines = raw.split("\n");
    for (var i = 0; i < lines.length; i += 1) {
      var candidate = cleanDescriptionCandidate(lines[i], pluginName);
      if (candidate) return candidate;
    }

    return "";
  }

  function cleanDescriptionCandidate(input, pluginName) {
    var text = String(input || "");
    if (!text.trim()) return "";

    text = text
      .replace(/!\[[^\]]*\]\((?:[^)(]+|\([^)(]*\))*\)/g, " ")
      .replace(/\[([^\]]+)\]\((?:[^)(]+|\([^)(]*\))*\)/g, "$1")
      .replace(/`{1,3}[^`]*`{1,3}/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/^[#>\-*+\s|:]+/g, " ")
      .replace(/\|/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) return "";
    if (text.length > 220) text = text.slice(0, 217).trim() + "...";
    if (isWeakDescription(text, pluginName)) return "";

    return text;
  }

  function isWeakDescription(text, pluginName) {
    var lower = String(text || "").toLowerCase().trim();
    var normalizedName = String(pluginName || "").toLowerCase().trim();

    if (!lower || lower.length < 6) return true;
    if (lower === "overview") return true;
    if (normalizedName && (lower === normalizedName || lower === normalizedName + " overview" || lower === normalizedName + ".")) return true;
    if (/^![a-z0-9_.-]+$/i.test(text)) return true;
    if (/^[a-z0-9_.-]+_title$/i.test(text)) return true;
    if (/^\w+\s*\{\s*\}$/.test(text)) return true;
    if (/^[-_=*~`|:]+$/.test(text)) return true;
    if (/^(commands|permissions|config|installation|contact)$/i.test(text)) return true;
    if (/^(poggit|github|release|dev builds?)$/i.test(text)) return true;

    return false;
  }
  function buildStarUrl(repo) {
    return String(repo || "").replace(/\/+$/, "") + "/stargazers";
  }

  function preprocessMarkdown(markdown) {
    var text = String(markdown || "").replace(/\r\n/g, "\n");
    if (!text) return "";

    text = text.replace(/<!--([\s\S]*?)-->/g, "");

    var refs = {};
    var kept = [];
    var lines = text.split("\n");

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var refMatch = line.match(/^\s*\[([^\]]+)\]:\s*(\S+)(?:\s+.*)?$/);
      if (refMatch) {
        var key = String(refMatch[1] || "").toLowerCase().trim();
        var url = String(refMatch[2] || "").trim().replace(/^<|>$/g, "");
        if (key && url) refs[key] = url;
        continue;
      }
      kept.push(line);
    }

    text = kept.join("\n")
      .replace(/<a\b([^>]*)>\s*(<img\b[^>]*>)\s*<\/a>/gi, function (_, anchorAttrs, imgTag) {
        var hrefMatch = anchorAttrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
        var srcMatch = imgTag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
        var altMatch = imgTag.match(/\balt\s*=\s*["']([^"']*)["']/i);
        if (!srcMatch) return "";
        var href = hrefMatch ? hrefMatch[1] : "";
        var src = srcMatch[1];
        var alt = altMatch ? altMatch[1] : "";
        if (href) return "[![" + alt + "](" + src + ")]" + "(" + href + ")";
        return "![" + alt + "](" + src + ")";
      })
      .replace(/<a\b([^>]*)>\s*([\s\S]*?)\s*<\/a>/gi, function (_, anchorAttrs, inner) {
        var hrefMatch = anchorAttrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
        var href = hrefMatch ? hrefMatch[1] : "";
        var label = String(inner || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (!href) return label;
        return "[" + (label || href) + "](" + href + ")";
      })
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?div[^>]*>/gi, "")
      .replace(/<\/?p[^>]*>/gi, "")
      .replace(/<a\b[^>]*>/gi, "")
      .replace(/<\/a>/gi, "");

    function resolveRef(id) {
      return refs[String(id || "").toLowerCase().trim()] || "";
    }

    text = text.replace(/\[!\[([^\]]*)\]\[([^\]]+)\]\]\[([^\]]+)\]/g, function (_, alt, imgId, linkId) {
      var img = resolveRef(imgId);
      var href = resolveRef(linkId);
      if (img && href) return "[![" + alt + "](" + img + ")](" + href + ")";
      return alt || "";
    });

    text = text.replace(/!\[([^\]]*)\]\[([^\]]+)\]/g, function (_, alt, id) {
      var u = resolveRef(id);
      return u ? "![" + alt + "](" + u + ")" : (alt || "");
    });

    text = text.replace(/\[([^\]]+)\]\[([^\]]+)\]/g, function (_, label, id) {
      var u = resolveRef(id);
      return u ? "[" + label + "](" + u + ")" : label;
    });

    text = text.replace(/\[([^\]]+)\]\[\]/g, function (_, label) {
      var u = resolveRef(label);
      return u ? "[" + label + "](" + u + ")" : label;
    });

    return text;
  }

  // ─── Markdown renderer (unchanged logic) ───

  function renderMarkdown(markdown, plugin) {
    var text = preprocessMarkdown(markdown);
    if (!text.trim()) return "";
    var lines = text.split("\n");
    var out = [];
    var inCode = false, inUl = false, inOl = false, inBq = false;
    var para = [];

    function flush() { if (para.length) { out.push("<p>" + fmt(para.join(" "), plugin) + "</p>"); para = []; } }
    function closeUl() { if (inUl) { out.push("</ul>"); inUl = false; } }
    function closeOl() { if (inOl) { out.push("</ol>"); inOl = false; } }
    function closeLists() { closeUl(); closeOl(); }
    function openBq() { if (!inBq) { out.push('<blockquote class="markdown-quote">'); inBq = true; } }
    function closeBq() { if (inBq) { flush(); closeLists(); out.push("</blockquote>"); inBq = false; } }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i], t = line.trim();

      if (t.startsWith("```")) { flush(); closeLists(); inCode = !inCode; out.push(inCode ? "<pre><code>" : "</code></pre>"); continue; }
      if (inCode) { out.push(escHtml(line) + "\n"); continue; }
      if (!t) { flush(); closeLists(); closeBq(); continue; }
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flush(); closeLists(); closeBq(); out.push("<hr>"); continue; }

      if (isTableStart(lines, i)) { flush(); closeLists(); closeBq(); var tbl = buildTable(lines, i, plugin); out.push(tbl.html); i = tbl.next; continue; }

      if (t.startsWith(">")) { var qt = t.replace(/^>\s?/, ""); openBq(); if (!qt) { flush(); closeLists(); continue; } t = qt; } else { closeBq(); }

      var hm;
      if ((hm = t.match(/^(#{1,6})\s+(.*)$/))) { flush(); closeLists(); var lvl = hm[1].length; var tag = lvl <= 1 ? "h3" : lvl === 2 ? "h4" : lvl === 3 ? "h5" : "h6"; out.push("<" + tag + ">" + fmt(hm[2], plugin) + "</" + tag + ">"); continue; }

      if (/^<h[1-6][^>]*>.*<\/h[1-6]>$/i.test(t)) { flush(); closeLists(); var hh = renderHtmlH(t, plugin); if (hh) { out.push(hh); continue; } }
      if (/^<img\b[^>]*\/?>$/i.test(t)) { flush(); closeLists(); var ih = renderHtmlImg(t, plugin); if (ih) { out.push(ih); continue; } }

      if (t.startsWith("- ") || t.startsWith("* ")) { flush(); closeOl(); if (!inUl) { inUl = true; out.push("<ul>"); } var lb = t.slice(2); var cl = lb.match(/^\[( |x|X)\]\s+(.*)$/); if (cl) { out.push('<li class="markdown-checklist-item"><input type="checkbox" disabled' + (cl[1].toLowerCase() === "x" ? " checked" : "") + "><span>" + fmt(cl[2], plugin) + "</span></li>"); } else { out.push("<li>" + fmt(lb, plugin) + "</li>"); } continue; }
      if (/^\d+\.\s+/.test(t)) { flush(); closeUl(); if (!inOl) { inOl = true; out.push("<ol>"); } out.push("<li>" + fmt(t.replace(/^\d+\.\s+/, ""), plugin) + "</li>"); continue; }

      closeLists();
      para.push(t);
    }
    flush(); closeLists(); closeBq();
    if (inCode) out.push("</code></pre>");
    return out.join("");
  }

  function isTableStart(lines, i) {
    if (i + 1 >= lines.length) return false;
    var h = lines[i].trim(), s = lines[i + 1].trim();
    if (!h || !s || h.indexOf("|") === -1) return false;
    return /^\|?[\s:-]+(?:\|[\s:-]+)+\|?$/.test(s);
  }

  function buildTable(lines, start, plugin) {
    var hCells = parseRow(lines[start]);
    var cols = hCells.length, body = [];
    var i = start + 2;
    while (i < lines.length) { var r = lines[i].trim(); if (!r || r.indexOf("|") === -1) break; var row = parseRow(lines[i]); if (!row.length) break; body.push(padRow(row, cols)); i++; }
    var html = '<div class="markdown-table-wrap"><table class="markdown-table"><thead><tr>' + padRow(hCells, cols).map(function (c) { return "<th>" + fmt(c, plugin) + "</th>"; }).join("") + "</tr></thead>";
    if (body.length) { html += "<tbody>" + body.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + fmt(c, plugin) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody>"; }
    html += "</table></div>";
    return { html: html, next: i - 1 };
  }

  function parseRow(line) { var r = String(line || "").trim(); if (!r) return []; if (r[0] === "|") r = r.slice(1); if (r[r.length - 1] === "|") r = r.slice(0, -1); return r.split("|").map(function (c) { return c.trim(); }); }
  function padRow(cells, len) { var o = cells.slice(0, len); while (o.length < len) o.push(""); return o; }

  function fmt(text, plugin) {
    var h = escHtml(String(text || ""));
    h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
    h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    h = h.replace(/\[!\[([^\]]*)\]\(([^)\s]+)\)\]\(([^)\s]+)\)/g, function (_, alt, imgUrl, href) {
      var linkedImg = normalizeImgUrl(resolveUrl(imgUrl, plugin));
      var linkedHref = resolveUrl(href, plugin);
      return '<a href="' + esc(linkedHref) + '" target="_blank" rel="noopener"><img class="markdown-inline-badge" src="' + esc(linkedImg) + '" alt="' + escHtml(alt || "") + '" loading="lazy"></a>';
    });
    h = h.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, alt, imgUrl) {
      var inlineImg = normalizeImgUrl(resolveUrl(imgUrl, plugin));
      return '<img class="markdown-inline-badge" src="' + esc(inlineImg) + '" alt="' + escHtml(alt || "") + '" loading="lazy">';
    });
    h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) { return '<a href="' + esc(resolveUrl(url, plugin)) + '" target="_blank" rel="noopener">' + label + "</a>"; });
    h = linkify(h, plugin);
    return h;
  }

  function resolveUrl(raw, plugin) {
    var u = String(raw || "").trim();
    if (!u) return "#";
    if (/^(javascript|data):/i.test(u)) return "#";
    if (/^(https?:|mailto:|#)/i.test(u)) return u;
    if (!plugin || !plugin.repo) return u;
    var ref = plugin.approved_release_tag || "main";
    try { return new URL(u, plugin.repo.replace(/\/+$/, "") + "/blob/" + encodeURIComponent(ref) + "/README.md").toString(); } catch (_) { return plugin.repo; }
  }

  function renderHtmlH(html, plugin) {
    var m = html.match(/^<h([1-6])[^>]*>([\s\S]*)<\/h\1>$/i);
    if (!m) return "";
    var lvl = Number(m[1]), inner = m[2] || "";
    var imgM = inner.match(/<img\b[^>]*>/i);
    var imgH = imgM ? renderHtmlImg(imgM[0], plugin) : "";
    var txt = inner.replace(/<img\b[^>]*>/gi, "").replace(/<[^>]+>/g, "").trim();
    if (!txt && !imgH) return "";
    var tag = lvl <= 2 ? "h3" : lvl === 3 ? "h4" : "h5";
    return "<" + tag + ">" + fmt(txt, plugin) + "</" + tag + ">" + imgH;
  }

  function renderHtmlImg(tag, plugin) {
    var src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!src) return "";
    var alt = tag.match(/\balt\s*=\s*["']([^"']*)["']/i);
    var w = tag.match(/\bwidth\s*=\s*["']([^"']+)["']/i);
    var h = tag.match(/\bheight\s*=\s*["']([^"']+)["']/i);
    var url = normalizeImgUrl(resolveUrl(src[1], plugin));
    return '<p class="markdown-image-wrap"><img class="markdown-image image-loading" src="' + esc(url) + '" alt="' + (alt ? escHtml(alt[1]) : "") + '"' + (w ? ' width="' + esc(w[1]) + '"' : "") + (h ? ' height="' + esc(h[1]) + '"' : "") + " loading=\"lazy\" onload=\"this.classList.remove('image-loading')\" onerror=\"this.classList.remove('image-loading')\"></p>";
  }

  function normalizeImgUrl(url) {
    var v = String(url || "");
    var m = v.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
    return m ? "https://raw.githubusercontent.com/" + m[1] + "/" + m[2] + "/" + m[3] + "/" + m[4] : v;
  }

  function linkify(html, plugin) {
    var parts = html.split(/(<a\b[\s\S]*?<\/a>|<code\b[\s\S]*?<\/code>)/gi);
    for (var i = 0; i < parts.length; i++) { var p = parts[i]; if (!p || /^<a\b/i.test(p) || /^<code\b/i.test(p)) continue; parts[i] = linkifyText(p, plugin); }
    return parts.join("");
  }

  function linkifyText(text, plugin) {
    var o = text.replace(/(https?:\/\/[^\s<]+)/g, function (u) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u) + "</a>"; });
    o = o.replace(/(^|[^A-Za-z0-9_])@([A-Za-z0-9-]{1,39})\b/g, function (_, pre, u) { return pre + '<a href="https://github.com/' + esc(u) + '" target="_blank" rel="noopener">@' + esc(u) + "</a>"; });
    if (plugin && plugin.repo) { var base = plugin.repo.replace(/\/+$/, ""); o = o.replace(/(^|[^A-Za-z0-9_])#(\d+)\b/g, function (_, pre, n) { return pre + '<a href="' + esc(base + "/pull/" + n) + '" target="_blank" rel="noopener">#' + n + "</a>"; }); }
    return o;
  }

  init();
})();
