type Listener = (value: number) => void;

const listeners = new Set<Listener>();
let current = 1;

export const getMultiplier = (): number => current;

export const setMultiplier = (value: number): void => {
  if (value === current) return;
  current = value;
  for (const listener of listeners) listener(value);
};

export const subscribeMultiplier = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
};
