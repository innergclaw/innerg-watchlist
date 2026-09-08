import {mkdir,copyFile,rm} from 'node:fs/promises';
await rm('.public-site',{recursive:true,force:true});
await mkdir('.public-site/data',{recursive:true});
for(const file of ['index.html','styles.css','app.js','display.mjs','interactive-charts.mjs','weekly-mover.mjs','member-access.mjs','brief.mjs','news.mjs','section-nav.mjs','.nojekyll'])await copyFile(file,`.public-site/${file}`);
await copyFile('data/watchlist.json','.public-site/data/watchlist.json');
