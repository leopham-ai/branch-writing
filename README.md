# Branch Writing

A Gingko-style block-based writing plugin for Obsidian. Write in small blocks, arrange them visually as branches, and restructure freely without breaking your writing.

![Demo](demo.gif)

## Features

- **Tree-based editing** — Transform linear notes into a hierarchical workspace
- **Dot notation paths** — Blocks use numbered paths (`1.`, `1.2.`, `1.2.3.`) for clear hierarchy
- **Native Markdown** — 100% compatible with standard Markdown files
- **Auto-linting** — Paths automatically renumber to maintain structure
- **Collapse/expand** — Focus on what matters by collapsing subtrees
- **Keyboard shortcuts** — Efficient text editing without touching the mouse

## Installation

### Option 1: Community Plugins (Recommended)

1. Copy the `branch-writing/` folder into your vault's `.obsidian/plugins/` directory:

```bash
# Find your vault path in Obsidian Settings > Vault
# Then run:
cp -r /path/to/branch-writing ~/.obsidian/plugins/
```

2. Open Obsidian
3. Go to **Settings** → **Community plugins**
4. Click **Turn on community plugins** (if prompted)
5. Find **Branch Writing** in the list and toggle it on

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/leopham-ai/branch-writing.git
cd branch-writing

# Install dependencies
npm install

# Build the plugin
npm run build

# Copy to your vault's plugins folder
cp -r dist ~/.obsidian/plugins/branch-writing/
```

## Usage

1. Open any Markdown note in Obsidian
2. Press **Ctrl/Cmd + Shift + P** and search "Branch Writing"
3. Or click the branch icon in the left sidebar ribbon

The note will open in Branch Writing mode. Existing content is preserved and the tree is appended below.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Start editing a block |
| `Escape` | Finish editing |
| `Ctrl/Cmd + Shift + N` | Add new block |
| `Tab` | Indent block (make child) |
| `Shift + Tab` | Outdent block (move to parent level) |

### Block Paths

Each block has a numbered path:

```
1. First top-level block
1.2 Child of first block
1.2.3 Grandchild
1.3 Another child of first block
2. Second top-level block
```

When a block is deleted, paths are automatically renumbered to fill gaps.

## How It Works

Branch Writing uses a simple dot-notation system stored directly in Markdown:

```markdown
1. This is a top-level block
   Content can span multiple lines.

1.2 This is a child block
   It belongs to block 1.

1.2.3 Grandchild block
   Belongs to block 1.2.
```

The plugin parses this structure and renders it as a visual tree. No database, no lock-in — just plain Markdown.

## Settings

Configure in Obsidian Settings → Branch Writing:

- **Auto-save** — Automatically save changes to file
- **Auto-lint** — Automatically renumber paths after changes
- **Show line numbers** — Display block numbers in the tree
- **Default collapsed** — Start with all blocks collapsed

## License

MIT

---

*This codebase was edited, created, and modified by [Leo](https://github.com/leopham), an OpenClaw AI agent working on behalf of [Quinton Pham](https://github.com/phamousq).*
