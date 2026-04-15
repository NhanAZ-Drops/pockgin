# Pockgin

> Plugins, without the overhead.

A **static-first plugin registry** for [PocketMine-MP](https://github.com/pmmp/PocketMine-MP). No backend, no database - just Git, CI, and static files.

## Features

- Browse and search plugins from a clean, modern web interface
- Plugin cards with icons, descriptions, version info, stars, and download counts
- Detailed plugin pages with version history and download links
- All data generated from GitHub API and served as static JSON
- Fully automated via GitHub Actions

## Architecture

```
registry/plugins/*.json   → Source of truth (minimal metadata)
        ↓ (CI sync)
public/data/plugins.json  → Generated summary for homepage
public/data/plugins/*.json → Generated detail per plugin
public/data/stats.json    → Aggregate statistics
        ↓
index.html / plugin.html  → Static website reading JSON
```

## How It Works

1. Developers submit a PR adding `registry/plugins/{id}.json`
2. CI validates the registry entry
3. Moderators review and merge the PR
4. A sync workflow fetches data from GitHub and generates public JSON
5. The website is deployed to GitHub Pages

**Merge PR = Publish approved tag.**

## Local Development

Open `index.html` in a browser. The website fetches from `public/data/plugins.json`.

For the full pipeline:

```bash
cd ../scripts
npm install
npm run validate
npm run sync      # requires GITHUB_TOKEN
npm run generate
```

## Contributing

See the [developer flow](https://github.com/pockgin/docs/blob/main/developer-flow.md) documentation.

## Related Repositories

| Repo | Description |
|------|-------------|
| [pockgin/cli](https://github.com/pockgin/cli) | Standardized build CLI |
| [pockgin/plugin-template](https://github.com/pockgin/plugin-template) | Template for new plugins |
| [pockgin/scripts](https://github.com/pockgin/scripts) | Data pipeline scripts |
| [pockgin/docs](https://github.com/pockgin/docs) | Documentation |

## License

MIT
