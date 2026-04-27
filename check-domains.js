import https from 'https';
import http from 'http';

function fetchUrl(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { rejectUnauthorized: false }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(body));
    }).on('error', (e) => resolve(''));
  });
}

async function checkSite(domain) {
  const html = await fetchUrl('https://' + domain);
  const jsMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (jsMatch) {
    const jsUrl = 'https://' + domain + jsMatch[1];
    const jsBody = await fetchUrl(jsUrl);
    const supaUrl = jsBody.match(/https:\/\/[a-z0-9]+\.supabase\.co/g);
    const supaKey = jsBody.match(/sb_publishable_[a-zA-Z0-9_-]+/g);
    console.log(domain, '->', [...new Set(supaUrl)], '|', [...new Set(supaKey)]);
  } else {
    console.log(domain, '-> No JS chunk found');
  }
}

async function run() {
  await checkSite('www.insaathesapp.com');
  await checkSite('insaathesapp.com');
}

run();