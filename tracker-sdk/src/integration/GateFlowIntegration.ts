import type { ExperimentTag } from '../types/EventTypes';

interface UserContext {
  userId: string;
  experimentTags: ExperimentTag[];
}

interface UserInitResponse {
  userId: string;
  variants: Record<string, string>;
  experimentTags: Array<{ expId: string; variant: string; layer: string }>;
}

const STORAGE_KEY_USER_ID = 'gf_user_id';
const STORAGE_KEY_EXP_TAGS = 'gf_experiment_tags';
const STORAGE_KEY_CONTEXT_TS = 'gf_context_ts';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

export class GateFlowIntegration {
  private endpoint: string;
  private userId: string | null = null;
  private experimentTags: ExperimentTag[] = [];

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.loadFromCache();
  }

  /**
   * Fetch user context from GateFlow backend.
   * Returns cached values if within TTL, otherwise calls the API.
   */
  async fetchUserContext(): Promise<UserContext> {
    const cached = this.getCachedContext();
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.endpoint.replace(/\/+$/, '')}/api/v1/user/init`;
      const existingUserId = this.userId;

      const initUrl = existingUserId ? `${url}?userId=${existingUserId}` : url;
      const response = await fetch(initUrl, { method: 'POST' });

      if (!response.ok) {
        throw new Error(`GateFlow user init failed: HTTP ${response.status}`);
      }

      const data: UserInitResponse = await response.json();

      this.userId = data.userId;
      this.experimentTags = (data.experimentTags || []).map((t) => ({
        expId: t.expId,
        variant: t.variant,
        layer: t.layer,
      }));

      this.saveToCache();

      return {
        userId: this.userId!,
        experimentTags: this.experimentTags,
      };
    } catch (error) {
      console.warn('[GateFlow] Failed to fetch user context, using cached:', error);
      return {
        userId: this.userId || '',
        experimentTags: this.experimentTags,
      };
    }
  }

  /**
   * Manually set the user ID (e.g., after login).
   */
  identify(userId: string): void {
    this.userId = userId;
    try {
      localStorage.setItem(STORAGE_KEY_USER_ID, userId);
    } catch {
      // localStorage unavailable
    }
  }

  getUserId(): string | undefined {
    return this.userId || undefined;
  }

  getExperimentTags(): ExperimentTag[] {
    return this.experimentTags;
  }

  /**
   * Manually set experiment tags (e.g., from a custom integration).
   */
  setExperimentTags(tags: ExperimentTag[]): void {
    this.experimentTags = tags;
    try {
      localStorage.setItem(STORAGE_KEY_EXP_TAGS, JSON.stringify(tags));
      localStorage.setItem(STORAGE_KEY_CONTEXT_TS, String(Date.now()));
    } catch {
      // localStorage unavailable
    }
  }

  private getCachedContext(): UserContext | null {
    const tsStr = localStorage.getItem(STORAGE_KEY_CONTEXT_TS);
    if (!tsStr) return null;

    const ts = parseInt(tsStr, 10);
    if (Date.now() - ts > CACHE_TTL_MS) return null;

    const userId = localStorage.getItem(STORAGE_KEY_USER_ID);
    if (!userId) return null;

    const tagsStr = localStorage.getItem(STORAGE_KEY_EXP_TAGS);
    const experimentTags: ExperimentTag[] = tagsStr ? JSON.parse(tagsStr) : [];

    return { userId, experimentTags };
  }

  private loadFromCache(): void {
    this.userId = localStorage.getItem(STORAGE_KEY_USER_ID);
    const tagsStr = localStorage.getItem(STORAGE_KEY_EXP_TAGS);
    if (tagsStr) {
      try {
        this.experimentTags = JSON.parse(tagsStr);
      } catch {
        this.experimentTags = [];
      }
    }
  }

  private saveToCache(): void {
    try {
      if (this.userId) {
        localStorage.setItem(STORAGE_KEY_USER_ID, this.userId);
      }
      localStorage.setItem(STORAGE_KEY_EXP_TAGS, JSON.stringify(this.experimentTags));
      localStorage.setItem(STORAGE_KEY_CONTEXT_TS, String(Date.now()));
    } catch {
      // localStorage unavailable
    }
  }
}
