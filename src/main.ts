import { App, Editor, EditorView, MarkdownView, Modal, Plugin, PluginSettingTab, Setting, View, WorkspaceLeaf } from 'obsidian';
import { get } from 'svelte/store';
import BranchWritingViewComponent from './components/BranchWritingView.svelte';
import { blockTree, loadMarkdown, getSerializedMarkdown, clearTree, addRootBlock, startEditing, preAppendContent } from './stores/blockStore';

// ============================================================================
// Plugin Settings
// ============================================================================

interface BranchWritingSettings {
  autoSave: boolean;
  autoLint: boolean;
  showLineNumbers: boolean;
  defaultCollapsed: boolean;
}

const DEFAULT_SETTINGS: BranchWritingSettings = {
  autoSave: true,
  autoLint: true,
  showLineNumbers: false,
  defaultCollapsed: false,
};

// ============================================================================
// Branch Writing View
// ============================================================================

class BranchWritingView extends View {
  private component: BranchWritingViewComponent | null = null;
  private contentEl: HTMLElement;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    this.contentEl = this.contentEl;
  }

  getViewType(): string {
    return 'branch-writing';
  }

  getDisplayText(): string {
    return 'Branch Writing';
  }

  async onOpen(): Promise<void> {
    // Load content from current file if any
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      const content = activeView.editor.getValue();
      loadMarkdownFromEditor(content);
    }

    this.contentEl.empty();
    
    // Create container for Svelte component
    const container = this.contentEl.createDiv('branch-writing-container');
    
    // Mount Svelte component
    this.component = new BranchWritingViewComponent({
      target: container,
    });
  }

  async onClose(): Promise<void> {
    if (this.component) {
      this.component.$destroy();
      this.component = null;
    }
  }

  onLoadFile(file: any): void {
    // Called when a new file is opened
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) {
      const content = view.editor.getValue();
      loadMarkdownFromEditor(content);
    }
  }
}

// ============================================================================
// Branch Writing Modal (for command palette)
// ============================================================================

class BranchWritingModal extends Modal {
  private component: BranchWritingViewComponent | null = null;

  constructor(app: App) {
    super(app);
  }

  async display(): Promise<void> {
    this.contentEl.empty();
    
    const header = this.contentEl.createDiv('branch-writing-modal-header');
    header.createEl('h2', { text: 'Branch Writing Editor' });
    
    const container = this.contentEl.createDiv('branch-writing-modal-content');
    
    this.component = new BranchWritingViewComponent({
      target: container,
    });

    // Add save/close buttons
    const footer = this.contentEl.createDiv('branch-writing-modal-footer');
    
    const saveBtn = footer.createEl('button', { text: 'Save & Close' });
    saveBtn.addEventListener('click', async () => {
      await saveToActiveFile();
      this.close();
    });
    
    const cancelBtn = footer.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => {
      this.close();
    });
  }

  onOpen(): void {
    this.display();
  }

  onClose(): void {
    if (this.component) {
      this.component.$destroy();
      this.component = null;
    }
  }
}

// ============================================================================
// File Loading Utilities
// ============================================================================

function isPathPrefix(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const match = trimmed.match(/^(\d+(?:\.\d+)*)\.\s*/);
  return match !== null && /^\d+(?:\.\d+)*$/.test(match[1]);
}

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
    return { preContent: content, treeContent: '' };
  }
  
  const preContent = lines.slice(0, firstPrefixIndex).join('\n').trim();
  const treeContent = lines.slice(firstPrefixIndex).join('\n');
  
  return { preContent, treeContent };
}

function loadMarkdownFromEditor(content: string): void {
  const { preContent, treeContent } = splitPreAppendContent(content);
  
  if (treeContent) {
    loadMarkdown(treeContent, preContent);
  } else {
    loadMarkdown('', preContent);
  }
}

async function saveToActiveFile(): Promise<void> {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view) return;

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
  
  view.editor.setValue(finalContent);
}

// ============================================================================
// Main Plugin
// ============================================================================

