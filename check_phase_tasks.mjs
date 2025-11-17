import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("=== Checking Build Phase Tasks ===\n");

// Get Emmanuel's job phases
const [phases] = await connection.query(`
  SELECT bp.id, bp.phaseName, bp.tasks, j.title 
  FROM buildPhases bp 
  JOIN jobs j ON bp.jobId = j.id 
  WHERE j.title LIKE '%Emmanuel%'
`);

console.log(`Found ${phases.length} phases:\n`);

phases.forEach(phase => {
  console.log(`Phase: ${phase.phaseName}`);
  console.log(`  Tasks: ${phase.tasks || 'NULL'}`);
  
  if (phase.tasks) {
    try {
      const parsed = JSON.parse(phase.tasks);
      console.log(`  Parsed tasks (${parsed.length}):`, parsed);
    } catch (e) {
      console.log(`  Error parsing tasks: ${e.message}`);
    }
  }
  console.log('');
});

// Check if we need to add default tasks
const phasesWithoutTasks = phases.filter(p => !p.tasks || p.tasks === 'null' || p.tasks === '[]');

if (phasesWithoutTasks.length > 0) {
  console.log(`\n${phasesWithoutTasks.length} phases need tasks. Adding default tasks...\n`);
  
  // Default tasks for different phase types
  const defaultTasks = {
    'Bedroom': [
      'Prepare walls and ceiling',
      'Apply primer coat',
      'Apply first coat of paint',
      'Apply second coat of paint',
      'Touch up and final inspection'
    ],
    'Stair': [
      'Prepare stair surfaces',
      'Sand and clean',
      'Apply primer',
      'Apply paint coats',
      'Final inspection'
    ],
    'default': [
      'Prepare surface',
      'Apply primer',
      'Apply first coat',
      'Apply second coat',
      'Final inspection'
    ]
  };
  
  for (const phase of phasesWithoutTasks) {
    let tasks = defaultTasks.default;
    
    // Choose appropriate task list based on phase name
    if (phase.phaseName.includes('Bedroom')) {
      tasks = defaultTasks.Bedroom;
    } else if (phase.phaseName.includes('Stair')) {
      tasks = defaultTasks.Stair;
    }
    
    const tasksJson = JSON.stringify(tasks);
    
    await connection.query(
      'UPDATE buildPhases SET tasks = ? WHERE id = ?',
      [tasksJson, phase.id]
    );
    
    console.log(`✓ Added ${tasks.length} tasks to: ${phase.phaseName}`);
  }
  
  console.log('\n✓ All phases now have tasks!');
} else {
  console.log('\n✓ All phases already have tasks defined');
}

await connection.end();
