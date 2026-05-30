// Draft Management & Versioning System for ActivityTab

export interface DraftVersion {
  versionId: string;
  content: string;
  media: string[];
  timestamp: number;
  autoSaved: boolean;
  changes: string; // description of changes
}

export interface ManagedDraft {
  id: string;
  content: string;
  mediaUrls: string[];
  mediaType: "image" | "video" | null;
  music?: { title: string; artist: string; url: string };
  createdAt: number;
  updatedAt: number;
  versions: DraftVersion[];
  autoSaveInterval?: number;
  tags?: string[];
  category?: string; // "personal", "creative", "professional", etc
}

export class DraftManager {
  private static readonly STORAGE_KEY_DRAFTS = "reelsy_drafts";
  private static readonly STORAGE_KEY_BACKUP = "reelsy_drafts_backup";
  private static readonly STORAGE_KEY_DELETED = "reelsy_drafts_deleted";
  private static readonly AUTO_SAVE_INTERVAL = 30000; // 30 seconds
  private static readonly MAX_VERSIONS_PER_DRAFT = 10;
  private static readonly DRAFT_EXPIRY_TIME = 172800000; // 2 days

  /**
   * Create a new draft with version control
   */
  static createDraft(
    content: string,
    mediaUrls: string[] = [],
    mediaType: "image" | "video" | null = null,
    category: string = "personal"
  ): ManagedDraft {
    const draftId = `draft-${Date.now()}`;
    const now = Date.now();
    
    const draft: ManagedDraft = {
      id: draftId,
      content,
      mediaUrls,
      mediaType,
      createdAt: now,
      updatedAt: now,
      versions: [
        {
          versionId: `v1-${now}`,
          content,
          media: mediaUrls,
          timestamp: now,
          autoSaved: false,
          changes: "Initial draft created",
        },
      ],
      category,
      tags: [],
    };
    
    this.saveDraft(draft);
    return draft;
  }

  /**
   * Update an existing draft and create a new version
   */
  static updateDraft(
    draftId: string,
    content: string,
    mediaUrls: string[] = [],
    changes: string = "Content updated",
    autoSave: boolean = false
  ): ManagedDraft | null {
    const draft = this.getDraft(draftId);
    if (!draft) return null;
    
    draft.content = content;
    draft.mediaUrls = mediaUrls;
    draft.updatedAt = Date.now();
    
    // Add new version
    const version: DraftVersion = {
      versionId: `v${draft.versions.length + 1}-${Date.now()}`,
      content,
      media: mediaUrls,
      timestamp: Date.now(),
      autoSaved: autoSave,
      changes,
    };
    
    draft.versions.push(version);
    
    // Keep only last MAX_VERSIONS_PER_DRAFT versions
    if (draft.versions.length > this.MAX_VERSIONS_PER_DRAFT) {
      draft.versions = draft.versions.slice(-this.MAX_VERSIONS_PER_DRAFT);
    }
    
    this.saveDraft(draft);
    return draft;
  }

  /**
   * Save a draft
   */
  static saveDraft(draft: ManagedDraft): void {
    try {
      const drafts = this.getAllDrafts();
      drafts[draft.id] = draft;
      localStorage.setItem(this.STORAGE_KEY_DRAFTS, JSON.stringify(drafts));
      
      // Create backup
      const backup = localStorage.getItem(this.STORAGE_KEY_BACKUP);
      if (!backup || Math.random() > 0.7) { // Backup 30% of saves
        localStorage.setItem(this.STORAGE_KEY_BACKUP, JSON.stringify(drafts));
      }
    } catch (e) {
      console.error("Error saving draft:", e);
    }
  }

  /**
   * Get a single draft
   */
  static getDraft(draftId: string): ManagedDraft | null {
    try {
      const drafts = this.getAllDrafts();
      return drafts[draftId] || null;
    } catch (e) {
      console.error("Error getting draft:", e);
      return null;
    }
  }

  /**
   * Get all drafts
   */
  static getAllDrafts(): Record<string, ManagedDraft> {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY_DRAFTS);
      const drafts = saved ? JSON.parse(saved) : {};
      
