import { writable, derived, get } from 'svelte/store';
import {
  Block,
  BlockTree,
  createBlock,
  createBlockTree,
  getNextPath,
  comparePaths,
  getParentPath,
  CreateBlockOptions,
} from '../models/Block';
import {
  parseMarkdown,
  serializeMarkdown,
  renumberTree,
} from '../parser/MarkdownParser';

/**
 * Store containing the current BlockTree
 */
export const blockTree = writable<BlockTree>(createBlockTree());

/**
 * Store for the raw markdown content
 */
export const markdownContent = writable<string>('');

/**
 * Store for the currently selected block ID
 */
export const selectedBlockId = writable<string | null>(null);

/**
 * Store for the currently edited block ID
 */
export const editingBlockId = writable<string | null>(null);

/**
 * Store for the file path of the current note
 */
export const currentFilePath = writable<string | null>(null);

/**
 * Store for whether the view is in append mode
 */
export const isAppendMode = writable<boolean>(false);

/**
 * Store for any pre-append content (content before the tree)
 */
export const preAppendContent = writable<string>('');

/**
 * Derived store for selected block
 */
export const selectedBlock = derived(
  [blockTree, selectedBlockId],
  ([$blockTree, $selectedBlockId]) => {
    if (!$selectedBlockId) return null;
    return $blockTree.idMap.get($selectedBlockId) || null;
  }
);

/**
 * Derived store for editing block
 */
export const editingBlock = derived(
  [blockTree, editingBlockId],
  ([$blockTree, $editingBlockId]) => {
    if (!$editingBlockId) return null;
    return $blockTree.idMap.get($editingBlockId) || null;
  }
);

/**
 * Parses markdown content and updates the block tree
 */
export function loadMarkdown(content: string, existingContent: string = ''): void {
  // Store any existing content that was before the tree
  preAppendContent.set(existingContent);
  
  markdownContent.set(content);
  
  const tree = parseMarkdown(content);
  blockTree.set(tree);
  
  // If tree has blocks, we're not in append mode
  isAppendMode.set(tree.rootBlocks.length === 0 && content.length > 0);
}

/**
 * Creates a new block and adds it to the tree
 */
export function addBlock(
  pathSegments: number[],
  content: string = '',
  parent: Block | null = null
): Block {
  const tree = get(blockTree);
  const newBlock = createBlock(tree, {
    pathSegments,
    content,
    parent,
  });
  
  if (parent) {
    parent.children.push(newBlock);
    parent.children.sort((a, b) => comparePaths(a.pathSegments, b.pathSegments));
  } else {
    tree.rootBlocks.push(newBlock);
    tree.rootBlocks.sort((a, b) => comparePaths(a.pathSegments, b.pathSegments));
  }
  
  // Trigger update
  blockTree.set(tree);
  
  return newBlock;
}

/**
 * Creates a new block as a sibling after the given block
 */
export function addSiblingAfter(afterBlock: Block, content: string = ''): Block {
  const parent = afterBlock.parent;
  const siblings = parent ? parent.children : get(blockTree).rootBlocks;
  
  // Determine next path
  const pathSegments = getNextPath(get(blockTree), 
    parent ? parent.pathSegments : []);
  
  return addBlock(pathSegments, content, parent);
}

/**
 * Creates a new child block under the given parent
 */
export function addChildBlock(parent: Block, content: string = ''): Block {
  const pathSegments = getNextPath(get(blockTree), parent.pathSegments);
  return addBlock(pathSegments, content, parent);
}

/**
 * Creates a new block at the root level
 */
export function addRootBlock(content: string = ''): Block {
  const pathSegments = getNextPath(get(blockTree), []);
  return addBlock(pathSegments, content, null);
}

/**
 * Updates the content of a block
 */
export function updateBlockContent(blockId: string, content: string): void {
  const tree = get(blockTree);
  const block = tree.idMap.get(blockId);
  
  if (block) {
    block.content = content;
    blockTree.set(tree);
  }
}

/**
 * Updates the path of a block (used for renumbering)
 */
