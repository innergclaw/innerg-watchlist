import {mkdir,copyFile,rm} from 'node:fs/promises';
await rm('.public-site',{recursive:true,force:true});
await mkdir('.public-site/data',{recursive:true});
await mkdir('.public-site/assets',{recursive:true});
for(const file of ['index.html','styles.css','app.js','display.mjs','interactive-charts.mjs','weekly-mover.mjs','member-access.mjs','brief.mjs','news.mjs','section-nav.mjs','closing-report.mjs','.nojekyll'])await copyFile(file,`.public-site/${file}`);
await copyFile('data/watchlist.json','.public-site/data/watchlist.json');
await copyFile('data/closing-report.json','.public-site/data/closing-report.json');
await copyFile('assets/innerg-closing-bell.png','.public-site/assets/innerg-closing-bell.png');
