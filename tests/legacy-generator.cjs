// Baseline renderer captured from the pre-studio revision for pixel regression tests.
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

module.exports={draw};
