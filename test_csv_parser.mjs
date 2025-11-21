import { readFileSync } from 'fs';
import { parseSmartScheduleCSV } from './server/csvProcessorNew.ts';

const csvContent = readFileSync('/home/ubuntu/upload/pasted_file_XzzmYf_93PickfordLane,Bexleyheath.csv', 'utf-8');

console.log("Testing CSV parser...\n");

try {
  const result = await parseSmartScheduleCSV(csvContent);
  
  console.log(`Job: ${result.metadata.name}`);
  console.log(`Address: ${result.metadata.address}`);
  console.log(`Post Code: ${result.metadata.postCode}\n`);
  
  console.log(`Total Phases: ${result.phases.length}`);
  result.phases.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  
  console.log(`\nTotal Resources: ${result.resources.length}`);
  
  const materialCount = result.resources.filter(r => r.typeOfResource === 'Material').length;
  const labourCount = result.resources.filter(r => r.typeOfResource === 'Labour').length;
  
  console.log(`  - Material: ${materialCount}`);
  console.log(`  - Labour: ${labourCount}`);
  
  // Group materials by phase
  const materialsByPhase = {};
  result.resources.filter(r => r.typeOfResource === 'Material').forEach(r => {
    if (!materialsByPhase[r.buildPhase]) {
      materialsByPhase[r.buildPhase] = [];
    }
    materialsByPhase[r.buildPhase].push(r.resourceDescription);
  });
  
  console.log(`\nMaterial tasks by phase:`);
  Object.entries(materialsByPhase).forEach(([phase, tasks]) => {
    console.log(`\n${phase}: ${tasks.length} tasks`);
    tasks.slice(0, 5).forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
    if (tasks.length > 5) console.log(`  ... and ${tasks.length - 5} more`);
  });
  
} catch (error) {
  console.error("Error:", error.message);
  console.error(error.stack);
}
