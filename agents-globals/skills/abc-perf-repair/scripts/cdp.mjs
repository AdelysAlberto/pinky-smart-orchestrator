// Minimal Chrome DevTools Protocol client used by the audit harness in this directory.
// Node 22+ only (relies on the built-in WebSocket and fetch).
export const CDP_HTTP = process.env.CDP_HTTP || "http://127.0.0.1:9222";
export const TARGET_URL = process.env.TARGET_URL || "http://127.0.0.1:4173/";

export const DEVICES = {
  desktop: {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false},
  mobile: {width: 390, height: 844, deviceScaleFactor: 3, mobile: true},
};

export const USER_AGENTS = {
  desktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  mobile:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
};

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.sequence = 0;
    this.pending = new Map();
    this.listeners = [];
    socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const {resolve, reject} = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
        return;
      }
      if (message.method) for (const listener of this.listeners) listener(message);
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.sequence;
    const payload = {id, method, params};
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
      this.socket.send(JSON.stringify(payload));
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 45_000);
    });
  }

  on(listener) {
    this.listeners.push(listener);
  }
}

/**
 * Opens a fresh page target and returns the session-scoped helpers every scenario needs.
 *
 * `authToken` mirrors what js-cookie writes in src/store/util.store.js: the token is
 * JSON.stringify'd and then URL-encoded, so the wire value is `%22<token>%22`. Setting the bare
 * JSON string instead makes Cookies.get + JSON.parse fail and the app stays anonymous.
 * @param {{mode: "desktop"|"mobile", bypassServiceWorker?: boolean, authToken?: string}} options
 */
export const openSession = async ({mode, bypassServiceWorker = true, authToken = process.env.AUTH_TOKEN}) => {
  const version = await (await fetch(`${CDP_HTTP}/json/version`)).json();
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, {once: true});
    socket.addEventListener("error", reject, {once: true});
  });

  const cdp = new Cdp(socket);
  const {targetId} = await cdp.send("Target.createTarget", {url: "about:blank"});
  const {sessionId} = await cdp.send("Target.attachToTarget", {targetId, flatten: true});
  const send = (method, params) => cdp.send(method, params, sessionId);

  await send("Page.enable");
  await send("Network.enable", {maxTotalBufferSize: 300_000_000, maxResourceBufferSize: 50_000_000});
  await send("Performance.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Emulation.setDeviceMetricsOverride", DEVICES[mode]);
  await send("Emulation.setUserAgentOverride", {
    userAgent: USER_AGENTS[mode],
    acceptLanguage: "es-VE,es;q=0.9,en;q=0.8",
    platform: mode === "mobile" ? "iPhone" : "MacIntel",
  });
  if (bypassServiceWorker) await send("Network.setBypassServiceWorker", {bypass: true});

  if (authToken) {
    await send("Network.setCookie", {
      name: "token",
      value: encodeURIComponent(JSON.stringify(authToken)),
      url: new URL(TARGET_URL).origin + "/",
      path: "/",
      secure: true,
      sameSite: "Strict",
    });
  }

  return {
    cdp,
    send,
    on: listener => cdp.on(listener),
    targetId,
    evaluate: async expression =>
      (await send("Runtime.evaluate", {expression, returnByValue: true, awaitPromise: true})).result?.value,
    metrics: async () =>
      Object.fromEntries((await send("Performance.getMetrics")).metrics.map(metric => [metric.name, metric.value])),
    close: async () => {
      await fetch(`${CDP_HTTP}/json/close/${targetId}`).catch(() => {});
      socket.close();
    },
  };
};