      // Clean up expired drafts
      const now = Date.now();
      Object.keys(drafts).forEach((key) => {
        if (now - drafts[key].createdAt > this.DRAFT_EXPIRY_TIME) {
          this.deleteDraft(key);
          delete drafts[key];
        }
      });
      
      return drafts;
    } catch (e) {
      console.error("Error getting all drafts:", e);
      return {};
    }
  }

  /**
   * Get all drafts by category
   */
  static getDraftsByCategory(category: string): ManagedDraft[] {
    const drafts = this.getAllDrafts();
    return Object.values(drafts).filter((d) => d.category === category);
  }

  /**
   * Delete a draft (soft delete - moves to deleted storage)
   */
  static deleteDraft(draftId: string): void {
    try {
      const draft = this.getDraft(draftId);
      if (!draft) return;
      
      const drafts = this.getAllDrafts();
      delete drafts[draftId];
      localStorage.setItem(this.STORAGE_KEY_DRAFTS, JSON.stringify(drafts));
      
      // Store in deleted drafts for recovery
      const deleted = this.getDeletedDrafts();
      deleted[draftId] = { ...draft, deletedAt: Date.now() };
      localStorage.setItem(this.STORAGE_KEY_DELETED, JSON.stringify(deleted));
    } catch (e) {
      console.error("Error deleting draft:", e);
    }
  }

  /**
   * Permanently delete a draft
   */
  static permanentlyDeleteDraft(draftId: string): void {
    try {
      this.deleteDraft(draftId);
      const deleted = this.getDeletedDrafts();
      delete deleted[draftId];
      localStorage.setItem(this.STORAGE_KEY_DELETED, JSON.stringify(deleted));
    } catch (e) {
      console.error("Error permanently deleting draft:", e);
    }
  }

  /**
   * Get deleted drafts (for recovery/undo)
   */
  static getDeletedDrafts(): Record<string, any> {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY_DELETED);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  /**
   * Restore a deleted draft
   */
  static restoreDeletedDraft(draftId: string): ManagedDraft | null {
    try {
      const deleted = this.getDeletedDrafts();
      const draft = deleted[draftId];
      
      if (!draft) return null;
      
      const restoredDraft: ManagedDraft = {
        ...draft,
        id: draftId,
        updatedAt: Date.now(),
      };
      
      this.saveDraft(restoredDraft);
      
      // Remove from deleted
      delete deleted[draftId];
      localStorage.setItem(this.STORAGE_KEY_DELETED, JSON.stringify(deleted));
      
      return restoredDraft;
    } catch (e) {
      console.error("Error restoring draft:", e);
      return null;
    }
  }

  /**
   * Restore from a specific version
   */
  static restoreVersion(draftId: string, versionId: string): ManagedDraft | null {
    try {
      const draft = this.getDraft(draftId);
      if (!draft) return null;
      
      const version = draft.versions.find((v) => v.versionId === versionId);
      if (!version) return null;
      
      draft.content = version.content;
      draft.mediaUrls = version.media;
      draft.updatedAt = Date.now();
      
      // Add this as a new version (restore action)
      draft.versions.push({
        versionId: `v${draft.versions.length + 1}-${Date.now()}`,
        content: version.content,
        media: version.media,
        timestamp: Date.now(),
        autoSaved: false,
        changes: `Restored from version ${versionId}`,
      });
      
      this.saveDraft(draft);
      return draft;
    } catch (e) {
      console.error("Error restoring version:", e);
      return null;
    }
  }

  /**
   * Add a tag to a draft
   */
  static addTag(draftId: string, tag: string): void {
    try {
      const draft = this.getDraft(draftId);
      if (!draft) return;
      
      if (!draft.tags) draft.tags = [];
      if (!draft.tags.includes(tag)) {
        draft.tags.push(tag);
      }
      
      this.saveDraft(draft);
    } catch (e) {
      console.error("Error adding tag:", e);
    }
  }

  /**
   * Remove a tag from a draft
   */
  static removeTag(draftId: string, tag: string): void {
    try {
      const draft = this.getDraft(draftId);
      if (!draft) return;
      
      if (draft.tags) {
        draft.tags = draft.tags.filter((t) => t !== tag);
      }
      
      this.saveDraft(draft);
    } catch (e) {
      console.error("Error removing tag:", e);
    }
  }

  /**
   * Search drafts by content or tags
   */
  static searchDrafts(query: string): ManagedDraft[] {
    const drafts = this.getAllDrafts();
    const lowerQuery = query.toLowerCase();
    
    return Object.values(drafts).filter((draft) => {
      const contentMatch = draft.content.toLowerCase().includes(lowerQuery);
      const tagMatch = draft.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery));
      return contentMatch || tagMatch;
    });
  }

  /**
   * Get drafts sorted by date (newest first)
   */
  static getDraftsSorted(ascending: boolean = false): ManagedDraft[] {
    const drafts = this.getAllDrafts();
    return Object.values(drafts).sort((a, b) => {
      const diff = b.updatedAt - a.updatedAt;
      return ascending ? -diff : diff;
    });
  }

  /**
   * Get draft statistics
   */
  static getDraftStats() {
    const drafts = this.getAllDrafts();
    const draftArray = Object.values(drafts);
    
    return {
      totalDrafts: draftArray.length,
      totalVersions: draftArray.reduce((sum, d) => sum + d.versions.length, 0),
      oldestDraft: draftArray.length > 0 ? Math.min(...draftArray.map((d) => d.createdAt)) : null,
      newestDraft: draftArray.length > 0 ? Math.max(...draftArray.map((d) => d.updatedAt)) : null,
      averageVersionCount: draftArray.length > 0 
        ? draftArray.reduce((sum, d) => sum + d.versions.length, 0) / draftArray.length 
        : 0,
      draftsByCategory: draftArray.reduce((acc, d) => {
        acc[d.category || "uncategorized"] = (acc[d.category || "uncategorized"] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Export draft as JSON
   */
  static exportDraft(draftId: string): string | null {
    try {
      const draft = this.getDraft(draftId);
      if (!draft) return null;
      return JSON.stringify(draft, null, 2);
    } catch (e) {
      console.error("Error exporting draft:", e);
      return null;
    }
  }

  /**
   * Import draft from JSON
   */
  static importDraft(jsonData: string): ManagedDraft | null {
    try {
      const draft = JSON.parse(jsonData);
      if (!draft.id || !draft.content) return null;
      this.saveDraft(draft);
      return draft;
    } catch (e) {
      console.error("Error importing draft:", e);
      return null;
    }
  }

  /**
   * Recovery: attempt to restore from backup
   */
  static recoverFromBackup(): Record<string, ManagedDraft> | null {
    try {
      const backup = localStorage.getItem(this.STORAGE_KEY_BACKUP);
      if (!backup) return null;
      return JSON.parse(backup);
    } catch (e) {
      console.error("Error recovering from backup:", e);
      return null;
    }
  }

  /**
   * Clear expired drafts and optimize storage
   */
  static cleanup(): { deleted: number; recovered: number } {
    try {
      const drafts = this.getAllDrafts();
      const now = Date.now();
      let deleted = 0;
      
      Object.keys(drafts).forEach((key) => {
        if (now - drafts[key].createdAt > this.DRAFT_EXPIRY_TIME) {
          this.deleteDraft(key);
          deleted++;
        }
      });
      
      // Clean up deleted drafts older than 7 days
      const deletedDrafts = this.getDeletedDrafts();
      const deletedArray = Object.entries(deletedDrafts);
      let recovered = 0;
      
      deletedArray.forEach(([key, draft]: [string, any]) => {
        if (draft.deletedAt && now - draft.deletedAt > 7 * 24 * 60 * 60 * 1000) {
          delete deletedDrafts[key];
          recovered++;
        }
      });
      
      localStorage.setItem(this.STORAGE_KEY_DELETED, JSON.stringify(deletedDrafts));
      
      return { deleted, recovered };
    } catch (e) {
      console.error("Error during cleanup:", e);
      return { deleted: 0, recovered: 0 };
    }
  }
}

export default DraftManager;
