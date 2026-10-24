/* Package the unmodified CC0 source maps for offline file:// loading. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const source=path.dirname(fileURLToPath(import.meta.url));
const studio=path.join(source,'../14. SAVAGE - Gaming Gear/assets/studio');
const base64=name=>fs.readFileSync(path.join(studio,name)).toString('base64');
const packed={
  hdri:base64('studio-small-08-1k.hdr'),
  leatherNormal:'data:image/png;base64,'+base64('leather-fine-normal-1k.png'),
  leatherRough:'data:image/png;base64,'+base64('leather-fine-roughness-1k.png')
};
fs.writeFileSync(path.join(studio,'studio-assets.js'),'/* Poly Haven CC0 Studio Small 08 and Leather Red 02. See CREDITS.md. Offline data package. */\nwindow.SAVAGE_STUDIO_ASSETS='+JSON.stringify(packed)+';\n');
