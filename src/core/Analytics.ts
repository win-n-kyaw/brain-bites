// Anonymous analytics (design doc §9): a random device ID, never the nickname.
// Events go to a pluggable transport; until a tool (e.g. PostHog or Plausible) is chosen,
// dev builds log them to the console and production builds drop them.

export type EventProps = Record<string, string | number | boolean | null | undefined>;
export type Transport = (event: { name: string; deviceId: string; at: string; props: EventProps }) => void;

const DEVICE_KEY = 'brain-bites.device';

export class Analytics {
  private transport: Transport = import.meta.env.DEV
    ? (e) => console.debug(`[analytics] ${e.name}`, e.props)
    : () => {};

  setTransport(transport: Transport) {
    this.transport = transport;
  }

  track(name: string, props: EventProps = {}) {
    try {
      this.transport({ name, deviceId: deviceId(), at: new Date().toISOString(), props });
    } catch (err) {
      console.warn('[analytics] transport failed', err);
    }
  }
}

function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
}
