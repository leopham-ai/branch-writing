import { get } from 'svelte/store';
import {
  markdownContent,
  preAppendContent,
  isAppendMode,
  loadMarkdown,
  getSerializedMarkdown,
} from '../stores/blockStore';

/**
 * File synchronization utilities for reading/writing notes
 */

/**
 * Checks if a line is a branch writing path prefix
 */
function isPathPrefix(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const match = trimmed.match(/^(\d+(?:\.\d+)*)\.\s*/);
  return match !== null && /^\d+(?:\.\d+)*$/.test(match[1]);
}

/**
 * Finds the first path prefix line in content
 * Returns the content before it (pre-append content)
 */
function splitPreAppendContent(content: string): { preContent: string; treeContent: string } {
  const lines = content.split('\n');
  let firstPrefixIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (isPathPrefix(lines[i])) {
      firstPrefixIndex = i;
      break;
    }
  }
  
  if (firstPrefixIndex === -1) {
    // No path prefix found, all content is pre-append
    return { preContent: content, treeContent: '' };
  }
  
  const preContent = lines.slice(0, firstPrefixIndex).join('\n').trim();
  const treeContent = lines.slice(firstPrefixIndex).join('\n');
  
  return { preContent, treeContent };
}

/**
 * Reads and parses a file for branch writing
 * Returns the parsed content and any pre-append content
 */
export async function readNoteForBranchWriting(
  readFn: () => Promise<string>
): Promise<{ treeContent: string; preContent: string; fullContent: string }> {
  const fullContent = await readFn();
  const { preContent, treeContent } = splitPreAppendContent(fullContent);
  
  if (treeContent) {
    isAppendMode.set(false);
    loadMarkdown(treeContent, preContent);
  } else {
    isAppendMode.set(true);
    markdownContent.set('');
    preAppendContent.set(preContent);
  }
  
  return { treeContent, preContent, fullContent };
}

/**
 * Writes the branch writing content back to a file
 * Preserves pre-append content and appends the tree below
 */
export async function writeNoteForBranchWriting(
  writeFn: (content: string) => Promise<void>
): Promise<void> {
  const serialized = getSerializedMarkdown();
  const preContent = get(preAppendContent);
  
  let finalContent: string;
  
  if (preContent && serialized) {
    finalContent = preContent + '\n\n---\n\n' + serialized;
  } else if (preContent) {
    finalContent = preContent;
  } else {
    finalContent = serialized;
  }
  
  await writeFn(finalContent);
}

/**
 * Creates an editor adapter for Obsidian's editor
 */
export interface EditorAdapter {
  getValue(): string;
  setValue(value: string): void;
  getCursor(): { line: number; ch: number };
  setCursor(line: number, ch: number): void;
  replaceSelection(text: string): void;
  getSelection(): string;
  focus(): void;
}

/**
 * Creates an adapter from Obsidian editor instance
 */
export function createEditorAdapter(editor: EditorAdapter): EditorAdapter {
  return {
    getValue: () => editor.getValue(),
    setValue: (value: string) => editor.setValue(value),
    getCursor: () => editor.getCursor(),
    setCursor: (line: number, ch: number) => editor.setCursor(line, ch),
    replaceSelection: (text: string) => editor.replaceSelection(text),
    getSelection: () => editor.getSelection(),
    focus: () => editor.focus(),
  };
}

/**
 * Converts Obsidian editor to our adapter
 */
export function obsidianEditorToAdapter(editor: any): EditorAdapter {
  return {
    getValue: () => editor.getValue(),
    setValue: (value: string) => editor.setValue(value),
    getCursor: () => {
      const cursor = editor.getCursor();
      return { line: cursor.line, ch: cursor.ch };
    },
    setCursor: (line: number, ch: number) => {
      editor.setCursor({ line, ch });
    },
    replaceSelection: (text: string) => {
      editor.replaceSelection(text);
    },
    getSelection: () => editor.getSelection(),
    focus: () => editor.focus(),
  };
}
