'use strict';
const form=document.querySelector('#controls'),preview=document.querySelector('#preview'),sheet=document.querySelector('#sheet');
let dir=0,frame=0,playing=true,last=0;
const defaults={build:'standard',skin:'#dca477',eyes:'#315466',hair:'swept',hairColor:'#543a34',outfit:'tunic',cloth:'#4a8e79',trim:'#e5be70',hat:'none',weapon:'none',cape:false,capeColor:'#a54d5b'};
function state(){return Object.fromEntries(Object.keys(defaults).map(k=>[k,form.elements[k].type==='checkbox'?form.elements[k].checked:form.elements[k].value]));}
function shade(hex,n){return '#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');}
function draw(ctx,s,d,f,ox=0,oy=0){
ctx.save();ctx.translate(ox,oy);if(d===1){ctx.translate(48,0);ctx.scale(-1,1);}const side=d===1||d===3,back=d===2,bob=f%2,step=[0,2,0,-2][f],w=s.build==='broad'?2:s.build==='slim'?-1:0;
const outline='#20202c',boot='#493b3c',metal='#8297aa',cloth=s.outfit==='armor'?metal:s.cloth;
const r=(x,y,a,b,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,a,b);};
const box=(x,y,a,b,c)=>{r(x,y,a,b,outline);if(a>2&&b>2)r(x+1,y+1,a-2,b-2,c);};
// Integer coordinates keep each layer aligned to the same native pixel grid.
if(s.cape){box(16-w,22+bob,16+w*2,17,s.capeColor);r(18-w,25+bob,3,11,shade(s.capeColor,-25));r(28+w,25+bob,2,12,shade(s.capeColor,18));}
if(side){box(22,33,5,9-step,boot);box(25,33,5,9+step,boot);r(27,39+step,5,3,boot);}else{box(18-w,33,6,9+step,boot);box(25,33,6+w,9-step,boot);r(18-w,39+step,5,1,'#857064');r(26,39-step,4+w,1,'#857064');}
box(side?21:16-w,23+bob,side?10:18+w*2,13,cloth);r(side?22:17-w,24+bob,side?3:5,9,shade(cloth,22));r(side?28:29+w,24+bob,side?2:4,10,shade(cloth,-24));
if(s.outfit==='robe'){box(side?20:16-w,31+bob,side?13:18+w*2,9,s.cloth);r(side?22:18-w,32+bob,2,6,shade(s.cloth,22));r(side?21:17-w,37+bob,side?11:16+w*2,2,s.trim);}
if(!back){r(side?22:22,24+bob,side?2:5,3,s.trim);r(side?23:24,27+bob,1,6,shade(cloth,-35));}
r(side?21:17-w,33+bob,side?10:16+w*2,2,boot);if(!back)r(side?27:23,33+bob,3,2,s.trim);
if(s.outfit==='armor'){r(side?22:18-w,27+bob,side?6:13+w*2,1,'#bfced8');r(side?22:18-w,30+bob,side?6:13+w*2,1,'#526578');}
if(side){box(23,25+bob,6,9,cloth);box(24,32+bob-step,4,5,s.skin);}else{box(12-w,24+bob+step,5,9,cloth);box(32+w,24+bob-step,5,9,cloth);box(12-w,31+bob+step,5,5,s.skin);box(32+w,31+bob-step,5,5,s.skin);}
// Neck, ears, face and hair.
box(21,20+bob,7,5,s.skin);
box(side?20:17,10+bob,side?12:15,13,s.skin);r(side?21:18,12+bob,3,8,shade(s.skin,18));r(side?29:29,13+bob,2,8,shade(s.skin,-22));
if(!side){r(15,15+bob,2,5,s.skin);r(32,15+bob,2,5,s.skin);}else r(31,16+bob,2,3,s.skin);
if(!back){if(side){r(28,15+bob,2,2,outline);r(29,15+bob,1,1,s.eyes);}else{r(20,15+bob,2,2,outline);r(27,15+bob,2,2,outline);r(20,15+bob,1,1,s.eyes);r(27,15+bob,1,1,s.eyes);}r(side?29:23,20+bob,side?2:3,1,shade(s.skin,-45));}
if(s.hair!=='bald'){
const hc=s.hairColor;box(side?19:16,8+bob,side?13:17,7,hc);r(side?20:18,9+bob,9,2,shade(hc,27));
if(back){r(17,13+bob,15,8,hc);r(19,15+bob,2,5,shade(hc,15));}
else if(s.hair==='swept'){r(side?20:17,12+bob,8,4,hc);r(side?20:17,15+bob,3,4,hc);r(26,12+bob,4,2,hc);}
if(s.hair==='long'){r(side?19:16,13+bob,4,14,hc);if(!side)r(30,13+bob,3,14,hc);if(back)r(19,19+bob,11,8,hc);}
if(s.hair==='mohawk'){r(side?19:16,9+bob,side?13:17,5,s.skin);box(side?22:22,5+bob,5,10,hc);}
}
if(s.hat==='hood'){box(side?18:15,7+bob,side?16:19,17,s.cloth);if(!back){r(side?24:19,13+bob,side?9:11,9,s.skin);r(side?29:21,16+bob,2,2,outline);if(!side)r(27,16+bob,2,2,outline);}r(side?20:17,10+bob,3,12,shade(s.cloth,22));}
if(s.hat==='helmet'){box(side?19:16,7+bob,side?14:17,10,metal);r(side?20:17,10+bob,side?12:15,2,'#b4c7d3');r(side?20:16,15+bob,3,7,metal);if(!side)r(30,15+bob,3,7,metal);if(!back)r(side?27:23,14+bob,2,6,'#63788c');}
if(s.hat==='wizard'){box(13,11+bob,24,4,s.cloth);box(18,7+bob,15,5,s.cloth);box(20,3+bob,10,6,s.cloth);box(23,0+bob,6,5,s.cloth);r(19,10+bob,13,2,s.trim);r(24,5+bob,2,2,s.trim);}
// Held equipment follows the hand through the walk cycle.
if(s.weapon!=='none'){
let x=side?30:37+w,y=30+bob-(side?step:step);r(x,y,2,9,boot);
if(s.weapon==='sword'){box(x-1,y-13,4,14,'#b9d0d9');r(x,y-12,1,12,'#eef4e6');r(x-3,y,8,2,s.trim);}
if(s.weapon==='staff'){r(x,y-20,2,29,'#85583c');box(x-2,y-21,6,7,'#6edccd');r(x,y-20,2,3,'#c4fff1');}
if(s.weapon==='axe'){r(x,y-14,2,23,'#85583c');box(x-4,y-14,8,8,metal);r(x-3,y-13,2,6,'#c6dbe2');}
}
if(back&&s.cape){box(17-w,24+bob,15+w*2,14,s.capeColor);r(19-w,26+bob,2,10,shade(s.capeColor,22));r(29+w,26+bob,2,11,shade(s.capeColor,-25));r(21,24+bob,6,2,s.trim);}
ctx.restore();}
const $=s=>document.querySelector(s),names=['Down','Left','Up','Right'];
let editing=false,doc=null,selected=0,tool='pencil',clipboard=null,stroke=null,cursor={x:24,y:24},keyboardCursor=false;
const paint=$('#paint'),paintCtx=paint.getContext('2d');
const frameCanvas=document.createElement('canvas');frameCanvas.width=frameCanvas.height=48;
function hex(n){return '#'+n.toString(16).padStart(6,'0');}
function pixelsToCanvas(pixels,canvas){const c=canvas.getContext('2d'),im=c.createImageData(48,48);pixels.forEach((p,i)=>{if(p<0)return;im.data[i*4]=p>>16;im.data[i*4+1]=(p>>8)&255;im.data[i*4+2]=p&255;im.data[i*4+3]=255;});c.putImageData(im,0,0);}
function generatedFrames(){const c=frameCanvas.getContext('2d'),s=state();return Array.from({length:16},(_,i)=>{c.clearRect(0,0,48,48);draw(c,s,Math.floor(i/4),i%4);const p=c.getImageData(0,0,48,48).data;return Array.from({length:2304},(_,j)=>p[j*4+3]===0?-1:(p[j*4]<<16)|(p[j*4+1]<<8)|p[j*4+2]);});}
function refresh(){const c=sheet.getContext('2d');c.clearRect(0,0,192,192);if(editing){doc.frames.forEach((p,i)=>{pixelsToCanvas(p,frameCanvas);c.drawImage(frameCanvas,(i%4)*48,Math.floor(i/4)*48);});refreshEditor();}else{const s=state();for(let d=0;d<4;d++)for(let f=0;f<4;f++)draw(c,s,d,f,f*48,d*48);}render();}
function render(){const c=preview.getContext('2d');c.clearRect(0,0,48,48);if(editing)pixelsToCanvas(doc.frames[dir*4+frame],preview);else draw(c,state(),dir,frame);}
function renderPaint(){if(!editing)return;paintCtx.clearRect(0,0,576,576);paintCtx.imageSmoothingEnabled=false;
if($('#onion').checked){const previous=Math.floor(selected/4)*4+(selected+3)%4;pixelsToCanvas(doc.frames[previous],frameCanvas);paintCtx.globalAlpha=.22;paintCtx.drawImage(frameCanvas,0,0,576,576);paintCtx.globalAlpha=1;}
pixelsToCanvas(doc.frames[selected],frameCanvas);paintCtx.drawImage(frameCanvas,0,0,576,576);
if($('#grid').checked){paintCtx.strokeStyle='#ffffff22';paintCtx.lineWidth=1;paintCtx.beginPath();for(let i=0;i<=48;i++){paintCtx.moveTo(i*12+.5,0);paintCtx.lineTo(i*12+.5,576);paintCtx.moveTo(0,i*12+.5);paintCtx.lineTo(576,i*12+.5);}paintCtx.stroke();}
if(keyboardCursor){paintCtx.strokeStyle='#ffffff';paintCtx.lineWidth=2;paintCtx.strokeRect(cursor.x*12+1,cursor.y*12+1,10,10);}}
function refreshEditor(){renderPaint();$('#frame-name').textContent=`${names[Math.floor(selected/4)]} · Frame ${selected%4+1}`;document.querySelectorAll('[data-frame]').forEach(b=>{const i=Number(b.dataset.frame);pixelsToCanvas(doc.frames[i],b.querySelector('canvas'));b.classList.toggle('active',i===selected);b.setAttribute('aria-pressed',String(i===selected));});$('#undo').disabled=!doc.undoStack.length;$('#redo').disabled=!doc.redoStack.length;$('#paste-frame').disabled=!clipboard;}
function updatePalette(){const colors=[...new Set(doc.frames.flat().filter(p=>p>=0))].slice(0,32);if(!colors.length)colors.push(0x20202c,0xffffff,0xdca477,0x543a34,0x4a8e79,0xe5be70,0xa54d5b,0x647baf);$('#palette').replaceChildren(...colors.map(c=>{const b=document.createElement('button');b.style.background=hex(c);b.title=hex(c);b.setAttribute('aria-label',`Paint with ${hex(c)}`);b.onclick=()=>{$('#paint-color').value=hex(c);chooseTool('pencil');};return b;}));}
function mode(value){finishStroke();editing=value;document.body.classList.toggle('editing',value);$('#pixel-editor').hidden=!value;$('#show-generator').hidden=!value;$('#resume-edit').hidden=value||!doc;form.querySelectorAll('input,select').forEach(e=>e.disabled=value);$('#random').disabled=value;$('#edit-generated').hidden=value;$('#start-blank').hidden=false;if(value){selectFrame(selected);updatePalette();}refresh();}
function startPixels(blank){const frames=blank?PixelDocument.blank():generatedFrames();if(doc)doc.replace(frames);else doc=new PixelDocument(frames);selected=0;mode(true);status(blank?'Blank character ready. Draw the first pose, then copy it to other frames.':'Generated character ready for pixel editing.');}
$('#edit-generated').onclick=()=>startPixels(false);$('#start-blank').onclick=()=>startPixels(true);$('#show-generator').onclick=()=>{mode(false);status('Pixel draft preserved. Choose Resume pixel editor to continue.');};$('#resume-edit').onclick=()=>mode(true);
function status(t){$('#status').textContent=t;$('#edit-status').textContent=t;}
function setPlaying(v){playing=v;$('#play').textContent=v?'Ⅱ Pause walk':'▶ Play walk';$('#play').setAttribute('aria-pressed',String(v));}
function selectFrame(i){finishStroke();selected=i;dir=Math.floor(i/4);frame=i%4;setPlaying(false);updateDirections();refreshEditor();render();}
function updateDirections(){document.querySelectorAll('[data-dir]').forEach(b=>{const active=Number(b.dataset.dir)===dir;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
for(let i=0;i<16;i++){const b=document.createElement('button');b.dataset.frame=i;b.setAttribute('aria-label',`${names[Math.floor(i/4)]}, frame ${i%4+1}`);const c=document.createElement('canvas');c.width=c.height=48;b.append(c,`${names[Math.floor(i/4)]} ${i%4+1}`);b.onclick=()=>selectFrame(i);$('#frames').append(b);}
form.addEventListener('input',refresh);document.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>{dir=Number(b.dataset.dir);if(editing)selectFrame(dir*4+selected%4);else{updateDirections();render();}});
$('#play').onclick=()=>setPlaying(!playing);
function tick(t){if(playing&&t-last>=1000/Number($('#speed').value)){frame=(frame+1)%4;last=t;render();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
function chooseTool(t){tool=t;document.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===t);b.setAttribute('aria-pressed',String(b.dataset.tool===t));});}
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>chooseTool(b.dataset.tool));
function color(){return tool==='eraser'?-1:parseInt($('#paint-color').value.slice(1),16);}
function locate(e){const r=paint.getBoundingClientRect();return {x:Math.max(0,Math.min(47,Math.floor((e.clientX-r.left)/r.width*48))),y:Math.max(0,Math.min(47,Math.floor((e.clientY-r.top)/r.height*48)))};}
function useTool(p){if(tool==='picker'){const c=doc.frames[selected][p.y*48+p.x];if(c>=0){$('#paint-color').value=hex(c);chooseTool('pencil');status(`Picked ${hex(c)}.`);}else status('Transparent pixel: choose Eraser to draw transparency.');return;}
if(tool==='fill')doc.fill(selected,p.x,p.y,color());else doc.pixel(selected,p.x,p.y,color(),Number($('#brush').value),$('#mirror').checked);}
paint.onpointerdown=e=>{if(e.button!==0||stroke)return;e.preventDefault();paint.focus();keyboardCursor=false;setPlaying(false);frame=selected%4;dir=Math.floor(selected/4);const p=locate(e);if(tool!=='picker')doc.checkpoint();const continuous=['pencil','eraser'].includes(tool);useTool(p);if(continuous){stroke={id:e.pointerId,...p};paint.setPointerCapture(e.pointerId);}refresh();};
paint.onpointermove=e=>{if(!stroke||stroke.id!==e.pointerId)return;const p=locate(e);doc.line(selected,stroke.x,stroke.y,p.x,p.y,color(),Number($('#brush').value),$('#mirror').checked);stroke={...stroke,...p};refresh();};
function finishStroke(){if(stroke&&paint.hasPointerCapture(stroke.id))paint.releasePointerCapture(stroke.id);stroke=null;}
paint.onpointerup=finishStroke;paint.onpointercancel=finishStroke;paint.onlostpointercapture=()=>{stroke=null;};
$('#grid').onchange=renderPaint;$('#onion').onchange=renderPaint;
function undo(){finishStroke();doc.undo();refresh();updatePalette();}function redo(){finishStroke();doc.redo();refresh();updatePalette();}
$('#undo').onclick=undo;$('#redo').onclick=redo;
$('#copy-frame').onclick=()=>{clipboard=doc.frames[selected].slice();$('#paste-frame').disabled=false;status('Frame copied. Select another frame and choose Paste frame.');};
$('#paste-frame').onclick=()=>{if(!clipboard)return;doc.checkpoint();doc.frames[selected]=clipboard.slice();refresh();updatePalette();status('Frame pasted.');};
$('#copy-row').onclick=()=>{doc.checkpoint();const source=doc.frames[selected].slice(),start=Math.floor(selected/4)*4;for(let i=start;i<start+4;i++)doc.frames[i]=source.slice();refresh();status('Copied to all four frames in this direction. Undo restores the previous poses.');};
$('#clear-frame').onclick=()=>{doc.checkpoint();doc.frames[selected].fill(-1);refresh();status('Frame cleared. Undo restores it.');};
document.addEventListener('keydown',e=>{if(!editing||e.target.matches('input,select,textarea')||e.target.isContentEditable)return;
if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}if(e.ctrlKey||e.metaKey||e.altKey)return;
const keys={b:'pencil',e:'eraser',f:'fill',i:'picker'};if(keys[e.key.toLowerCase()]){chooseTool(keys[e.key.toLowerCase()]);return;}
if(e.target!==paint)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(delta){e.preventDefault();keyboardCursor=true;cursor.x=Math.max(0,Math.min(47,cursor.x+delta[0]));cursor.y=Math.max(0,Math.min(47,cursor.y+delta[1]));renderPaint();}else if(e.key===' '){e.preventDefault();if(tool!=='picker')doc.checkpoint();useTool(cursor);refresh();}});
paint.onfocus=()=>{keyboardCursor=true;renderPaint();};paint.onblur=()=>{keyboardCursor=false;renderPaint();};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function png(canvas,name){canvas.toBlob(b=>{if(!b)return status('Export failed. Please try again.');download(b,name);status('PNG exported at native resolution.');},'image/png');}
$('#export-sheet').onclick=()=>png(sheet,'character-walk-48x48.png');
$('#export-frame').onclick=()=>{if(editing){pixelsToCanvas(doc.frames[selected],frameCanvas);png(frameCanvas,`character-${names[Math.floor(selected/4)].toLowerCase()}-${selected%4}.png`);}else png(preview,`character-${names[dir].toLowerCase()}-${frame}.png`);};
function apply(s){for(const k of Object.keys(defaults)){const e=form.elements[k];if(e.type==='checkbox')e.checked=s[k];else e.value=s[k];}refresh();}
$('#random').onclick=()=>{const s=state();for(const k of ['build','hair','outfit','hat','weapon']){const opts=[...form.elements[k].options];s[k]=opts[Math.floor(Math.random()*opts.length)].value;}const palettes=[['#4a8e79','#e5be70','#a54d5b'],['#647baf','#d8d9ec','#674d86'],['#a55f43','#e9c67d','#435c7e'],['#776493','#b8dbba','#344b69']];const p=palettes[Math.floor(Math.random()*palettes.length)];[s.cloth,s.trim,s.capeColor]=p;s.skin=['#efc49b','#dca477','#aa704d','#754d3e'][Math.floor(Math.random()*4)];s.hairColor=['#543a34','#b1864d','#d5ccaa','#292a37','#88463b'][Math.floor(Math.random()*5)];s.cape=Math.random()>.5;apply(s);status('New adventurer created.');};
$('#save').onclick=()=>{const data={version:2,character:state(),mode:editing?'pixels':'generator',frames:doc?doc.frames:null};download(new Blob([JSON.stringify(data)],{type:'application/json'}),'character.json');status('Character saved, including the pixel draft.');};
$('#load').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>1000000)throw Error();const data=JSON.parse(await f.text());if(![1,2].includes(data.version)||!data.character)throw Error();const s=data.character;for(const k of Object.keys(defaults)){const el=form.elements[k];if(el.type==='checkbox'){if(typeof s[k]!=='boolean')throw Error();}else if(el.type==='color'){if(!/^#[0-9a-f]{6}$/i.test(s[k]))throw Error();}else if(![...el.options].some(o=>o.value===s[k]))throw Error();}
let loaded=null;if(data.version===2){if(!['pixels','generator'].includes(data.mode))throw Error();if(data.frames!==null)loaded=PixelDocument.validate(data.frames);if(data.mode==='pixels'&&!loaded)throw Error();}
finishStroke();editing=false;apply(s);if(loaded){if(doc)doc.replace(loaded);else doc=new PixelDocument(loaded);}selected=0;mode(data.version===2&&data.mode==='pixels');status('Character loaded.');}catch{status('Please choose a valid Sprite Forge character JSON file.');}e.target.value='';};
refresh();updateDirections();
