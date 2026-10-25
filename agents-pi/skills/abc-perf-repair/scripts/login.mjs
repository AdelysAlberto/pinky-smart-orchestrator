// Authenticates through the real UI (navbar → login modal → antd form), verifies that the app
// reached the authenticated state, and stores the resulting token cookie outside the repository so
// the other scenarios can reuse the session without repeating the login.
// Usage: RYG_USER=... RYG_PASS=... node login.mjs [outfile]
import {writeFile} from "node:fs/promises";
import {openSession, sleep, TARGET_URL} from "./cdp.mjs";

const OUT = process.argv[2] || "/tmp/ryg-token.txt";
const USER = process.env.RYG_USER;
const PASS = process.env.RYG_PASS;

if (!USER || !PASS) {
  console.error("RYG_USER and RYG_PASS are required");
  process.exit(1);
}

const {send, evaluate, close} = await openSession({mode: "desktop"});
// Start from a clean jar so a previous run cannot leave the browser already authenticated.
await send("Network.clearBrowserCookies");
await send("Page.navigate", {url: TARGET_URL});
await sleep(10_000);

const opened = await evaluate(`(() => {
  const button = [...document.querySelectorAll("button")]
    .find(candidate => /^iniciar sesión$/i.test((candidate.textContent || "").trim()) && candidate.offsetParent !== null);
  if (!button) return false;
  button.click();
  return true;
})()`);

if (!opened) {
  console.error("login trigger not found in the navbar");
  await close();
  process.exit(1);
}

await sleep(2500);

// React 18 controlled inputs ignore a plain value assignment; go through the native setter.
const filled = await evaluate(`(() => {
  const setValue = (element, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(element, value);
    element.dispatchEvent(new Event("input", {bubbles: true}));
    element.dispatchEvent(new Event("change", {bubbles: true}));
  };
  const username = document.querySelector("#basic_username");
  const password = document.querySelector("#basic_password");
  if (!username || !password) return false;
  setValue(username, ${JSON.stringify(USER)});
  setValue(password, ${JSON.stringify(PASS)});
  return true;
})()`);

if (!filled) {
  console.error("login form inputs not found");
  await close();
  process.exit(1);
}

await sleep(600);

const submitted = await evaluate(`(() => {
  const submit = [...document.querySelectorAll("form button[type=submit]")]
    .find(button => button.offsetParent !== null);
  if (!submit) return false;
  submit.click();
  return true;
})()`);

if (!submitted) {
  console.error("submit button not found");
  await close();
  process.exit(1);
}

// Poll for the authenticated state. The modal's own labels include "Iniciar sesión" and
// "Registrarse", so UI text is not a reliable signal: wait for the session-only endpoints instead.
let authenticated = false;
let lastProbe = null;
for (let attempt = 0; attempt < 20; attempt++) {
  await sleep(1500);
  lastProbe = await evaluate(`(() => {
    const resources = performance.getEntriesByType("resource").map(entry => entry.name);
    const cookie = document.cookie.split("; ").find(entry => entry.startsWith("token="));
    return {
      hasTokenCookie: !!cookie,
      sessionRequests: resources.filter(name => name.includes("/v1/user/") || name.includes("userWallet") || name.includes("wallet.")).length,
      aliasInDom: /adalbeca/i.test(document.body.innerText.slice(0, 20000)),
    };
  })()`);
  if (lastProbe.hasTokenCookie && lastProbe.sessionRequests > 0) {
    authenticated = true;
    break;
  }
}

if (!authenticated) {
  console.error(`login did not complete: ${JSON.stringify(lastProbe)}`);
  await close();
  process.exit(1);
}

const cookies = await send("Network.getAllCookies");
const tokenCookie = cookies.cookies.find(cookie => cookie.name === "token" && cookie.domain === "127.0.0.1");
if (!tokenCookie) {
  console.error("token cookie missing after login");
  await close();
  process.exit(1);
}

const token = JSON.parse(decodeURIComponent(tokenCookie.value));
await writeFile(OUT, token, {mode: 0o600});

const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
console.log(JSON.stringify({
  tokenWrittenTo: OUT,
  tokenLength: token.length,
  expiresAt: new Date(claims.exp * 1000).toISOString(),
  proof: lastProbe,
}, null, 1));

await close();
process.exit(0);
