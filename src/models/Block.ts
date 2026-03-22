/**
 * Represents a single block in the branch writing tree.
 * Each block has a dot-notation path (1, 1.2, 1.2.3, etc.) and content that
 * flows until the next block at the same or higher level.
 */
export interface Block {
  /** Unique identifier for the block */
  id: string;
  /** Dot-notation path (e.g., "1", "1.2", "1.2.3") */
  path: string;
  /** Numeric path segments array (e.g., [1], [1, 2], [1, 2, 3]) */
  pathSegments: number[];
  /** The content of this block (flows until next prefix) */
  content: string;
  /** Child blocks */
  children: Block[];
  /** Depth level in the tree (0 = root level) */
  depth: number;
  /** Whether this block is collapsed in the UI */
  collapsed: boolean;
  /** Parent block reference */
  parent: Block | null;
}

/**
 * The root tree structure containing all blocks
 */
export interface BlockTree {
  /** All top-level blocks */
  rootBlocks: Block[];
  /** Map of path -> block for quick lookup */
  pathMap: Map<string, Block>;
  /** Map of id -> block for quick lookup */
  idMap: Map<string, Block>;
  /** Counter for generating unique IDs */
  nextId: number;
}

/**
 * Options for creating a new block
 */
export interface CreateBlockOptions {
  /** Path segments for the new block */
  pathSegments: number[];
  /** Content of the block */
  content: string;
  /** Parent block (null for root level) */
  parent: Block | null;
}

/**
 * Represents a path range for operations
 */
export interface PathRange {
  /** Start path (inclusive) */
  start: string;
  /** End path (exclusive) */
  end: string;
}

/**
 * Creates a new empty BlockTree
 */
export function createBlockTree(): BlockTree {
  return {
    rootBlocks: [],
    pathMap: new Map(),
    idMap: new Map(),
    nextId: 1,
  };
}

/**
 * Creates a new Block with the given options
 */
export function createBlock(tree: BlockTree, options: CreateBlockOptions): Block {
  const path = options.pathSegments.join('.');
  const id = `block-${tree.nextId++}`;
  
  const block: Block = {
    id,
    path,
    pathSegments: [...options.pathSegments],
    content: options.content,
    children: [],
    depth: options.parent ? options.parent.depth + 1 : 0,
    collapsed: false,
    parent: options.parent,
  };
  
  tree.idMap.set(id, block);
  tree.pathMap.set(path, block);
  
  return block;
}

/**
 * Generates the next available path at a given depth
 * For example, if existing paths at depth 1 are [1, 2, 3], returns 4
 */
export function getNextPath(tree: BlockTree, parentPathSegments: number[]): number[] {
  const depth = parentPathSegments.length;
  
  // Find all blocks at this depth under the parent
  const siblings: number[] = [];
  
  if (depth === 0) {
    // Root level - find all root blocks
    for (const block of tree.rootBlocks) {
      siblings.push(block.pathSegments[0]);
    }
  } else {
    // Find parent block
    const parentPath = parentPathSegments.join('.');
    const parent = tree.pathMap.get(parentPath);
    if (parent) {
      for (const child of parent.children) {
        siblings.push(child.pathSegments[depth]);
      }
    }
  }
  
  // Sort and find next available number
  siblings.sort((a, b) => a - b);
  
  let next = 1;
  for (const s of siblings) {
    if (s === next) {
      next++;
    } else if (s > next) {
      break;
    }
  }
  
  return [...parentPathSegments, next];
}

/**
 * Compares two path segments arrays for ordering
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
export function comparePaths(a: number[], b: number[]): number {
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    if (aVal !== bVal) {
      return aVal - bVal;
    }
  }
  return 0;
}

/**
 * Checks if path a is a descendant of path b
 */
export function isDescendant(a: number[], b: number[]): boolean {
  if (b.length >= a.length) return false;
  for (let i = 0; i < b.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Checks if path a is an ancestor of path b
 */
export function isAncestor(a: number[], b: number[]): boolean {
  return isDescendant(b, a);
}

/**
 * Gets the parent path of a given path
 */
export function getParentPath(path: number[]): number[] {
  if (path.length <= 1) return [];
  return path.slice(0, -1);
}

/**
 * Calculates all descendant paths that need renumbering after a deletion
 */
export function getDescendantPaths(path: number[]): number[][] {
  const descendants: number[][] = [];
  
  function traverse(current: number[]) {
    // We don't include the path itself, only its children
    // This is handled separately in renumberTree
  }
  
  // The descendants are any paths that start with the given path
  return descendants;
}
