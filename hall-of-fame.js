(function () {
  "use strict";

  var DATA_URL = "public/data/hall-of-fame.json";
  var root = document.getElementById("hof-root");

  async function init() {
    try {
      var res = await fetch(DATA_URL);
      if (!res.ok) throw new Error("hall-of-fame.json not found");
      var data = await res.json();
      render(data);
    } catch (err) {
      root.innerHTML =
        '<div class="empty-state"><p>Hall of Fame data is not available yet. It will be generated on the next scheduled sync.</p></div>';
      console.error(err);
    }
  }

  function render(data) {
    var html = "";

    // Hero
    html += '<div class="hof-hero">';
    html += '  <div class="hof-hero-icon">🏆</div>';
    html += '  <h1>Hall of Fame</h1>';
    html += '  <p class="hof-hero-sub">Celebrating the developers, contributors, and moderators who make Pockgin possible.</p>';
    if (data.last_updated_at) {
      html += '  <p class="hof-updated">Updated ' + formatDate(data.last_updated_at) + '</p>';
    }
    html += '</div>';

    // Moderators
    if (data.moderators && data.moderators.length) {
      html += hofSection(
        "Moderators",
        "The team that keeps Pockgin safe, fair, and growing.",
        "mod",
        data.moderators.map(function (m) {
          return personCard({
            username: m.username,
            display_name: m.display_name || m.username,
            avatar_url: m.avatar_url,
            subtitle: m.role || "Moderator",
            badge: "mod",
          });
        })
      );
    }

    // Top authors by plugin count
    if (data.top_authors_by_plugins && data.top_authors_by_plugins.length) {
      html += hofSection(
        "Most Plugins",
        "Developers who have published the most plugins on Pockgin.",
        "plugins",
        data.top_authors_by_plugins.map(function (a, i) {
          return personCard({
            rank: i + 1,
            username: a.username,
            display_name: a.display_name || a.username,
            avatar_url: a.avatar_url,
            subtitle: a.plugin_count + " plugin" + (a.plugin_count !== 1 ? "s" : ""),
            detail: a.plugins && a.plugins.length
              ? a.plugins.map(function (p) { return escapeHtml(p.name); }).join(" &middot; ")
              : null,
          });
        })
      );
    }

    // Top authors by downloads
    if (data.top_authors_by_downloads && data.top_authors_by_downloads.length) {
      html += hofSection(
        "Most Downloads",
        "Developers whose plugins have been downloaded the most.",
        "downloads",
        data.top_authors_by_downloads.map(function (a, i) {
          return personCard({
            rank: i + 1,
            username: a.username,
            display_name: a.display_name || a.username,
            avatar_url: a.avatar_url,
            subtitle: formatNumber(a.total_downloads) + " total downloads",
            detail: a.plugin_count + " plugin" + (a.plugin_count !== 1 ? "s" : ""),
          });
        })
      );
    }

    // Top contributors
    if (data.top_contributors && data.top_contributors.length) {
      html += hofSection(
        "Top Contributors",
        "People with the most commits across all repositories in the Pockgin organisation.",
        "contrib",
        data.top_contributors.map(function (c, i) {
          var repoSummary = (c.repos || [])
            .sort(function (a, b) { return b.contributions - a.contributions; })
            .slice(0, 3)
            .map(function (r) { return escapeHtml(r.repo) + " (" + r.contributions + ")"; })
            .join(" &middot; ");
          return personCard({
            rank: i + 1,
            username: c.username,
            display_name: c.username,
            avatar_url: c.avatar_url,
            subtitle: formatNumber(c.contributions) + " commit" + (c.contributions !== 1 ? "s" : ""),
            detail: repoSummary || null,
          });
        })
      );
    }

    root.innerHTML = html;
  }

  function hofSection(title, subtitle, id, cards) {
    var html = '<section class="hof-section" id="hof-' + id + '">';
    html += '  <div class="hof-section-header">';
    html += '    <h2>' + escapeHtml(title) + '</h2>';
    html += '    <p>' + escapeHtml(subtitle) + '</p>';
    html += '  </div>';
    html += '  <div class="hof-cards">' + cards.join("") + '</div>';
    html += '</section>';
    return html;
  }

  function personCard(opts) {
    var avatarSrc = opts.avatar_url || "happy_ghast.png";
    var rankHtml = opts.rank
      ? '<span class="hof-rank' + (opts.rank <= 3 ? " hof-rank-top hof-rank-" + opts.rank : "") + '">#' + opts.rank + '</span>'
      : "";
    var badgeHtml = opts.badge === "mod"
      ? '<span class="badge badge-mod">Mod</span>'
      : "";
    var profileUrl = "https://github.com/" + encodeURIComponent(opts.username);

    var html = '<div class="hof-card">';
    html += '  <div class="hof-card-top">';
    html += rankHtml;
    html += '    <img class="hof-avatar image-loading" src="' + escapeAttr(avatarSrc) + '" alt="' + escapeAttr(opts.display_name) + '" width="56" height="56" loading="lazy" onload="this.classList.remove(\'image-loading\')" onerror="this.classList.remove(\'image-loading\');this.src=\'happy_ghast.png\'">';
    html += '    <div class="hof-card-info">';
    html += '      <a class="hof-username" href="' + escapeAttr(profileUrl) + '" target="_blank" rel="noopener">@' + escapeHtml(opts.display_name) + '</a>';
    html += '      <span class="hof-card-subtitle">' + escapeHtml(opts.subtitle) + '</span>';
    html += '      ' + badgeHtml;
    html += '    </div>';
    html += '  </div>';
    if (opts.detail) {
      html += '  <p class="hof-card-detail">' + opts.detail + '</p>';
    }
    html += '</div>';
    return html;
  }

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n || 0);
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch (_) { return iso; }
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(String(s || "")));
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  init();
})();