export function updateBlockPath(blockId: string, newPathSegments: number[]): void {
  const tree = get(blockTree);
  const block = tree.idMap.get(blockId);
  
  if (block) {
    const newPath = newPathSegments.join('.');
    
    // Remove from old path
    tree.pathMap.delete(block.path);
    
    // Update path
    block.pathSegments = newPathSegments;
    block.path = newPath;
    block.depth = newPathSegments.length - 1;
    
    // Add to new path
    tree.pathMap.set(newPath, block);
    
    // Update children depths
    updateChildrenDepths(block);
    
    blockTree.set(tree);
  }
}

/**
 * Updates depths of all children after a path change
 */
function updateChildrenDepths(block: Block): void {
  for (const child of block.children) {
    child.depth = child.pathSegments.length - 1;
    updateChildrenDepths(child);
  }
}

/**
 * Deletes a block and all its children
 */
export function deleteBlock(blockId: string): void {
  const tree = get(blockTree);
  const block = tree.idMap.get(blockId);
  
  if (!block) return;
  
  // Remove from parent or root
  if (block.parent) {
    const index = block.parent.children.indexOf(block);
    if (index !== -1) {
      block.parent.children.splice(index, 1);
    }
  } else {
    const index = tree.rootBlocks.indexOf(block);
    if (index !== -1) {
      tree.rootBlocks.splice(index, 1);
    }
  }
  
  // Remove from maps (recursively)
  removeBlockFromMaps(tree, block);
  
  // Renumber remaining blocks
  renumberTree(tree);
  
  // Clear selection if deleted block was selected
  const selectedId = get(selectedBlockId);
  if (selectedId === blockId) {
    selectedBlockId.set(null);
  }
  
  const editingId = get(editingBlockId);
  if (editingId === blockId) {
    editingBlockId.set(null);
  }
  
  blockTree.set(tree);
}

/**
 * Removes a block and its children from maps
 */
function removeBlockFromMaps(tree: BlockTree, block: Block): void {
  tree.idMap.delete(block.id);
  tree.pathMap.delete(block.path);
  
  for (const child of block.children) {
    removeBlockFromMaps(tree, child);
  }
}

/**
 * Moves a block to a new position (as sibling after target)
 */
export function moveBlock(blockId: string, targetParent: Block | null, targetIndex: number): void {
  const tree = get(blockTree);
  const block = tree.idMap.get(blockId);
  
  if (!block) return;
  
  // Remove from current location
  if (block.parent) {
    const idx = block.parent.children.indexOf(block);
    if (idx !== -1) block.parent.children.splice(idx, 1);
  } else {
    const idx = tree.rootBlocks.indexOf(block);
    if (idx !== -1) tree.rootBlocks.splice(idx, 1);
  }
  
  // Update parent reference
  block.parent = targetParent;
  block.depth = targetParent ? targetParent.depth + 1 : 0;
  
  // Add to new location
  if (targetParent) {
    block.pathSegments = [...targetParent.pathSegments, targetIndex];
    targetParent.children.splice(targetIndex - 1, 0, block);
  } else {
    block.pathSegments = [targetIndex];
    tree.rootBlocks.splice(targetIndex - 1, 0, block);
  }
  
  // Renumber entire tree
  renumberTree(tree);
  
  blockTree.set(tree);
}

/**
 * Toggles the collapsed state of a block
 */
export function toggleBlockCollapsed(blockId: string): void {
  const tree = get(blockTree);
  const block = tree.idMap.get(blockId);
  
  if (block) {
    block.collapsed = !block.collapsed;
    blockTree.set(tree);
  }
}

/**
 * Selects a block
 */
export function selectBlock(blockId: string | null): void {
  selectedBlockId.set(blockId);
}

/**
 * Sets a block to editing mode
 */
export function startEditing(blockId: string): void {
  editingBlockId.set(blockId);
  selectedBlockId.set(blockId);
}

/**
 * Stops editing
 */
export function stopEditing(): void {
  editingBlockId.set(null);
}

/**
 * Gets the serialized markdown
 */
export function getSerializedMarkdown(): string {
  const tree = get(blockTree);
  const preContent = get(preAppendContent);
  const serialized = serializeMarkdown(tree);
  
  if (preContent && serialized) {
    return preContent + '\n\n' + serialized;
  } else if (preContent) {
    return preContent;
  }
  return serialized;
}

/**
 * Clears the tree
 */
export function clearTree(): void {
  blockTree.set(createBlockTree());
  markdownContent.set('');
  preAppendContent.set('');
  selectedBlockId.set(null);
  editingBlockId.set(null);
  isAppendMode.set(false);
}
