const https = require('https');

https.get('https://www.insaathesapp.com', (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const match = body.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (match) {
      const jsUrl = 'https://www.insaathesapp.com' + match[1];
      console.log('JS Chunk URL:', jsUrl);
      https.get(jsUrl, (res2) => {
        let jsBody = '';
        res2.on('data', d => jsBody += d);
        res2.on('end', () => {
          const supabaseUrlMatch = jsBody.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
          const anonKeyMatch = jsBody.match(/sb_publishable_[a-zA-Z0-9_-]+/);
          console.log('OLD URL:', supabaseUrlMatch ? supabaseUrlMatch[0] : 'Not found');
          console.log('OLD KEY:', anonKeyMatch ? anonKeyMatch[0] : 'Not found');
        });
      });
    } else {
      console.log('No JS chunk found in www');
    }
  });
});

https.get('https://insaathesapp.com', (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const match = body.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (match) {
      const jsUrl = 'https://insaathesapp.com' + match[1];
      console.log('JS Chunk URL:', jsUrl);
      https.get(jsUrl, (res2) => {
        let jsBody = '';
        res2.on('data', d => jsBody += d);
        res2.on('end', () => {
          const supabaseUrlMatch = jsBody.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
          const anonKeyMatch = jsBody.match(/sb_publishable_[a-zA-Z0-9_-]+/);
          console.log('NEW URL:', supabaseUrlMatch ? supabaseUrlMatch[0] : 'Not found');
          console.log('NEW KEY:', anonKeyMatch ? anonKeyMatch[0] : 'Not found');
        });
      });
    } else {
      console.log('No JS chunk found in non-www');
    }
  });
});
