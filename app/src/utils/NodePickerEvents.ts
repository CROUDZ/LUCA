/**
 * Lightweight pub/sub to avoid passing functions through React Navigation params.
 * NodeEditor will subscribe to 'add' events; NodePicker will emit them.
 */
type Handler = (nodeType: string) => void;

const handlers = new Set<Handler>();

export function subscribeNodeAdded(handler: Handler) {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function emitNodeAdded(nodeType: string) {
  handlers.forEach((h) => {
    try {
      h(nodeType);
    } catch (err) {
      // keep behavior predictable
      // Use the project's console to avoid direct console usage
      // We don't import a default console here to keep this util minimal
      // but still output errors in development
      console.error('Error in NodePicker handler', err);
    }
  });
}

export default {
  subscribeNodeAdded,
  emitNodeAdded,
};
