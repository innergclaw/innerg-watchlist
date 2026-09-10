// The scheduled editorial run supplies verified text. Never derive advice from a headline alone.
export function researchEmail(edition) {
  const required=['date','dailyBrief','lastWeek','nextWeek'];
  for(const key of required)if(typeof edition[key]!=='string'||!edition[key].trim())throw Error(`Missing ${key}`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(edition.date))throw Error('Invalid date');
  if(!Array.isArray(edition.news)||edition.news.length>5)throw Error('Choose up to five stories');
  for(const item of edition.news){
    for(const key of ['symbol','date','summary','watch','risk','url'])if(typeof item[key]!=='string'||!item[key].trim())throw Error(`Missing story ${key}`);
    const u=new URL(item.url);if(u.protocol!=='https:'||u.username||u.password)throw Error('Unsafe source');
  }
  const stories=edition.news.map(n=>`${n.symbol} · ${n.date}\n${n.summary}\nWhat to watch: ${n.watch}\nRisk: ${n.risk}\nSource: ${n.url}`).join('\n\n');
  return {
    subject:`innerg market pulse · what to watch for · ${edition.date}`,
    body:`innerg intel\nyour daily research note · ${edition.date}\n\nnews / what to watch for\n${stories||'no new report met our source checks today. no forced picks.'}\n\ndaily brief\n${edition.dailyBrief}\n\nfrom the builder's desk\nlast week\n${edition.lastWeek}\n\nupcoming week focus\n${edition.nextWeek}\n\nopen your research desk\nhttps://nasirr.innergintel.org/watchlist/#what-to-watch\n\nresearch and education, not financial advice. prices can fall. no return is guaranteed.\n\nyou receive this because you enabled daily research emails. to stop, sign in and turn off daily emails here:\nhttps://nasirr.innergintel.org/watchlist/#member-access\n\ninnerg intel`
  };
}
