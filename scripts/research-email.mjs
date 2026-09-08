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
    subject:`INNERG Market Pulse | ${edition.date}`,
    body:`INNERG INTEL\nYour daily research note · ${edition.date}\n\nNEWS / WHAT TO WATCH\n${stories||'No new report met our source checks today. No forced picks.'}\n\nDAILY BRIEF\n${edition.dailyBrief}\n\nFROM THE BUILDER'S DESK\nLast week\n${edition.lastWeek}\n\nUpcoming week focus\n${edition.nextWeek}\n\nOPEN YOUR RESEARCH DESK\nhttps://innergclaw.github.io/innerg-watchlist/#member-access\n\nResearch and education, not financial advice. Prices can fall. No return is guaranteed.\n\nYou receive this because you enabled daily research emails. To stop, sign in and turn off daily emails here:\nhttps://innergclaw.github.io/innerg-watchlist/#member-access\n\nINNERG INTEL`
  };
}
