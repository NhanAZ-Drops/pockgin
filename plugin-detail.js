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
    var badges = "";
    if (p.featured) {
      badges += '<span class="badge badge-featured">Featured</span>';
    }
    badges += p.verified
      ? '<span class="badge badge-verified">Verified</span>'
      : '<span class="badge badge-unverified">Unverified</span>';

    var html = "";

    // Header
    html += '<div class="detail-header">';
    html += '  <img class="detail-icon image-loading" src="' + escapeAttr(icon) + '" alt="" width="80" height="80" onload="this.classList.remove(\'image-loading\')" onerror="this.classList.remove(\'image-loading\');this.src=\'' + DEFAULT_ICON + '\'">';
    html += '  <div class="detail-title-area">';
    html += "    <h1>" + escapeHtml(p.name) + "</h1>";
    html += '    <p class="detail-author">by ' + escapeHtml(p.author || "Unknown") + "</p>";
    html += '    <p class="detail-desc">' + escapeHtml(p.description || "") + "</p>";
    html += '    <div class="detail-badges">' + badges + "</div>";
    html += "  </div>";
    html += "</div>";

    if (p.readme_markdown) {
      html += '<h2 class="section-title">Description</h2>';
      html += '<div class="accordion">';
      html += '  <button class="accordion-trigger" aria-expanded="false" onclick="toggleAccordion(this)">';
      html += "    View README";
      html += '    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
      html += "  </button>";
      html += '  <div class="accordion-content">';
      html += '    <div class="version-card">';
      html += '      <div class="markdown-content">' + renderMarkdown(p.readme_markdown, p) + "</div>";
      html += "    </div>";
      html += "  </div>";
      html += "</div>";
    }

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

    html += renderQuickFacts(p);

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

    if (p.dependencies && ((p.dependencies.required && p.dependencies.required.length) || (p.dependencies.optional && p.dependencies.optional.length))) {
      html += '<div class="accordion">';
      html += '  <button class="accordion-trigger" aria-expanded="false" onclick="toggleAccordion(this)">';
      html += "    Dependencies";
      html += '    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
      html += "  </button>";
      html += '  <div class="accordion-content">';
      html += '    <div class="version-card">';
      html += '      <div class="markdown-content">';
      if (p.dependencies.required && p.dependencies.required.length) {
        html += "<h4>Required</h4><ul>" + p.dependencies.required.map(function (d) { return "<li>" + escapeHtml(d) + "</li>"; }).join("") + "</ul>";
      }
      if (p.dependencies.optional && p.dependencies.optional.length) {
        html += "<h4>Optional</h4><ul>" + p.dependencies.optional.map(function (d) { return "<li>" + escapeHtml(d) + "</li>"; }).join("") + "</ul>";
      }
      html += "      </div>";
      html += "    </div>";
      html += "  </div>";
      html += "</div>";
    }

    if (p.whats_new) {
      html += '<div class="accordion">';
      html += '  <button class="accordion-trigger" aria-expanded="false" onclick="toggleAccordion(this)">';
      html += "    What's New";
      html += '    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
      html += "  </button>";
      html += '  <div class="accordion-content">';
      html += '    <div class="version-card">';
      html += '      <div class="markdown-content">' + renderMarkdown(p.whats_new, p) + "</div>";
      html += "    </div>";
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

  function renderMarkdown(markdown, plugin) {
    var text = String(markdown || "").replace(/\r\n/g, "\n");
    if (!text.trim()) return "";

    var lines = text.split("\n");
    var htmlParts = [];
    var inCodeFence = false;
    var inUnorderedList = false;
    var inOrderedList = false;
    var inBlockquote = false;
    var paragraph = [];

    function flushParagraph() {
      if (paragraph.length === 0) return;
      htmlParts.push("<p>" + formatInline(paragraph.join(" "), plugin) + "</p>");
      paragraph = [];
    }

    function closeUnorderedList() {
      if (!inUnorderedList) return;
      htmlParts.push("</ul>");
      inUnorderedList = false;
    }

    function closeOrderedList() {
      if (!inOrderedList) return;
      htmlParts.push("</ol>");
      inOrderedList = false;
    }

    function closeLists() {
      closeUnorderedList();
      closeOrderedList();
    }

    function openBlockquote() {
      if (inBlockquote) return;
      htmlParts.push('<blockquote class="markdown-quote">');
      inBlockquote = true;
    }

    function closeBlockquote() {
      if (!inBlockquote) return;
      flushParagraph();
      closeLists();
      htmlParts.push("</blockquote>");
      inBlockquote = false;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      if (trimmed.startsWith("```")) {
        flushParagraph();
        closeLists();
        if (!inCodeFence) {
          inCodeFence = true;
          htmlParts.push("<pre><code>");
        } else {
          inCodeFence = false;
          htmlParts.push("</code></pre>");
        }
        continue;
      }

      if (inCodeFence) {
        htmlParts.push(escapeHtml(line) + "\n");
        continue;
      }

      if (!trimmed) {
        flushParagraph();
        closeLists();
        closeBlockquote();
        continue;
      }

      // Horizontal rule (---, ***, ___)
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        flushParagraph();
        closeLists();
        closeBlockquote();
        htmlParts.push("<hr>");
        continue;
      }

      // Markdown table support
      if (isTableStart(lines, i)) {
        flushParagraph();
        closeLists();
        closeBlockquote();
        var table = buildMarkdownTable(lines, i, plugin);
        htmlParts.push(table.html);
        i = table.nextIndex;
        continue;
      }

      // Blockquote support (>, >>, ...)
      if (trimmed.startsWith(">")) {
        var quoteText = trimmed.replace(/^>\s?/, "");
        openBlockquote();
        if (!quoteText) {
          flushParagraph();
          closeLists();
          continue;
        }
        trimmed = quoteText;
      } else {
        closeBlockquote();
      }

      if (trimmed.startsWith("# ")) {
        flushParagraph();
        closeLists();
        htmlParts.push("<h3>" + formatInline(trimmed.slice(2), plugin) + "</h3>");
        continue;
      }

      // Basic HTML block support inside README (common in GitHub READMEs)
      if (/^<h[1-6][^>]*>.*<\/h[1-6]>$/i.test(trimmed)) {
        flushParagraph();
        closeLists();
        var headingHtml = renderHtmlHeading(trimmed, plugin);
        if (headingHtml) {
          htmlParts.push(headingHtml);
          continue;
        }
      }

      if (/^<img\b[^>]*\/?>$/i.test(trimmed)) {
        flushParagraph();
        closeLists();
        var imageHtml = renderHtmlImage(trimmed, plugin);
        if (imageHtml) {
          htmlParts.push(imageHtml);
          continue;
        }
      }
      if (trimmed.startsWith("## ")) {
        flushParagraph();
        closeLists();
        htmlParts.push("<h4>" + formatInline(trimmed.slice(3), plugin) + "</h4>");
        continue;
      }
      if (trimmed.startsWith("### ")) {
        flushParagraph();
        closeLists();
        htmlParts.push("<h5>" + formatInline(trimmed.slice(4), plugin) + "</h5>");
        continue;
      }

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        flushParagraph();
        closeOrderedList();
        if (!inUnorderedList) {
          inUnorderedList = true;
          htmlParts.push("<ul>");
        }
        var listBody = trimmed.slice(2);
        var checklist = listBody.match(/^\[( |x|X)\]\s+(.*)$/);
        if (checklist) {
          var checked = checklist[1].toLowerCase() === "x";
          var label = checklist[2];
          htmlParts.push(
            '<li class="markdown-checklist-item"><input type="checkbox" disabled' +
            (checked ? " checked" : "") +
            "><span>" + formatInline(label, plugin) + "</span></li>"
          );
        } else {
          htmlParts.push("<li>" + formatInline(listBody, plugin) + "</li>");
        }
        continue;
      }

      if (/^\d+\.\s+/.test(trimmed)) {
        flushParagraph();
        closeUnorderedList();
        if (!inOrderedList) {
          inOrderedList = true;
          htmlParts.push("<ol>");
        }
        htmlParts.push("<li>" + formatInline(trimmed.replace(/^\d+\.\s+/, ""), plugin) + "</li>");
        continue;
      }

      closeLists();
      paragraph.push(trimmed);
    }

    flushParagraph();
    closeLists();
    closeBlockquote();
    if (inCodeFence) htmlParts.push("</code></pre>");
    return htmlParts.join("");
  }

  function isTableStart(lines, idx) {
    if (idx + 1 >= lines.length) return false;
    var header = lines[idx].trim();
    var separator = lines[idx + 1].trim();
    if (!header || !separator) return false;
    if (header.indexOf("|") === -1) return false;
    return /^\|?[\s:-]+(?:\|[\s:-]+)+\|?$/.test(separator);
  }

  function buildMarkdownTable(lines, startIdx, plugin) {
    var headerCells = parseTableRow(lines[startIdx]);
    var colCount = headerCells.length;
    var bodyRows = [];
    var i = startIdx + 2; // skip header + separator

    while (i < lines.length) {
      var raw = lines[i];
      var trimmed = raw.trim();
      if (!trimmed) break;
      if (trimmed.indexOf("|") === -1) break;
      var row = parseTableRow(raw);
      if (row.length === 0) break;
      bodyRows.push(normalizeRowLength(row, colCount));
      i++;
    }

    var html = '<div class="markdown-table-wrap"><table class="markdown-table"><thead><tr>';
    html += normalizeRowLength(headerCells, colCount).map(function (cell) {
      return "<th>" + formatInline(cell, plugin) + "</th>";
    }).join("");
    html += "</tr></thead>";

    if (bodyRows.length > 0) {
      html += "<tbody>";
      html += bodyRows.map(function (row) {
        return "<tr>" + row.map(function (cell) {
          return "<td>" + formatInline(cell, plugin) + "</td>";
        }).join("") + "</tr>";
      }).join("");
      html += "</tbody>";
    }

    html += "</table></div>";
    return { html: html, nextIndex: i - 1 };
  }

  function parseTableRow(line) {
    var raw = String(line || "").trim();
    if (!raw) return [];
    if (raw.startsWith("|")) raw = raw.slice(1);
    if (raw.endsWith("|")) raw = raw.slice(0, -1);
    return raw.split("|").map(function (cell) {
      return cell.trim();
    });
  }

  function normalizeRowLength(cells, length) {
    var out = cells.slice(0, length);
    while (out.length < length) out.push("");
    return out;
  }

  function formatInline(text, plugin) {
    var html = escapeHtml(String(text || ""));
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) {
      var resolved = resolveMarkdownUrl(url, plugin);
      return '<a href="' + escapeAttr(resolved) + '" target="_blank" rel="noopener">' + label + "</a>";
    });
    html = linkifyPlainSegments(html, plugin);
    return html;
  }

  function resolveMarkdownUrl(rawUrl, plugin) {
    var url = String(rawUrl || "").trim();
    if (!url) return "#";
    if (/^(javascript|data):/i.test(url)) return "#";
    if (/^(https?:|mailto:|#)/i.test(url)) return url;
    if (!plugin || !plugin.repo) return url;

    var ref = plugin.approved_release_tag || "main";
    var base = plugin.repo.replace(/\/+$/, "") + "/blob/" + encodeURIComponent(ref) + "/README.md";
    try {
      return new URL(url, base).toString();
    } catch (_) {
      return plugin.repo;
    }
  }

  function renderHtmlHeading(html, plugin) {
    var m = html.match(/^<h([1-6])[^>]*>([\s\S]*)<\/h\1>$/i);
    if (!m) return "";
    var level = Number(m[1]);
    var inner = m[2] || "";

    // Extract first inline image if any
    var imgMatch = inner.match(/<img\b[^>]*>/i);
    var imgHtml = imgMatch ? renderHtmlImage(imgMatch[0], plugin) : "";

    // Remove all tags for heading text and render safely
    var textOnly = inner.replace(/<img\b[^>]*>/gi, "").replace(/<[^>]+>/g, "").trim();
    if (!textOnly && !imgHtml) return "";

    var hTag = level <= 2 ? "h3" : (level === 3 ? "h4" : "h5");
    var out = "<" + hTag + ">" + formatInline(textOnly, plugin) + "</" + hTag + ">";
    if (imgHtml) out += imgHtml;
    return out;
  }

  function renderHtmlImage(tag, plugin) {
    var srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) return "";
    var altMatch = tag.match(/\balt\s*=\s*["']([^"']*)["']/i);
    var widthMatch = tag.match(/\bwidth\s*=\s*["']([^"']+)["']/i);
    var heightMatch = tag.match(/\bheight\s*=\s*["']([^"']+)["']/i);

    var src = normalizeImageUrl(resolveMarkdownUrl(srcMatch[1], plugin));
    var alt = altMatch ? escapeHtml(altMatch[1]) : "";
    var widthAttr = widthMatch ? ' width="' + escapeAttr(widthMatch[1]) + '"' : "";
    var heightAttr = heightMatch ? ' height="' + escapeAttr(heightMatch[1]) + '"' : "";

    return '<p class="markdown-image-wrap"><img class="markdown-image image-loading" src="' + escapeAttr(src) + '" alt="' + alt + '"' + widthAttr + heightAttr + ' loading="lazy" onload="this.classList.remove(\'image-loading\')" onerror="this.classList.remove(\'image-loading\')"></p>';
  }

  function renderQuickFacts(p) {
    var facts = [];
    if (p.license && (p.license.spdx_id || p.license.name)) {
      var licenseLabel = p.license.spdx_id && p.license.spdx_id !== "NOASSERTION"
        ? p.license.spdx_id
        : (p.license.name || "License");
      facts.push('<span class="meta-pill">License: ' + escapeHtml(licenseLabel) + "</span>");
    }
    if (p.api_support && p.api_support.length) {
      facts.push('<span class="meta-pill">API: ' + escapeHtml(p.api_support.join(", ")) + "</span>");
    }
    if (p.tags && p.tags.length) {
      facts.push('<span class="meta-pill">Tags: ' + escapeHtml(p.tags.slice(0, 4).join(", ")) + "</span>");
    }
    if (p.producers && p.producers.length) {
      facts.push('<span class="meta-pill">Producers: ' + escapeHtml(p.producers.slice(0, 3).join(", ")) + "</span>");
    }
    if (p.last_updated_at) {
      facts.push('<span class="meta-pill">Updated: ' + escapeHtml(formatDate(p.last_updated_at)) + "</span>");
    }
    if (!facts.length) return "";
    return '<div class="meta-pill-row">' + facts.join("") + "</div>";
  }

  function normalizeImageUrl(url) {
    var value = String(url || "");
    // Convert GitHub blob links to raw links so <img> can load.
    var m = value.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
    if (m) {
      return "https://raw.githubusercontent.com/" + m[1] + "/" + m[2] + "/" + m[3] + "/" + m[4];
    }
    return value;
  }

  function linkifyPlainSegments(html, plugin) {
    var parts = html.split(/(<a\b[\s\S]*?<\/a>|<code\b[\s\S]*?<\/code>)/gi);
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!part) continue;
      if (/^<a\b/i.test(part) || /^<code\b/i.test(part)) continue;
      parts[i] = linkifyTextPart(part, plugin);
    }
    return parts.join("");
  }

  function linkifyTextPart(text, plugin) {
    var out = text;

    // 1) Plain URLs
    out = out.replace(/(https?:\/\/[^\s<]+)/g, function (url) {
      var safe = escapeAttr(url);
      return '<a href="' + safe + '" target="_blank" rel="noopener">' + safe + "</a>";
    });

    // 2) @username mentions
    out = out.replace(/(^|[^A-Za-z0-9_])@([A-Za-z0-9-]{1,39})\b/g, function (_, prefix, username) {
      var safeUser = escapeAttr(username);
      return prefix + '<a href="https://github.com/' + safeUser + '" target="_blank" rel="noopener">@' + safeUser + "</a>";
    });

    // 3) #123 references -> repo pull request link
    if (plugin && plugin.repo) {
      var repoBase = plugin.repo.replace(/\/+$/, "");
      out = out.replace(/(^|[^A-Za-z0-9_])#(\d+)\b/g, function (_, prefix, number) {
        return prefix + '<a href="' + escapeAttr(repoBase + "/pull/" + number) + '" target="_blank" rel="noopener">#' + number + "</a>";
      });
    }

    return out;
  }

  function githubSvg() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.237 1.838 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/></svg>';
  }

  init();
})();
