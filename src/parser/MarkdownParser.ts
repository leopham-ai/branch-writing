import {
  Block,
  BlockTree,
  createBlock,
  createBlockTree,
  comparePaths,
  getParentPath,
} from '../models/Block';

/**
 * Regex to match dot-notation prefixes at the start of a line
 * Matches patterns like: 1., 1.2., 1.2.3.
 */
const PATH_PREFIX_REGEX = /^(\d+(?:\.\d+)*)\.\s*/;

/**
 * Regex to validate a complete path
 */
const VALID_PATH_REGEX = /^\d+(?:\.\d+)*$/;

/**
 * Parses a markdown document with dot-notation prefixes into a BlockTree.
 * Content flows from a prefix until the next prefix at the same or higher level.
 */
export function parseMarkdown(content: string): BlockTree {
  const tree = createBlockTree();
  const lines = content.split('\n');
  
  let currentBlock: Block | null = null;
  let currentContent: string[] = [];
  
  for (const line of lines) {
    const match = line.match(PATH_PREFIX_REGEX);
    
    if (match) {
      // Save current block if exists
      if (currentBlock) {
        currentBlock.content = currentContent.join('\n').trim();
        currentContent = [];
      }
      
      // Parse path
      const pathStr = match[1];
      const pathSegments = pathStr.split('.').map(Number);
      
      // Find or create parent
      let parent: Block | null = null;
      if (pathSegments.length > 1) {
        const parentPath = getParentPath(pathSegments).join('.');
        parent = tree.pathMap.get(parentPath) || null;
      }
      
      // Create new block
      currentBlock = createBlock(tree, {
        pathSegments,
        content: '',
        parent,
      });
      
      // Get remainder of line after prefix
      const remainder = line.slice(match[0].length);
      if (remainder) {
        currentContent.push(remainder);
      }
      
      // Add to parent's children or root
      if (parent) {
        parent.children.push(currentBlock);
      } else {
        tree.rootBlocks.push(currentBlock);
      }
    } else if (currentBlock) {
      // Accumulate content for current block
      currentContent.push(line);
    }
    // Lines before first prefix are ignored (append mode handles this)
  }
  
  // Save last block
  if (currentBlock) {
    currentBlock.content = currentContent.join('\n').trim();
  }
  
  // Sort root blocks and all children by path
  sortBlocks(tree.rootBlocks);
  
  return tree;
}

/**
 * Serializes a BlockTree back to markdown with dot-notation prefixes.
 * Single prefix per block, content flows until next prefix.
 */
export function serializeMarkdown(tree: BlockTree): string {
  const lines: string[] = [];
  
  function serializeBlock(block: Block) {
    // Write prefix and content on first line
    const prefix = block.path + '. ';
    if (block.content) {
      // First line with prefix
      const contentLines = block.content.split('\n');
      lines.push(prefix + contentLines[0]);
      // Continuation lines (no prefix)
      for (let i = 1; i < contentLines.length; i++) {
        lines.push(contentLines[i]);
      }
    } else {
      lines.push(prefix);
    }
    
    // Serialize children
    for (const child of block.children) {
      serializeBlock(child);
    }
  }
  
  for (const block of tree.rootBlocks) {
    serializeBlock(block);
  }
  
  return lines.join('\n');
}

/**
 * Checks if a line is a valid path prefix
 */
export function isPathPrefix(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  const match = trimmed.match(PATH_PREFIX_REGEX);
  if (!match) return false;
  
  const pathStr = match[1];
  return VALID_PATH_REGEX.test(pathStr);
}

/**
 * Extracts path segments from a line with prefix
 */
export function extractPath(line: string): number[] | null {
  const match = line.match(PATH_PREFIX_REGEX);
  if (!match) return null;
  return match[1].split('.').map(Number);
}

/**
 * Gets the content of a line after the prefix
 */
export function getContentAfterPrefix(line: string): string {
  const match = line.match(PATH_PREFIX_REGEX);
  if (!match) return line;
  return line.slice(match[0].length);
}

/**
 * Sorts blocks by their path segments
 */
function sortBlocks(blocks: Block[]): void {
  blocks.sort((a, b) => comparePaths(a.pathSegments, b.pathSegments));
  
  for (const block of blocks) {
    if (block.children.length > 0) {
      sortBlocks(block.children);
    }
  }
}

/**
 * Renumbers all blocks in the tree to ensure contiguous numbering.
 * Used after deletions or moves.
 */
export function renumberTree(tree: BlockTree): void {
  // Process root blocks
  renumberSiblings(tree.rootBlocks, []);
  
  // Rebuild pathMap
  tree.pathMap.clear();
  rebuildPathMap(tree.rootBlocks);
}

/**
 * Renumbers sibling blocks starting from 1
 */
function renumberSiblings(blocks: Block[], parentPath: number[]): void {
  blocks.sort((a, b) => comparePaths(a.pathSegments, b.pathSegments));
  
  blocks.forEach((block, index) => {
    const newPathSegments = [...parentPath, index + 1];
    const newPath = newPathSegments.join('.');
    
    // Update block
    block.pathSegments = newPathSegments;
    block.path = newPath;
    block.depth = parentPath.length;
    
    // Recursively renumber children
    if (block.children.length > 0) {
      renumberSiblings(block.children, newPathSegments);
    }
  });
}

/**
 * Rebuilds the path map from the tree
 */
function rebuildPathMap(blocks: Block[]): void {
  for (const block of blocks) {
    block.pathMap?.set(block.path, block);
    if (block.children.length > 0) {
      rebuildPathMap(block.children);
    }
  }
}

/**
 * Validates that paths in the tree are contiguous
 * Returns array of gaps found (e.g., [4] means 4 is missing between 3 and 5)
 */
export function findGaps(tree: BlockTree): number[][] {
  const gaps: number[][] = [];
  
  function checkSiblings(blocks: Block[], parentPath: number[]): void {
    blocks.sort((a, b) => comparePaths(a.pathSegments, a.pathSegments));
    
    let expected = 1;
    for (const block of blocks) {
      if (block.pathSegments[block.pathSegments.length - 1] !== expected) {
        // Found a gap
        const gapPath = [...parentPath, expected];
        gaps.push(gapPath);
      }
      expected = block.pathSegments[block.pathSegments.length - 1] + 1;
      
      if (block.children.length > 0) {
        checkSiblings(block.children, block.pathSegments);
      }
    }
  }
  
  checkSiblings(tree.rootBlocks, []);
  return gaps;
}

/**
 * Gets the depth of a path (number of segments)
 */
export function getPathDepth(path: number[]): number {
  return path.length;
}

/**
 * Checks if a path exists in the tree
 */
export function pathExists(tree: BlockTree, path: number[]): boolean {
  return tree.pathMap.has(path.join('.'));
}