export default class BranchWritingPlugin extends Plugin {
  private settings: BranchWritingSettings = DEFAULT_SETTINGS;
  private branchWritingView: BranchWritingView | null = null;
  private modal: BranchWritingModal | null = null;

  async onload(): Promise<void> {
    console.log('Branch Writing plugin loading...');

    // Load settings
    await this.loadSettings();

    // Register view
    this.registerView(
      'branch-writing',
      (leaf) => (this.branchWritingView = new BranchWritingView(leaf))
    );

    // Add ribbon icon
    this.addRibbonIcon('dice', 'Open Branch Writing', (evt) => {
      this.openBranchWritingView();
    });

    // Add command to open branch writing view
    this.addCommand({
      id: 'open-branch-writing',
      name: 'Open Branch Writing View',
      callback: () => {
        this.openBranchWritingView();
      },
    });

    // Add command to toggle branch writing mode
    this.addCommand({
      id: 'toggle-branch-writing-mode',
      name: 'Toggle Branch Writing Mode',
      callback: async () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
          const content = view.editor.getValue();
          loadMarkdownFromEditor(content);
          
          // Insert or update tree
          const serialized = getSerializedMarkdown();
          if (serialized) {
            const { preContent } = splitPreAppendContent(content);
            let finalContent: string;
            if (preContent) {
              finalContent = preContent + '\n\n---\n\n' + serialized;
            } else {
              finalContent = serialized;
            }
            view.editor.setValue(finalContent);
          }
        }
      },
    });

    // Add command to add new block
    this.addCommand({
      id: 'branch-writing-add-block',
      name: 'Add New Block',
      callback: () => {
        const newBlock = addRootBlock('');
        startEditing(newBlock.id);
      },
    });

    // Add command to save
    this.addCommand({
      id: 'branch-writing-save',
      name: 'Save Branch Writing',
      callback: async () => {
        await saveToActiveFile();
      },
    });

    // Add settings tab
    this.addSettingTab(new BranchWritingSettingsTab(this.app, this));

    // Listen for file changes
    this.app.workspace.on('file-open', async (file) => {
      if (file) {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
          const content = view.editor.getValue();
          loadMarkdownFromEditor(content);
        }
      }
    });

    // Setup auto-save on change
    this.setupAutoSave();

    console.log('Branch Writing plugin loaded.');
  }

  onunload(): void {
    console.log('Branch Writing plugin unloading...');
    
    if (this.branchWritingView) {
      this.branchWritingView.onClose();
    }
    
    clearTree();
    console.log('Branch Writing plugin unloaded.');
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async openBranchWritingView(): Promise<void> {
    const { leaf } = this.app.workspace;
    
    await leaf.openFile(
      this.app.vault.getAbstractFileByPath('/') as any
    );

    // Fallback to modal
    this.modal = new BranchWritingModal(this.app);
    this.modal.open();
  }

  private setupAutoSave(): void {
    if (!this.settings.autoSave) return;

    // Auto-save on editor change
    this.app.workspace.on('editor-change', async (editor: Editor) => {
      // Debounce this
    });
  }
}

// ============================================================================
// Settings Tab
// ============================================================================

class BranchWritingSettingsTab extends PluginSettingTab {
  private plugin: BranchWritingPlugin;

  constructor(app: App, plugin: BranchWritingPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Branch Writing Settings' });

    new Setting(containerEl)
      .setName('Auto Save')
      .setDesc('Automatically save changes to the file')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoSave)
          .onChange(async (value) => {
            this.plugin.settings.autoSave = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Auto Lint')
      .setDesc('Automatically renumber blocks when changes are made')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoLint)
          .onChange(async (value) => {
            this.plugin.settings.autoLint = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Show Line Numbers')
      .setDesc('Show line numbers in the tree view')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showLineNumbers)
          .onChange(async (value) => {
            this.plugin.settings.showLineNumbers = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Default Collapsed')
      .setDesc('New blocks are collapsed by default')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.defaultCollapsed)
          .onChange(async (value) => {
            this.plugin.settings.defaultCollapsed = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

// Declare app as global for the view
declare const app: App;
