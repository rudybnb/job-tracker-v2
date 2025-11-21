/**
 * Clean CSV processor for Smart Schedule Export format
 * 
 * Expected format:
 * Row 1: Name,<client_name>
 * Row 2: Address,<address>
 * Row 3: Post Code,<postcode>
 * Row 4: Project Type,<type>
 * Row 5-6: Empty
 * Row 7: Headers (Order Date, Date Required, Build Phase, Type of Resource, etc.)
 * Row 8+: Data rows
 */

interface JobMetadata {
  name: string;
  address: string;
  postCode: string;
  projectType: string;
}

interface ResourceLine {
  buildPhase: string;
  typeOfResource: 'Material' | 'Labour';
  supplier: string;
  resourceDescription: string;
  orderQuantity: number;
  cost: number;
}

export function extractCostFromDescription(description: string, quantity: number): number {
  if (!description) return 0;
  
  // Match patterns: £1.66/Each, £22.50/Each, £33.00/Hours, £1,010.00/Each
  const match = description.match(/£([\d,]+(?:\.\d{1,2})?)/);
  if (match) {
    const priceStr = match[1].replace(/,/g, '');
    const price = parseFloat(priceStr);
    if (!isNaN(price)) {
      return Math.round(price * quantity * 100); // Convert to pence
    }
  }
  
  return 0;
}

export async function parseSmartScheduleCSV(csvContent: string): Promise<{
  metadata: JobMetadata;
  resources: ResourceLine[];
  phases: string[];
  totalLabourCost: number;
  totalMaterialCost: number;
}> {
  const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Extract metadata from first 4 rows
  const metadata: JobMetadata = {
    name: '',
    address: '',
    postCode: '',
    projectType: '',
  };

  // Parse metadata rows (format: "Label,Value")
  for (let i = 0; i < Math.min(4, lines.length); i++) {
    const parts = lines[i].split(',');
    if (parts.length < 2) continue;
    
    const label = parts[0].trim().toLowerCase();
    const value = parts.slice(1).join(',').trim(); // Handle commas in values
    
    if (label === 'name') {
      metadata.name = value;
    } else if (label === 'address') {
      metadata.address = value;
    } else if (label.includes('post') && label.includes('code')) {
      metadata.postCode = value;
    } else if (label.includes('project') && label.includes('type')) {
      metadata.projectType = value;
    }
  }

  // Find the header row (contains "Build Phase" or "Order Date")
  let headerRowIndex = -1;
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('build phase') || line.includes('order date')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Could not find data header row in CSV');
  }

  // Parse the data section using csv-parse
  const dataSection = lines.slice(headerRowIndex).join('\n');
  const csvParse = await import('csv-parse/sync');
  
  const records = csvParse.parse(dataSection, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const resources: ResourceLine[] = [];
  const phasesSet = new Set<string>();
  let totalLabourCost = 0;
  let totalMaterialCost = 0;
  let currentPhase = ''; // Track the current phase for forward-fill

  for (const record of records) {
    const row = record as Record<string, string>;
    
    const typeOfResource = (row['Type of Resource'] || '').trim();
    let buildPhase = (row['Build Phase'] || '').trim();
    const supplier = (row['Supplier'] || '').trim();
    const resourceDescription = (row['Resource Description'] || '').trim();
    const orderQuantityStr = (row['Order Quantity'] || '').trim();
    const orderQuantity = orderQuantityStr ? parseInt(orderQuantityStr) : 1; // Default to 1 if empty
    
    // Update current phase if this row has a phase name
    if (buildPhase) {
      currentPhase = buildPhase;
      phasesSet.add(buildPhase);
    } else if (currentPhase) {
      // Forward-fill: use the last seen phase
      buildPhase = currentPhase;
    }
    
    // Determine resource type (handle "Material - supplier" and "Labour" formats)
    let resourceType: 'Material' | 'Labour' | null = null;
    if (typeOfResource.startsWith('Material')) {
      resourceType = 'Material';
    } else if (typeOfResource === 'Labour') {
      resourceType = 'Labour';
    }
    
    // Skip invalid rows
    if (!resourceType) {
      continue;
    }
    // Skip only if orderQuantity is invalid (NaN), but allow 0 or empty (defaulted to 1)
    if (isNaN(orderQuantity)) {
      continue;
    }

    const cost = extractCostFromDescription(resourceDescription, orderQuantity);
    
    resources.push({
      buildPhase,
      typeOfResource: resourceType,
      supplier,
      resourceDescription,
      orderQuantity,
      cost,
    });

    if (resourceType === 'Labour') {
      totalLabourCost += cost;
    } else {
      totalMaterialCost += cost;
    }
  }

  return {
    metadata,
    resources,
    phases: Array.from(phasesSet),
    totalLabourCost,
    totalMaterialCost,
  };
}
