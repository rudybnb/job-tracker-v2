import { readFileSync } from 'fs';
import { parseSmartScheduleCSV } from './server/csvProcessorNew';

async function test() {
  const csvContent = readFileSync('/home/ubuntu/upload/(Job49)Flat21BedroomSmartScheduleExporttest.csv', 'utf8');
  
  console.log('Testing CSV parser...\n');
  
  try {
    const result = await parseSmartScheduleCSV(csvContent);
    
    console.log('✅ Parse successful!\n');
    console.log('Metadata:');
    console.log(`  Name: ${result.metadata.name}`);
    console.log(`  Address: ${result.metadata.address}`);
    console.log(`  Post Code: ${result.metadata.postCode}`);
    console.log(`  Project Type: ${result.metadata.projectType}`);
    
    console.log(`\nResources: ${result.resources.length} items`);
    console.log(`Phases: ${result.phases.join(', ')}`);
    console.log(`\nLabour Cost: £${(result.totalLabourCost / 100).toFixed(2)}`);
    console.log(`Material Cost: £${(result.totalMaterialCost / 100).toFixed(2)}`);
    console.log(`Total Cost: £${((result.totalLabourCost + result.totalMaterialCost) / 100).toFixed(2)}`);
    
    if (result.resources.length > 0) {
      console.log('\nFirst 3 resources:');
      result.resources.slice(0, 3).forEach((r, i) => {
        console.log(`  ${i+1}. [${r.typeOfResource}] ${r.resourceDescription} (Qty: ${r.orderQuantity}, Cost: £${(r.cost/100).toFixed(2)})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Parse failed:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
  }
}

test();
