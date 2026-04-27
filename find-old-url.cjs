const url = 'https://www.insaathesapp.com/assets/index-CZwdbbWY.js';
fetch(url).then(r => r.text()).then(text => {
  const matches = text.match(/https:\/\/[a-z0-9]+\.supabase\.co/g);
  if (matches) {
    const unique = [...new Set(matches)];
    console.log('Found Supabase URLs in www JS:', unique);
  } else {
    console.log('No Supabase URLs found in www JS');
  }
});
