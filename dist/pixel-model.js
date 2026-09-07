'use strict';
class PixelDocument {
  constructor(frames=PixelDocument.blank()){this.frames=PixelDocument.validate(frames);this.undoStack=[];this.redoStack=[];}
  static blank(){return Array.from({length:16},()=>Array(2304).fill(-1));}
  static validate(frames){if(!Array.isArray(frames)||frames.length!==16||!frames.every(f=>Array.isArray(f)&&f.length===2304&&f.every(p=>Number.isInteger(p)&&p>=-1&&p<=0xffffff)))throw Error('Invalid pixel data');return frames.map(f=>f.slice());}
  checkpoint(){this.undoStack.push(this.frames.map(f=>f.slice()));if(this.undoStack.length>40)this.undoStack.shift();this.redoStack=[];}
  undo(){if(!this.undoStack.length)return;this.redoStack.push(this.frames);this.frames=this.undoStack.pop();}
  redo(){if(!this.redoStack.length)return;this.undoStack.push(this.frames);this.frames=this.redoStack.pop();}
  replace(frames){const valid=PixelDocument.validate(frames);this.checkpoint();this.frames=valid;}
  pixel(i,x,y,color,size=1,mirror=false){for(let dy=0;dy<size;dy++)for(let dx=0;dx<size;dx++){const a=x+dx,b=y+dy;if(a<0||a>=48||b<0||b>=48)continue;this.frames[i][b*48+a]=color;if(mirror)this.frames[i][b*48+47-a]=color;}}
  line(i,x0,y0,x1,y1,color,size=1,mirror=false){const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let error=dx+dy;for(;;){this.pixel(i,x0,y0,color,size,mirror);if(x0===x1&&y0===y1)break;const e=2*error;if(e>=dy){error+=dy;x0+=sx;}if(e<=dx){error+=dx;y0+=sy;}}}
  fill(i,x,y,color){const f=this.frames[i],target=f[y*48+x];if(target===color)return;const queue=[y*48+x];f[queue[0]]=color;while(queue.length){const p=queue.pop(),px=p%48,py=Math.floor(p/48);for(const [a,b] of [[px-1,py],[px+1,py],[px,py-1],[px,py+1]])if(a>=0&&a<48&&b>=0&&b<48&&f[b*48+a]===target){f[b*48+a]=color;queue.push(b*48+a);}}}
}
if(typeof module!=='undefined')module.exports=PixelDocument;
