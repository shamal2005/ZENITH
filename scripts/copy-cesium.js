import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('node_modules/cesium/Build/Cesium');
const destDir = path.resolve('public/cesium');

const foldersToCopy = ['Workers', 'Assets', 'ThirdParty', 'Widgets'];

console.log('Copying Cesium assets from:', srcDir);
console.log('To:', destDir);

// Ensure destination exists
fs.mkdirSync(destDir, { recursive: true });

foldersToCopy.forEach(folder => {
  const src = path.join(srcDir, folder);
  const dest = path.join(destDir, folder);
  
  if (fs.existsSync(src)) {
    console.log(`Copying ${folder}...`);
    fs.cpSync(src, dest, { recursive: true, force: true });
  } else {
    console.warn(`Source folder not found: ${src}`);
  }
});

console.log('Cesium copy completed successfully.');
