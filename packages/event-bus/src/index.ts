import { EventEmitter } from 'events';

export type EventType =
  | 'message:received'
  | 'task:created'
  | 'task:updated'
  | 'task:completed'
  | 'risk:identified'
  | 'decision:made'
  | 'conflict:detected'
  | 'nudge:scheduled'
  | 'nudge:send'
  | 'report:generated'
  | 'report:scheduled'
  | 'tracker:check-deadlines';

export interface EventPayload {
  eventType: EventType;
  timestamp: number;
  source: string; // 'parser-agent', 'tracker-agent', 'scheduler', etc.
  data: any;
}

/**
 * EventBus - Centralized event system for agent communication
 *
 * Singleton pattern ensures all agents share the same event bus instance.
 * Agents can publish events and subscribe to events from other agents.
 */
export class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    this.setMaxListeners(50); // Support many agents
    console.log('📢 EventBus initialized');
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Publish an event to the bus
   * @param eventType - Type of event
   * @param source - Source agent/service
   * @param data - Event payload
   */
  publish(eventType: EventType, source: string, data: any): void {
    const payload: EventPayload = {
      eventType,
      timestamp: Date.now(),
      source,
      data
    };

    console.log(`📢 [EventBus] ${eventType} from ${source}`);
    this.emit(eventType, payload);
    this.emit('*', payload); // Wildcard listener for debugging
  }

  /**
   * Subscribe to an event
   * @param eventType - Type of event or '*' for all events
   * @param handler - Handler function
   */
  subscribe(eventType: EventType | '*', handler: (payload: EventPayload) => void): void {
    this.on(eventType, handler);
    console.log(`👂 [EventBus] Subscribed to: ${eventType}`);
  }

  /**
   * Unsubscribe from an event
   * @param eventType - Type of event
   * @param handler - Handler function
   */
  unsubscribe(eventType: EventType | '*', handler: (payload: EventPayload) => void): void {
    this.off(eventType, handler);
    console.log(`🔇 [EventBus] Unsubscribed from: ${eventType}`);
  }

  /**
   * Get count of listeners for an event
   */
  getListenerCount(eventType: EventType): number {
    return this.listenerCount(eventType);
  }

  /**
   * Clear all listeners (useful for testing)
   */
  clearAll(): void {
    this.removeAllListeners();
    console.log('🧹 [EventBus] All listeners cleared');
  }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();
