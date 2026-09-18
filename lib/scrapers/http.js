const axios = require('axios');

const COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
};

// Plain client (no cookie jar) — used for one-off/proxy requests like image downloads.
const client = axios.create({ timeout: 15000, headers: COMMON_HEADERS });

// Creates an axios instance that remembers cookies across requests (a GET to
// fetch a CSRF token, then a following POST that needs it echoed back).
// Deliberately hand-rolled instead of using axios-cookiejar-support: that
// package ships ESM-only, and `require()`-ing it crashes on Vercel's Node
// runtime (ERR_REQUIRE_ESM) even though it happened to resolve locally.
function createSessionClient() {
  const cookies = new Map();
  const instance = axios.create({ timeout: 15000, headers: COMMON_HEADERS });

  instance.interceptors.request.use((config) => {
    if (cookies.size > 0) {
      config.headers = config.headers || {};
      config.headers.Cookie = Array.from(cookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    }
    return config;
  });

  instance.interceptors.response.use((response) => {
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      const list = Array.isArray(setCookie) ? setCookie : [setCookie];
      list.forEach((str) => {
        const [pair] = str.split(';');
        const idx = pair.indexOf('=');
        if (idx > -1) cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
      });
    }
    return response;
  });

  // Minimal stand-in for tough-cookie's CookieJar#getCookies, just enough
  // for callers that read a specific cookie value (e.g. XSRF-TOKEN).
  const jar = {
    getCookies: async () => Array.from(cookies.entries()).map(([key, value]) => ({ key, value })),
  };

  return { instance, jar };
}

module.exports = { client, createSessionClient };
