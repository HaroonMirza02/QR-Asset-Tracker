'use strict';
// Fictional operations team, real equipment models; no real personal data.
const employees = [
 ['Sana Ahmed','Procurement Lead','Finance'],['Omar Siddiqui','Network Administrator','IT'],
 ['Maya Chen','Workplace Coordinator','Facilities'],['Daniel Brooks','Fleet Supervisor','Logistics'],
 ['Priya Shah','Quality Engineer','Operations'],['Liam Walsh','Service Technician','Operations'],
 ['Nadia Khan','People Operations Partner','HR'],['James Wright','Facilities Engineer','Facilities']
].map(([name,title,department], i) => ({name,title,department,contactInfo:{email:`${name.toLowerCase().replace(' ', '.')}@meridian-ops.example`,phone:`+1-202-555-01${String(i+20).padStart(2,'0')}`},status:'active'}));
const locations = [
 {name:'IT Service Bench',type:'room',address:'HQ Campus, Building A, ground floor'},
 {name:'Collaboration Room 3',type:'room',address:'HQ Campus, Building A, level 2'},
 {name:'North Distribution Hub',type:'site',address:'Fictional demo address: 82 Logistics Avenue'},
 {name:'Workshop and Fleet Garage',type:'building',address:'North Distribution Hub, Bay 4'},
 {name:'Equipment Checkout Store',type:'room',address:'Warehouse B, reception level'},
];
const catalog = [
 ['Lenovo ThinkPad T14 Gen 4','Laptop','16 GB RAM, 512 GB SSD. Standard field-service workstation.'],
 ['HP ProBook 450 G10','Laptop','Procurement workstation with dock and 65 W power adapter.'],
 ['Dell Precision 3581','Laptop','Engineering CAD workstation, 32 GB RAM and dedicated graphics.'],
 ['Apple MacBook Air 13 M2','Laptop','Lightweight workstation for people operations and onboarding.'],
 ['Toyota Corolla Hybrid','Vehicle','Pool car for site visits. Keys held at reception.'],
 ['Ford Ranger Double Cab','Vehicle','Maintenance crew transport with lockable tool canopy.'],
 ['Toyota Proace Panel Van','Vehicle','Regional deliveries; load restraint kit stored in the cargo area.'],
 ['Makita DHP484 Drill Set','Tool','18 V cordless kit with two batteries, charger and carry case.'],
 ['Fluke 325 Clamp Meter','Tool','Electrical inspection meter; calibration certificate held by quality team.'],
 ['Bosch GLM 50 Laser Measure','Tool','Site survey tool with protective pouch and spare batteries.'],
 ['Wera Kraftform Torque Set','Tool','Calibrated insulated driver kit for service technicians.'],
 ['Steelcase Series 1 Chair','Furniture','Adjustable task chair with lumbar support and hard-floor castors.'],
 ['Herman Miller Sayl Chair','Furniture','Ergonomic workstation seating for the shared office.'],
 ['IKEA BEKANT Sit-Stand Desk','Furniture','160 cm electric height-adjustable desk with cable tray.'],
 ['Dell UltraSharp U2723QE','Equipment','27-inch USB-C display with integrated docking for hot desks.'],
 ['Zebra TC22 Handheld','Equipment','Warehouse picking terminal with charging cradle and wrist strap.'],
 ['Brother QL-820NWB Label Printer','Equipment','Network label printer for asset tags; continuous label stock.'],
 ['Ubiquiti UniFi U6 Pro','Equipment','Ceiling-mounted wireless access point for the distribution hub.'],
];
const assets = catalog.flatMap(([name,category,description], i) => [0,1].map(unit => {
 const n=i*2+unit;
 const status=n%13===0?'In Repair':n%17===0?'Retired':n%19===0?'Lost':n%3===0?'Available':'Assigned';
 const employee=n%2===0;
 return {name:`${name} — ${String(unit+1).padStart(2,'0')}`,category,description,
 serialNumber:`MOS-${category.slice(0,3).toUpperCase()}-${String(240100+n)}`,
 status,assignType:status==='Assigned'?(employee?'employee':'location'):null,
 assignIdx:status==='Assigned'?(employee?8+n%8:5+n%5):null,isPublicVisible:!['Retired','Lost'].includes(status)&&n%7!==0};
}));
module.exports={employees,locations,assets};
