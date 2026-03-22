<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Block } from '../models/Block';
  import {
    selectedBlockId,
    editingBlockId,
    updateBlockContent,
    deleteBlock,
    addChildBlock,
    addSiblingAfter,
    startEditing,
    stopEditing,
    toggleBlockCollapsed,
  } from '../stores/blockStore';

  export let block: Block;
  export let depth: number = 0;

  const dispatch = createEventDispatcher();

  $: isSelected = $selectedBlockId === block.id;
  $: isEditing = $editingBlockId === block.id;
  $: hasChildren = block.children.length > 0;
  $: isCollapsed = block.collapsed;

  let editContent: string = '';
  let editTextarea: HTMLTextAreaElement;

  $: if (isEditing && editTextarea) {
    editContent = block.content;
    setTimeout(() => {
      editTextarea?.focus();
      editTextarea?.setSelectionRange(editContent.length, editContent.length);
    }, 0);
  }

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    selectedBlockId.set(block.id);
  }

  function handleDoubleClick(e: MouseEvent) {
    e.stopPropagation();
    startEditing(block.id);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      stopEditing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      stopEditing();
    } else if (e.key === 'Backspace' && block.content === '' && !e.shiftKey) {
      e.preventDefault();
      deleteBlock(block.id);
    }
  }

  function handleContentChange() {
    updateBlockContent(block.id, editContent);
  }

  function handleToggleCollapse(e: MouseEvent | KeyboardEvent) {
    e.stopPropagation();
    toggleBlockCollapsed(block.id);
  }

  function handleAddChild(e: MouseEvent) {
    e.stopPropagation();
    const newBlock = addChildBlock(block, '');
    startEditing(newBlock.id);
  }

  function handleAddSibling(e: MouseEvent) {
    e.stopPropagation();
    const newBlock = addSiblingAfter(block, '');
    startEditing(newBlock.id);
  }

  function handleDelete(e: MouseEvent) {
    e.stopPropagation();
    deleteBlock(block.id);
  }

  function getIndentStyle(d: number): string {
    return `padding-left: ${d * 20 + 8}px;`;
  }
</script>

<div class="block-wrapper">
  <div
    class="block"
    class:selected={isSelected}
    class:editing={isEditing}
    style={getIndentStyle(depth)}
    on:click={handleClick}
    on:dblclick={handleDoubleClick}
    role="button"
    tabindex="0"
    on:keydown={(e) => e.key === 'Enter' && handleClick(e)}
  >
    <!-- Collapse toggle -->
    <button
      class="collapse-toggle"
      class:has-children={hasChildren}
      on:click={handleToggleCollapse}
      aria-expanded={hasChildren ? !isCollapsed : undefined}
      tabindex="-1"
    >
      {#if hasChildren}
        {isCollapsed ? '▶' : '▼'}
      {:else}
        <span class="dot"></span>
      {/if}
    </button>

    <!-- Path prefix -->
    <span class="path-prefix" role="presentation" on:click={(e) => e.stopPropagation()} on:keydown={(e) => e.stopPropagation()}>
      {block.path}.
    </span>

    <!-- Content -->
    {#if isEditing}
      <div class="edit-container">
        <textarea
          bind:this={editTextarea}
          bind:value={editContent}
          on:input={handleContentChange}
          on:keydown={handleKeyDown}
          class="block-textarea"
          placeholder="Enter content..."
        ></textarea>
      </div>
    {:else}
      <span class="block-content">
        {block.content || (hasChildren ? '' : 'Click to edit...')}
      </span>
    {/if}

    <!-- Action buttons (shown when selected) -->
    {#if isSelected && !isEditing}
      <div class="block-actions">
        <button class="action-btn" on:click={handleAddChild} title="Add child (Tab)">+child</button>
        <button class="action-btn" on:click={handleAddSibling} title="Add sibling (Enter)">+sibling</button>
        <button class="action-btn delete" on:click={handleDelete} title="Delete (Backspace)">×</button>
      </div>
    {/if}
  </div>

  <!-- Children -->
  {#if hasChildren && !isCollapsed}
    <div class="children">
      {#each block.children as child (child.id)}
        <svelte:self block={child} depth={depth + 1} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .block-wrapper {
    font-family: var(--font-body, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
    font-size: 15px;
    line-height: 1.6;
  }

  .block {
    display: flex;
    align-items: flex-start;
    padding: 4px 8px;
    margin: 2px 0;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s ease;
    position: relative;
  }

  .block:hover {
    background-color: var(--bg-hover, rgba(0, 0, 0, 0.05));
  }

  .block.selected {
    background-color: var(--bg-selected, rgba(0, 120, 212, 0.1));
  }

  .collapse-toggle {
    width: 20px;
    min-width: 20px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: var(--text-muted, #888);
    cursor: default;
    user-select: none;
  }

  .collapse-toggle.has-children {
    cursor: pointer;
  }

  .collapse-toggle:hover {
    color: var(--text-normal, #333);
  }

  .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: var(--text-muted, #888);
  }

  .path-prefix {
    color: var(--accent-color, #0066cc);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    user-select: none;
  }

  .block-content {
    flex: 1;
    color: var(--text-normal, #333);
    word-break: break-word;
    padding-left: 4px;
  }

  .edit-container {
    flex: 1;
    min-width: 0;
  }

  .block-textarea {
    width: 100%;
    min-height: 60px;
    padding: 4px 8px;
    border: 1px solid var(--accent-color, #0066cc);
    border-radius: 4px;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    resize: vertical;
    background: var(--bg-input, white);
    color: var(--text-normal, #333);
    outline: none;
  }

  .block-actions {
    display: flex;
    gap: 4px;
    margin-left: 8px;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .block.selected .block-actions {
    opacity: 1;
  }

  .action-btn {
    padding: 2px 6px;
    font-size: 11px;
    border: none;
    border-radius: 3px;
    background-color: var(--bg-action, #e0e0e0);
    color: var(--text-muted, #666);
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .action-btn:hover {
    background-color: var(--bg-action-hover, #d0d0d0);
  }

  .action-btn.delete:hover {
    background-color: var(--bg-delete, #ffcccc);
    color: var(--color-delete, #cc0000);
  }

  .children {
    margin-left: 0;
  }
</style>
