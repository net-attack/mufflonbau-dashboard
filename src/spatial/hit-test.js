import {project} from './camera.js';
export function shapePoints(shape){
 if(shape.points)return shape.points;
 if(shape.type==='rect')return [[shape.x,shape.y],[shape.x+shape.w,shape.y],[shape.x+shape.w,shape.y+shape.h],[shape.x,shape.y+shape.h]];
 if(shape.type==='circle')return Array.from({length:24},(_,i)=>[shape.x+Math.cos(i*Math.PI/12)*shape.r,shape.y+Math.sin(i*Math.PI/12)*shape.r]);
 return [];
}
export function polygonContains(point,points){
 let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++) {const a=points[i],b=points[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}
 return inside;
}
export function distanceToSegment(p,a,b){const x=b.x-a.x,y=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return Math.hypot(p.x-a.x-t*x,p.y-a.y-t*y);}
export function geometryHit(point,shapes,transform){
 for(const shape of shapes){const points=shapePoints(shape).map(([x,y])=>project({x,y},transform));if(!points.length)continue;
  if(shape.type!=='line'&&polygonContains(point,points))return true;
  for(let i=1;i<points.length;i++)if(distanceToSegment(point,points[i-1],points[i])<=Math.max(5,(shape.sw??1)*transform.scale/2))return true;
 }
 return false;
}
