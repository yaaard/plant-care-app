type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeToLocalDataChanges(listener: Listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function emitLocalDataChanged() {
  for (const listener of listeners) {
    listener();
  }
}
