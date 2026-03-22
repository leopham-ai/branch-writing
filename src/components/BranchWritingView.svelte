<script lang="ts">
  import BlockComponent from './BlockComponent.svelte';
  import {
    blockTree,
    isAppendMode,
    preAppendContent,
    addRootBlock,
    startEditing,
    stopEditing,
    editingBlockId,
    getSerializedMarkdown,
  } from '../stores/blockStore';

  let containerEl: HTMLDivElement;

  $: tree = $blockTree;
  $: rootBlocks = tree.rootBlocks;
  $: hasBlocks = rootBlocks.length > 0;
  $: inAppendMode = $isAppendMode;
  $: preContent = $preAppendContent;
  $: isEditing = $editingBlockId !== null;

  function handleAddRoot() {
    const newBlock = addRootBlock('');
    startEditing(newBlock.id);
  }

  function handleContainerClick(e: MouseEvent) {
    // Deselect when clicking container background
    const target = e.target as HTMLElement;
    if (target === containerEl || target.classList.contains('tree-container')) {
      stopEditing();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    // Global keyboard shortcuts
    if (e.key === 'Escape') {
      stopEditing();
    } else if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAddRoot();
    }
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div
  class="branch-writing-view"
  bind:this={containerEl}
  on:click={handleContainerClick}
  on:keydown={handleKeyDown}
  role="region"
  aria-label="Branch Writing Editor"
  tabindex="-1"
>
  <div class="header">
    <h3 class="title">Branch Writing</h3>
    <div class="header-actions">
      <button class="header-btn" on:click={handleAddRoot} title="Add block (Ctrl+Shift+N)">
        + Add Block
      </button>
    </div>
  </div>

  {#if preContent}
    <div class="pre-content">
      <div class="pre-content-label">Pre-append content</div>
      <pre class="pre-content-text">{preContent}</pre>
    </div>
  {/if}

  <div class="tree-container">
    {#if hasBlocks}
      {#each rootBlocks as block (block.id)}
        <BlockComponent {block} depth={0} />
      {/each}
    {:else if inAppendMode}
      <div class="empty-state append-mode">
        <p>Branch Writing tree will be appended below.</p>
        <button class="add-first-btn" on:click={handleAddRoot}>
          + Add first block
        </button>
      </div>
    {:else}
      <div class="empty-state">
        <p>No blocks yet.</p>
        <p class="hint">Click "Add Block" or press Ctrl+Shift+N to create your first branch.</p>
      </div>
    {/if}
  </div>

  {#if hasBlocks}
    <div class="footer">
      <span class="block-count">{rootBlocks.length} top-level block{rootBlocks.length !== 1 ? 's' : ''}</span>
      <span class="total-count">{tree.idMap.size} total</span>
    </div>
  {/if}
</div>

<style>
  .branch-writing-view {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary, #ffffff);
    font-family: var(--font-body, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
    background: var(--bg-secondary, #fafafa);
  }

  .title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-heading, #333);
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .header-btn {
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid var(--accent-color, #0066cc);
    border-radius: 4px;
    background: var(--bg-btn, white);
    color: var(--accent-color, #0066cc);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .header-btn:hover {
    background: var(--accent-color, #0066cc);
    color: white;
  }

  .pre-content {
    padding: 12px 16px;
    background: var(--bg-secondary, #f5f5f5);
    border-bottom: 1px solid var(--border-light, #eee);
  }

  .pre-content-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted, #888);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .pre-content-text {
    margin: 0;
    padding: 8px;
    font-size: 13px;
    color: var(--text-secondary, #666);
    background: var(--bg-primary, white);
    border-radius: 4px;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 100px;
    overflow-y: auto;
  }

  .tree-container {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
    color: var(--text-muted, #888);
  }

  .empty-state p {
    margin: 0 0 8px;
    font-size: 14px;
  }

  .empty-state .hint {
    font-size: 12px;
    opacity: 0.8;
  }

  .empty-state.append-mode {
    background: var(--bg-secondary, #f9f9f9);
    border-radius: 8px;
    margin: 16px;
  }

  .add-first-btn {
    margin-top: 12px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    border: none;
    border-radius: 6px;
    background: var(--accent-color, #0066cc);
    color: white;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .add-first-btn:hover {
    background: var(--accent-hover, #0055aa);
  }

  .footer {
    display: flex;
    gap: 16px;
    padding: 8px 16px;
    font-size: 11px;
    color: var(--text-muted, #888);
    border-top: 1px solid var(--border-light, #eee);
    background: var(--bg-secondary, #fafafa);
  }

  .block-count {
    font-weight: 500;
  }

  .total-count {
    opacity: 0.7;
  }
</style>
