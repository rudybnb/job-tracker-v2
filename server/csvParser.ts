/**
 * CSV Parser for Smart Schedule Export format
 * 
 * Format:
 * Row 1: Name,<client_name>
 * Row 2: Address,<address>
 * Row 3: Post Code,<postcode>
 * Row 4: Project Type,<type>
 * Row 5-6: Empty
 * Row 7: Headers (Order Date, Date Required, Build Phase, Type of Resource, Resource Type, Supplier, Resource Description, Order Quantity)
 * Row 8+: Data rows
 */

interface ParsedMetadata {
  name: string;
  address: string;
  postCode: string;
  projectType: string;
}

interface ResourceRow {
  orderDate: string;
  dateRequired: string;
  buildPhase: string;
  typeOfResource: string;
  resourceType: string;
  supplier: string;
  resourceDescription: string;
  orderQuantity: number;
}

export async function parseSmartScheduleCSV(content: string): Promise<{
  metadata: ParsedMetadata;
  resources: ResourceRow[];
}> {
  const lines = content.split('\n');
  
  // Extract metadata from first 4 rows
  const metadata: ParsedMetadata = {
    name: '',
    address: '',
    postCode: '',
    projectType: '',
  };

  // Parse metadata rows (format: "Label,Value,...")
  for (let i = 0; i < Math.min(4, lines.length); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length < 2) continue;
    
    const label = parts[0].trim().toLowerCase();
    const value = parts[1].trim();
    
    if (label === 'name') metadata.name = value;
    else if (label === 'address') metadata.address = value;
    else if (label.includes('post') && label.includes('code')) metadata.postCode = value;
    else if (label.includes('project') && label.includes('type')) metadata.projectType = value;
  }

  // Find the header row (contains "Order Date")
  let headerRowIndex = -1;
  for (let i = 4; i < lines.length; i++) {
    if (lines[i].includes('Order Date') || lines[i].includes('Build Phase')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Could not find data header row in CSV');
  }

  // Parse data rows using csv-parse
  const dataSection = lines.slice(headerRowIndex).join('\n');
  const csvParse = await import('csv-parse/sync');
  const parse = csvParse.parse;
  
  const records = parse(dataSection, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true, // Allow varying column counts
  });

  const resources: ResourceRow[] = [];
  
  for (const row of records) {
    const rowData = row as Record<string, string>;
    const typeOfResource = (rowData['Type of Resource'] || '').trim();
    
    // Skip rows without a resource type or with invalid types
    if (!typeOfResource || (typeOfResource !== 'Material' && typeOfResource !== 'Labour')) {
      continue;
    }

    const orderQuantity = parseInt(rowData['Order Quantity'] || '0');
    if (isNaN(orderQuantity) || orderQuantity === 0) {
      continue; // Skip zero quantity items
    }

    resources.push({
      orderDate: (rowData['Order Date'] || '').trim(),
      dateRequired: (rowData['Date Required'] || rowData[' Date Required'] || '').trim(),
      buildPhase: (rowData['Build Phase'] || '').trim(),
      typeOfResource: typeOfResource as 'Material' | 'Labour',
      resourceType: (rowData['Resource Type'] || '').trim(),
      supplier: (rowData['Supplier'] || '').trim(),
      resourceDescription: (rowData['Resource Description'] || '').trim(),
      orderQuantity,
    });
  }

  return { metadata, resources };
}

export function extractCost(description: string, quantity: number): number {
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
