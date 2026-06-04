import type { EventDTO } from '../types/EventTypes';
import { validateEvent } from './EventValidator';

const MAX_LOG_ENTRIES = 50;
const PANEL_ID = 'gf-devtools-panel';

interface LogEntry {
  event: EventDTO;
  time: number;
}

export class DevTools {
  private events: LogEntry[] = [];
  private panel: HTMLDivElement | null = null;
  private isOpen: boolean = false;
  private filter: string = '';
  private maxEntries: number;
  private highlightElements: boolean = true;

  constructor(maxEntries = MAX_LOG_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  /**
   * Called by the Tracker when an event is tracked.
   */
  onEvent(event: EventDTO): void {
    this.events.unshift({ event, time: Date.now() });
    if (this.events.length > this.maxEntries) {
      this.events.pop();
    }
    this.render();
  }

  /**
   * Mount the DevTools floating button and panel to the DOM.
   */
  mount(): void {
    if (document.getElementById(PANEL_ID)) return;

    const style = this.createStyles();
    document.head.appendChild(style);

    const panel = this.createPanel();
    document.body.appendChild(panel);
    this.panel = panel;

    const button = this.createFloatingButton();
    document.body.appendChild(button);
  }

  /**
   * Remove DevTools from the DOM.
   */
  unmount(): void {
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.remove();
    const button = document.getElementById('gf-devtools-btn');
    if (button) button.remove();
    const style = document.getElementById('gf-devtools-style');
    if (style) style.remove();
    this.panel = null;
  }

  toggleHighlight(): void {
    this.highlightElements = !this.highlightElements;
    if (!this.highlightElements) {
      this.clearHighlights();
    }
    this.render();
  }

  // ===================================================================
  // DOM Construction
  // ===================================================================

  private createStyles(): HTMLStyleElement {
    const style = document.createElement('style');
    style.id = 'gf-devtools-style';
    style.textContent = `
      #gf-devtools-btn {
        position: fixed; bottom: 20px; right: 20px; z-index: 99999;
        width: 44px; height: 44px; border-radius: 22px;
        background: #1a1a2e; color: #00d4ff; border: 2px solid #00d4ff;
        font-size: 18px; cursor: pointer; display: flex;
        align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: monospace; transition: transform 0.2s;
      }
      #gf-devtools-btn:hover { transform: scale(1.1); }
      #gf-devtools-btn.warn { border-color: #f59e0b; color: #f59e0b; }

      #gf-devtools-panel {
        position: fixed; top: 0; right: 0; z-index: 99998;
        width: 420px; height: 100vh;
        background: #0f0f1a; color: #e0e0e0;
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 12px; overflow-y: auto;
        border-left: 1px solid #2a2a4a;
        box-shadow: -4px 0 20px rgba(0,0,0,0.5);
        display: none;
      }
      #gf-devtools-panel.open { display: flex; flex-direction: column; }

      .gf-header {
        padding: 12px 16px; background: #1a1a2e;
        border-bottom: 1px solid #2a2a4a;
        display: flex; justify-content: space-between; align-items: center;
        position: sticky; top: 0; z-index: 1;
      }
      .gf-header h3 { margin: 0; color: #00d4ff; font-size: 14px; }
      .gf-header button {
        background: none; border: none; color: #888; cursor: pointer;
        font-size: 18px; padding: 0 4px;
      }
      .gf-header button:hover { color: #fff; }

      .gf-stats {
        display: flex; gap: 12px; padding: 8px 16px;
        background: #141428; border-bottom: 1px solid #2a2a4a;
        font-size: 11px;
      }
      .gf-stat { text-align: center; }
      .gf-stat .val { color: #00d4ff; font-size: 16px; font-weight: bold; }
      .gf-stat .label { color: #666; }

      .gf-toolbar {
        display: flex; gap: 8px; padding: 8px 16px;
        border-bottom: 1px solid #2a2a4a;
      }
      .gf-toolbar select, .gf-toolbar button {
        background: #1a1a2e; color: #ccc; border: 1px solid #333;
        border-radius: 4px; padding: 4px 8px; font-size: 11px;
        cursor: pointer; font-family: monospace;
      }
      .gf-toolbar button:hover { border-color: #00d4ff; color: #00d4ff; }
      .gf-toolbar button.active { background: #00d4ff22; border-color: #00d4ff; }

      .gf-event-list { flex: 1; overflow-y: auto; padding: 0; }

      .gf-event {
        padding: 8px 16px; border-bottom: 1px solid #1a1a2e;
        cursor: pointer; transition: background 0.15s;
      }
      .gf-event:hover { background: #1a1a2e; }
      .gf-event.expanded { background: #1a1a2e; }

      .gf-event-header {
        display: flex; align-items: center; gap: 8px;
      }
      .gf-event-type {
        padding: 2px 6px; border-radius: 3px; font-size: 10px;
        font-weight: bold; text-transform: uppercase;
      }
      .gf-event-type.page_view { background: #3b82f6; color: #fff; }
      .gf-event-type.click { background: #10b981; color: #fff; }
      .gf-event-type.exposure { background: #f59e0b; color: #000; }
      .gf-event-type.scroll { background: #8b5cf6; color: #fff; }
      .gf-event-type.stay { background: #ec4899; color: #fff; }
      .gf-event-type.error { background: #ef4444; color: #fff; }
      .gf-event-type.custom { background: #6b7280; color: #fff; }

      .gf-event-time { color: #666; font-size: 10px; }
      .gf-event-warn { color: #f59e0b; font-size: 10px; margin-left: auto; }
      .gf-event-error { color: #ef4444; font-size: 10px; margin-left: auto; }

      .gf-event-detail {
        display: none; margin-top: 8px; padding: 8px;
        background: #0a0a14; border-radius: 4px;
        overflow-x: auto;
      }
      .gf-event.expanded .gf-event-detail { display: block; }
      .gf-event-detail pre {
        margin: 0; color: #a0a0b0; font-size: 11px;
        white-space: pre-wrap; word-break: break-all;
      }

      .gf-empty { padding: 24px; text-align: center; color: #555; }

      .gf-highlight-tracked {
        outline: 2px dashed #00d4ff66 !important;
        outline-offset: 2px;
      }
      .gf-highlight-exposure {
        outline: 2px dashed #f59e0b66 !important;
        outline-offset: 2px;
      }
    `;
    return style;
  }

  private createFloatingButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = 'gf-devtools-btn';
    btn.textContent = 'T';
    btn.title = 'GateFlow Tracker DevTools';
    btn.addEventListener('click', () => this.toggle());
    return btn;
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="gf-header">
        <h3>GateFlow Tracker</h3>
        <div>
          <button id="gf-btn-close" title="Close">&times;</button>
        </div>
      </div>
      <div class="gf-stats" id="gf-stats">
        <div class="gf-stat"><div class="val" id="gf-stat-total">0</div><div class="label">Events</div></div>
        <div class="gf-stat"><div class="val" id="gf-stat-queue">0</div><div class="label">Queue</div></div>
        <div class="gf-stat"><div class="val" id="gf-stat-warn">0</div><div class="label">Warnings</div></div>
      </div>
      <div class="gf-toolbar">
        <select id="gf-filter">
          <option value="">All Events</option>
          <option value="page_view">page_view</option>
          <option value="click">click</option>
          <option value="exposure">exposure</option>
          <option value="scroll">scroll</option>
          <option value="stay">stay</option>
          <option value="error">error</option>
          <option value="custom">custom</option>
        </select>
        <button id="gf-btn-highlight" class="active" title="Toggle element highlighting">Highlight</button>
        <button id="gf-btn-copy" title="Copy events as JSON">Copy JSON</button>
        <button id="gf-btn-clear" title="Clear event log">Clear</button>
      </div>
      <div class="gf-event-list" id="gf-event-list">
        <div class="gf-empty">Waiting for events...</div>
      </div>
    `;

    // Event listeners
    panel.querySelector('#gf-btn-close')!.addEventListener('click', () => this.close());
    panel.querySelector('#gf-filter')!.addEventListener('change', (e) => {
      this.filter = (e.target as HTMLSelectElement).value;
      this.render();
    });
    panel
      .querySelector('#gf-btn-highlight')!
      .addEventListener('click', () => {
        (panel.querySelector('#gf-btn-highlight') as HTMLButtonElement).classList.toggle('active');
        this.toggleHighlight();
      });
    panel.querySelector('#gf-btn-copy')!.addEventListener('click', () => this.copyEvents());
    panel.querySelector('#gf-btn-clear')!.addEventListener('click', () => {
      this.events = [];
      this.render();
    });

    return panel;
  }

  // ===================================================================
  // Render
  // ===================================================================

  private render(): void {
    if (!this.panel || !this.isOpen) return;

    const filtered = this.filter
      ? this.events.filter((e) => e.event.eventType === this.filter)
      : this.events;

    // Stats
    const totalEl = document.getElementById('gf-stat-total');
    if (totalEl) totalEl.textContent = String(this.events.length);

    const warnCount = this.events.filter((e) => {
      const v = validateEvent(e.event);
      return v.warnings.length > 0;
    }).length;
    const warnEl = document.getElementById('gf-stat-warn');
    if (warnEl) warnEl.textContent = String(warnCount);

    // Event list
    const listEl = document.getElementById('gf-event-list');
    if (!listEl) return;

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="gf-empty">No events captured yet</div>';
      return;
    }

    listEl.innerHTML = filtered
      .map((entry, i) => this.renderEvent(entry, i))
      .join('');

    // Attach click handlers
    listEl.querySelectorAll('.gf-event').forEach((el) => {
      el.addEventListener('click', () => {
        el.classList.toggle('expanded');
      });
    });

    // Highlight tracked elements
    if (this.highlightElements) {
      this.applyHighlights();
    }
  }

  private renderEvent(entry: LogEntry, _index: number): string {
    const { event } = entry;
    const v = validateEvent(event);
    const time = new Date(event.timestamp).toLocaleTimeString();
    const hasIssues = v.warnings.length > 0 || v.errors.length > 0;

    const typeClass = event.eventType.includes('session') ? 'custom' : event.eventType;

    let summary = '';
    if (event.eventType === 'page_view') summary = event.page?.url || '';
    else if (event.eventType === 'click') summary = event.data?.elementText || event.data?.elementId || '';
    else if (event.eventType === 'exposure') summary = event.data?.elementId || '';
    else if (event.eventType === 'error') summary = event.data?.errorMessage?.slice(0, 80) || '';
    else if (event.eventType === 'scroll') summary = `Depth: ${event.data?.scrollDepth}%`;
    else if (event.eventType === 'stay') summary = `${event.data?.stayDuration}s`;
    else if (event.eventType === 'custom') summary = event.data?.tagName || '';

    const issueIcon = v.errors.length > 0
      ? '<span class="gf-event-error">!</span>'
      : v.warnings.length > 0
        ? '<span class="gf-event-warn">!</span>'
        : '';

    return `
      <div class="gf-event">
        <div class="gf-event-header">
          <span class="gf-event-type ${typeClass}">${event.eventType}</span>
          <span class="gf-event-time">${time}</span>
          ${issueIcon}
          <span style="color:#888;font-size:10px;margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px">${this.escapeHtml(summary)}</span>
        </div>
        <div class="gf-event-detail">
          <pre>${this.escapeHtml(JSON.stringify(event, null, 2))}</pre>
          ${v.errors.length > 0 ? `<div style="color:#ef4444;margin-top:4px">Errors: ${v.errors.join(', ')}</div>` : ''}
          ${v.warnings.length > 0 ? `<div style="color:#f59e0b;margin-top:4px">Warnings: ${v.warnings.join(', ')}</div>` : ''}
        </div>
      </div>
    `;
  }

  private applyHighlights(): void {
    // Highlight click-tracked elements
    document.querySelectorAll('[data-track]').forEach((el) => {
      (el as HTMLElement).classList.add('gf-highlight-tracked');
    });
    // Highlight exposure-tracked elements
    document.querySelectorAll('[data-exposure]').forEach((el) => {
      (el as HTMLElement).classList.add('gf-highlight-exposure');
    });
  }

  private clearHighlights(): void {
    document.querySelectorAll('.gf-highlight-tracked').forEach((el) => {
      el.classList.remove('gf-highlight-tracked');
    });
    document.querySelectorAll('.gf-highlight-exposure').forEach((el) => {
      el.classList.remove('gf-highlight-exposure');
    });
  }

  // ===================================================================
  // Controls
  // ===================================================================

  private toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  private open(): void {
    if (!this.panel) return;
    this.isOpen = true;
    this.panel.classList.add('open');
    const btn = document.getElementById('gf-devtools-btn');
    if (btn) btn.textContent = '✕';
    this.render();
  }

  private close(): void {
    if (!this.panel) return;
    this.isOpen = false;
    this.panel.classList.remove('open');
    const btn = document.getElementById('gf-devtools-btn');
    if (btn) btn.textContent = 'T';
    this.clearHighlights();
  }

  private copyEvents(): void {
    const events = this.events.map((e) => e.event);
    navigator.clipboard.writeText(JSON.stringify(events, null, 2)).then(() => {
      const btn = document.getElementById('gf-btn-copy');
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = 'Copy JSON';
        }, 1500);
      }
    });
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
