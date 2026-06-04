export { Tracker } from './tracker/Tracker';
export type { EventCallback } from './tracker/Tracker';

export type {
  TrackerConfig,
  AutoTrackConfig,
  ExperimentTag,
  EventDTO,
  EventData,
  EventType,
  PageData,
  SessionData,
  DeviceData,
  ContextData,
  PageViewConfig,
  ClickConfig,
  ExposureConfig,
  ScrollConfig,
  StayConfig,
  ErrorConfig,
  BatchConfig,
  OfflineConfig,
  DebugConfig,
  GateFlowConfig,
} from './types/EventTypes';

// Individual collectors for advanced usage
export { PageCollector } from './collectors/PageCollector';
export { ClickCollector } from './collectors/ClickCollector';
export { ExposureCollector } from './collectors/ExposureCollector';
export { ScrollCollector } from './collectors/ScrollCollector';
export { SessionCollector } from './collectors/SessionCollector';
export { StayCollector } from './collectors/StayCollector';
export { ErrorCollector } from './collectors/ErrorCollector';

// Queue and sender for custom pipeline integration
export { EventQueue } from './queue/EventQueue';
export { Sender } from './sender/Sender';

// GateFlow integration
export { GateFlowIntegration } from './integration/GateFlowIntegration';
