import { readFileSync } from 'fs';
import { parseSmartScheduleCSV } from './server/csvProcessorNew.ts';

const csvContent = readFileSync('/home/ubuntu/upload/Timitest5SmartScheduleExport.csv', 'utf-8');

console.log('Parsing CSV...\n');

const result = await parseSmartScheduleCSV(csvContent);

console.log('Metadata:');
console.log(`  Name: ${result.metadata.name}`);
console.log(`  Address: ${result.metadata.address}`);
console.log(`  Post Code: ${result.metadata.postCode}`);
console.log(`  Project Type: ${result.metadata.projectType}`);
console.log(`\nTotal Resources: ${result.resources.length}`);
console.log(`Total Labour Cost: £${(result.totalLabourCost / 100).toFixed(2)}`);
console.log(`Total Material Cost: £${(result.totalMaterialCost / 100).toFixed(2)}`);

console.log('\nFirst 10 Material Resources with Suppliers:');
const materials = result.resources.filter(r => r.typeOfResource === 'Material').slice(0, 10);
materials.forEach((r, i) => {
  console.log(`${i + 1}. Phase: ${r.buildPhase}`);
  console.log(`   Supplier: "${r.supplier}"`);
  console.log(`   Description: ${r.resourceDescription}`);
  console.log(`   Quantity: ${r.orderQuantity}`);
  console.log(`   Cost: £${(r.cost / 100).toFixed(2)}`);
  console.log('');
});
