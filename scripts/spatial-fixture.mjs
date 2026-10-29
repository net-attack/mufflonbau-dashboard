// Synthetic production fixture: no personal entity IDs or apartment geometry.
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
export const spatialFixture={default_scene:'all',scenes:['all','living','kitchen','bedroom','office','bathroom','hall'].map((id,index)=>({id,label:{de:id==='all'?'Gesamte Wohnung':id,en:id},room:{x:60,y:70,width:480,height:300,points:rect(60,70,480,300)},walls:[{x:60,y:70,width:480,height:4,top:100,normal:[0,-1]},{x:60,y:70,width:4,height:300,top:100,normal:[-1,0]}],objects:[
 {id:'room',layer:'RoomLayer',shapes:[{type:'polygon',points:rect(60,70,480,300),fill:'floor',stroke:'wall',sw:3}]},
 {id:'sofa',center:{x:170,y:160},height:30,material:'furniture',footprint:rect(100,110,140,100),shapes:[{type:'rect',x:110,y:120,w:115,h:70,r:8,fill:'cushion',stroke:'wall',sw:2}]},
 {id:'lamp',device:'lamp',center:{x:400,y:160},height:60,pole:true,shapes:[{type:'circle',x:400,y:160,r:10,fill:'$emissive',stroke:'wall',sw:1}]},
 {id:'heater',device:'heater',center:{x:320,y:90},height:25,material:'wood',footprint:rect(280,80,80,15),shapes:[]},
 {id:'tv',center:{x:100,y:270},height:55,material:'wall',footprint:rect(90,230,8,85),shapes:[]},
 ],devices:[
 {id:'lamp',name:'Leselicht',entity:'light.spatial_lamp',type:'light',x:400,y:160,z:60,radius:20},
 {id:'ambilight',name:'Ambilight',entity:'light.spatial_ambilight',type:'light',x:105,y:270,z:55,radius:19},
 {id:'heater',name:'Heizung',entity:'climate.spatial_heater',type:'radiator',x:320,y:90,z:25,radius:24},
 {id:'outlet',name:'TV-Steckdose',entity:'switch.spatial_outlet',power:'sensor.spatial_power',energy:'sensor.spatial_energy',type:'outlet',x:130,y:310,z:12,radius:20},
 {id:'vacuum',name:'Saugfried',entity:'vacuum.spatial_robot',type:'vacuum',x:430,y:310,z:8,radius:20},
 ],emitters:[{id:'lamp-head',entity:'lamp',x:400,y:160,z:60,width:40,height:40},{id:'tv-ambilight',entity:'ambilight',kind:'panel',x:90,y:270,z:55,width:110,height:65,axis:[0,1],placement:'back'}],readings:[{label:{de:id==='all'?'Wohnzimmer':id,en:id},temperature:'sensor.spatial_temperature',humidity:'sensor.spatial_humidity'}]}))};
const state=(s,attributes={})=>({state:s,attributes});
export const spatialHass={locale:{language:'de'},themes:{darkMode:false},states:{
 'light.spatial_lamp':state('on',{brightness:179,supported_color_modes:['color_temp','xy'],color_temp_kelvin:2700,min_color_temp_kelvin:2200,max_color_temp_kelvin:6500,rgb_color:[255,185,99]}),
 'light.spatial_ambilight':state('off',{brightness:128,supported_color_modes:['hs']}),
 'climate.spatial_heater':state('heat',{temperature:21,current_temperature:22.1,min_temp:5,max_temp:30,target_temp_step:.5,hvac_modes:['heat','off'],hvac_action:'idle'}),
 'switch.spatial_outlet':state('on'), 'sensor.spatial_power':state('0',{unit_of_measurement:'W'}), 'sensor.spatial_energy':state('1.2',{unit_of_measurement:'kWh'}),
 'sensor.spatial_temperature':state('22.1',{unit_of_measurement:'°C'}),'sensor.spatial_humidity':state('64',{unit_of_measurement:'%'}),
 'vacuum.spatial_robot':state('docked',{battery_level:78,supported_features:8192|16|8|4|32,fan_speed:'Standard',fan_speed_list:['Standard','Turbo']}),
}};
spatialFixture.focus_rooms=spatialFixture.scenes.filter(s=>s.id!=='all').map((s,i)=>({id:s.id,label:s.label,x:160+(i%3)*140,y:140+Math.floor(i/3)*130,zoom:1.8}));
spatialFixture.scenes=spatialFixture.scenes.slice(0,1);

spatialFixture.scenes[0].devices.push({id:'board',name:'Board',type:'navigation',x:185,y:290,navigation:{view:'admin',label:'Nerd-Panel öffnen'}});
spatialFixture.scenes[0].objects.push({id:'board-model',device:'board',layer:'DeviceLayer',height:0,shapes:[{type:'rect',x:180,y:286,w:10,h:8,r:1,fill:'furniture',stroke:'wall',sw:.8}]});
