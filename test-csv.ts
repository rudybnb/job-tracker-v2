import { readFileSync } from 'fs';
import { parseSmartScheduleCSV, extractCost } from './server/csvParser';

const csvContent = readFileSync('/home/ubuntu/upload/(Job49)Flat21BedroomSmartScheduleExporttest.csv', 'utf8');

console.log('CSV first 500 chars:');
console.log(csvContent.substring(0, 500));
console.log('\n---\n');

try {
  const result = await parseSmartScheduleCSV(csvContent);
  
  if (!result) {
    console.error('Parser returned undefined!');
    process.exit(1);
  }
  
  const { metadata, resources } = result;
  
  console.log('Metadata:');
  console.log(JSON.stringify(metadata, null, 2));
  
  console.log('\nResources count:', resources.length);
  
  if (resources.length > 0) {
    console.log('\nFirst 3 resources:');
    resources.slice(0, 3).forEach((r, i) => {
      console.log(`\n${i+1}. ${r.typeOfResource} - ${r.resourceDescription}`);
      console.log(`   Quantity: ${r.orderQuantity}, Cost: £${extractCost(r.resourceDescription, r.orderQuantity) / 100}`);
    });
    
    // Calculate totals
    let labourTotal = 0;
    let materialTotal = 0;
    const phases = new Set<string>();
    
    resources.forEach(r => {
      const cost = extractCost(r.resourceDescription, r.orderQuantity);
      if (r.typeOfResource === 'Labour') labourTotal += cost;
      else materialTotal += cost;
      if (r.buildPhase) phases.add(r.buildPhase);
    });
    
    console.log('\n=== Summary ===');
    console.log(`Labour Total: £${(labourTotal / 100).toFixed(2)}`);
    console.log(`Material Total: £${(materialTotal / 100).toFixed(2)}`);
    console.log(`Phases: ${Array.from(phases).join(', ')}`);
  }
  
} catch (error) {
  console.error('Error:', error);
  if (error instanceof Error) {
    console.error('Stack:', error.stack);
  }
}
