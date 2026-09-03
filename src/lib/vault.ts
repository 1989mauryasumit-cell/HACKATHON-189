"use client";

import { MockDatabase, EMPTY_DB, MockDatabaseSchema } from "./mock-db";

export interface VaultArchiveSnapshot {
  id: string;
  title: string;
  timestamp: string;
  archived_by: string;
  badge_id: string;
  entities_count: number;
  documents_count: number;
  relationships_count: number;
  alerts_count: number;
  cases_count: number;
  payload: MockDatabaseSchema & { notes?: Record<string, any[]> };
}

const VAULT_STORAGE_KEY = "kraken_admin_master_vault";

export class AdminVaultService {
  // Load all secured vault archives (Admin only)
  public static getArchives(): VaultArchiveSnapshot[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(VAULT_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error("Failed to read admin vault archives:", err);
    }
    return [];
  }

  // Save current active workspace into a secure Admin Vault archive file, then wipe active data
  public static createSnapshotAndReset(
    adminName = "Administrator",
    badgeId = "ADM-001",
    customTitle?: string
  ): VaultArchiveSnapshot | null {
    if (typeof window === "undefined") return null;

    try {
      // 1. Capture current active database
      const activeDb = MockDatabase.load();
      const hasData = (activeDb.entities && activeDb.entities.length > 0) || 
                      (activeDb.documents && activeDb.documents.length > 0) ||
                      (activeDb.relationships && activeDb.relationships.length > 0);

      const snapshotId = `vault-snap-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const now = new Date();

      // Collect any case notes stored in localStorage
      const notes: Record<string, any[]> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("notes-case-")) {
          try {
            notes[key] = JSON.parse(localStorage.getItem(key) || "[]");
          } catch {}
        }
      }

      const snapshot: VaultArchiveSnapshot = {
        id: snapshotId,
        title: customTitle || `Master Operational Archive — ${now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
        timestamp: now.toISOString(),
        archived_by: adminName,
        badge_id: badgeId,
        entities_count: activeDb.entities?.length || 0,
        documents_count: activeDb.documents?.length || 0,
        relationships_count: activeDb.relationships?.length || 0,
        alerts_count: activeDb.alerts?.length || 0,
        cases_count: activeDb.cases?.length || 0,
        payload: {
          ...activeDb,
          notes
        }
      };

      // 2. If there was data, append to Vault archives
      if (hasData) {
        const existing = this.getArchives();
        const updated = [snapshot, ...existing];
        localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updated));
      }

      // 3. Completely wipe the active database and operational stores
      const session = localStorage.getItem("kraken_session");
      const vaultData = localStorage.getItem(VAULT_STORAGE_KEY);
      
      localStorage.clear();
      
      if (session) localStorage.setItem("kraken_session", session);
      if (vaultData) localStorage.setItem(VAULT_STORAGE_KEY, vaultData);
      
      localStorage.setItem("kraken_mock_db", JSON.stringify(EMPTY_DB));
      localStorage.setItem("kraken_v2_clean_slate_applied", "true");
      MockDatabase.clear();

      return snapshot;
    } catch (err) {
      console.error("Failed to create snapshot and reset:", err);
      return null;
    }
  }

  // Restore a specific archived snapshot back into the active workspace
  public static restoreSnapshot(snapshotId: string): boolean {
    if (typeof window === "undefined") return false;

    try {
      const archives = this.getArchives();
      const match = archives.find(a => a.id === snapshotId);
      if (!match) return false;

      // Restore payload into MockDatabase and localStorage
      const { notes, ...dbPayload } = match.payload;
      MockDatabase.save(dbPayload);

      // Restore case notes
      if (notes) {
        Object.entries(notes).forEach(([key, val]) => {
          localStorage.setItem(key, JSON.stringify(val));
        });
      }

      return true;
    } catch (err) {
      console.error("Failed to restore snapshot:", err);
      return false;
    }
  }

  // Delete a snapshot permanently from the vault
  public static deleteSnapshot(snapshotId: string): boolean {
    if (typeof window === "undefined") return false;

    try {
      const archives = this.getArchives();
      const filtered = archives.filter(a => a.id !== snapshotId);
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (err) {
      console.error("Failed to delete snapshot:", err);
      return false;
    }
  }
}
