const xlsx = require('xlsx');
const Product = require('../models/Product');

/**
 * Helper to identify if a row looks like a header row.
 * Checks for common column terms case-insensitively.
 */
function getHeaderScore(row) {
  if (!row || !Array.isArray(row)) return 0;
  
  let score = 0;
  row.forEach(cell => {
    if (typeof cell !== 'string') return;
    const val = cell.trim().toLowerCase();
    
    if (val.includes('cat') || val.includes('catalog')) score += 2;
    if (val.includes('product') || val.includes('name')) score += 2;
    if (val.includes('desc')) score += 1;
  });
  return score;
}

/**
 * Service to process product import from Excel file buffer.
 * Performs the complete ETL workflow.
 * 
 * @param {Buffer} fileBuffer - The Excel file buffer.
 * @param {string} [originalName='unknown'] - The original uploaded file name for telemetry and diagnostics.
 * @returns {Promise<Object>} The ETL import metrics, warnings, errors, and timing information.
 */
async function importProductsFromBuffer(fileBuffer, originalName = 'unknown') {
  const startTime = Date.now();
  console.log(`[ETL] [${originalName}] Starting product import ETL process...`);
  
  // 1. EXTRACT
  let workbook;
  try {
    workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  } catch (error) {
    console.error(`[ETL] [${originalName}] [Extract] Error parsing Excel workbook:`, error);
    throw new Error('Invalid Excel file format. Could not parse spreadsheet.');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    console.error(`[ETL] [${originalName}] [Extract] Workbook has no worksheets.`);
    throw new Error('The uploaded Excel workbook contains no sheets.');
  }

  const worksheet = workbook.Sheets[sheetName];
  
  // Convert worksheet to raw 2D array of rows (to keep raw empty slots and row indexes)
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  if (rows.length === 0) {
    console.log(`[ETL] [${originalName}] [Extract] Spreadsheet is completely empty.`);
    return {
      totalRowsProcessed: 0,
      totalRecordsImported: 0,
      totalRecordsSkipped: 0,
      errors: [{ error: 'The uploaded file is empty.' }],
      durationMs: Date.now() - startTime
    };
  }

  // Detect header row automatically between row 1 (index 0) and row 2 (index 1)
  let headerRowIndex = 0;
  if (rows.length > 1) {
    const row1Score = getHeaderScore(rows[0]);
    const row2Score = getHeaderScore(rows[1]);
    
    // If row 2 scores higher, we designate it as the header row
    if (row2Score > row1Score) {
      headerRowIndex = 1;
      console.log(`[ETL] [${originalName}] [Extract] Auto-detected header row at index 1 (second row) with score ${row2Score}.`);
    } else {
      console.log(`[ETL] [${originalName}] [Extract] Auto-detected header row at index 0 (first row) with score ${row1Score}.`);
    }
  }

  const headers = rows[headerRowIndex] || [];
  
  // Define default column mappings: Column A -> Cat No, Column B -> Product Name, Column C -> Description
  let catColIndex = 0;
  let nameColIndex = 1;
  let descColIndex = 2;

  // Search header row to match column indexes dynamically if headers exist
  headers.forEach((cell, index) => {
    if (typeof cell !== 'string') return;
    const val = cell.trim().toLowerCase();
    
    if (val.includes('cat') || val.includes('catalog')) {
      catColIndex = index;
    } else if (val.includes('product') || val.includes('name')) {
      nameColIndex = index;
    } else if (val.includes('desc')) {
      descColIndex = index;
    }
  });

  console.log(`[ETL] [${originalName}] [Extract] Mapped columns: Cat No = Index ${catColIndex}, Product Name = Index ${nameColIndex}, Description = Index ${descColIndex}`);
  const extractDuration = Date.now() - startTime;

  // 2. TRANSFORM
  const transformStart = Date.now();
  
  // Fetch all existing product catalogue numbers in a single query to scale and speed up duplicate detection
  const existingProducts = await Product.find({}, 'catalogueNumber');
  const existingDbCatNos = new Set(existingProducts.map(p => p.catalogueNumber));
  console.log(`[ETL] [${originalName}] [Transform] Cached ${existingDbCatNos.size} existing Catalogue Numbers from database.`);

  const dataRows = rows.slice(headerRowIndex + 1);
  const productsToInsert = [];
  const errors = [];
  const seenFileCatNos = new Set();
  let skippedCount = 0;

  dataRows.forEach((row, idx) => {
    const sheetRowNumber = idx + headerRowIndex + 2; // 1-indexed row number in the Excel sheet
    
    // Retrieve values based on columns
    const rawCatNo = row[catColIndex];
    const rawName = row[nameColIndex];
    const rawDesc = row[descColIndex];

    // Trim whitespace and cast safely to string
    const catNo = typeof rawCatNo === 'string' ? rawCatNo.trim() : (rawCatNo != null ? String(rawCatNo).trim() : '');
    const name = typeof rawName === 'string' ? rawName.trim() : (rawName != null ? String(rawName).trim() : '');
    const desc = typeof rawDesc === 'string' ? rawDesc.trim() : (rawDesc != null ? String(rawDesc).trim() : '');

    // Skip completely empty rows silently
    const isRowEmpty = !catNo && !name && !desc;
    if (isRowEmpty) {
      skippedCount++;
      return;
    }

    // Validate that required fields are present
    if (!catNo) {
      const errMsg = `Row ${sheetRowNumber}: Missing required column 'Cat No'.`;
      console.warn(`[ETL] [${originalName}] [Transform] Validation error: ${errMsg}`);
      errors.push({ row: sheetRowNumber, error: errMsg });
      skippedCount++;
      return;
    }

    if (!name) {
      const errMsg = `Row ${sheetRowNumber}: Missing required column 'Product Name' for Cat No '${catNo}'.`;
      console.warn(`[ETL] [${originalName}] [Transform] Validation error: ${errMsg}`);
      errors.push({ row: sheetRowNumber, error: errMsg });
      skippedCount++;
      return;
    }

    // Handle duplicates inside the uploaded file
    if (seenFileCatNos.has(catNo)) {
      const errMsg = `Row ${sheetRowNumber}: Duplicate Cat No '${catNo}' detected within the uploaded spreadsheet file.`;
      console.warn(`[ETL] [${originalName}] [Transform] Validation warning: ${errMsg}`);
      errors.push({ row: sheetRowNumber, error: errMsg });
      skippedCount++;
      return;
    }
    seenFileCatNos.add(catNo);

    // Handle duplicates already existing in the database
    if (existingDbCatNos.has(catNo)) {
      const errMsg = `Row ${sheetRowNumber}: Product with Cat No '${catNo}' already exists in database.`;
      console.warn(`[ETL] [${originalName}] [Transform] Validation warning: ${errMsg}`);
      errors.push({ row: sheetRowNumber, error: errMsg });
      skippedCount++;
      return;
    }

    // Row is valid, transform and queue for Load
    productsToInsert.push({
      catalogueNumber: catNo,
      name: name,
      description: desc
    });
  });

  const transformDuration = Date.now() - transformStart;

  // 3. LOAD
  const loadStart = Date.now();
  if (productsToInsert.length > 0) {
    try {
      console.log(`[ETL] [${originalName}] [Load] Inserting ${productsToInsert.length} products to database in bulk...`);
      await Product.insertMany(productsToInsert);
      console.log(`[ETL] [${originalName}] [Load] Successfully loaded ${productsToInsert.length} products to database.`);
    } catch (error) {
      console.error(`[ETL] [${originalName}] [Load] Bulk insert failed:`, error);
      throw new Error(`Failed to load products to the database: ${error.message}`);
    }
  } else {
    console.log(`[ETL] [${originalName}] [Load] No new products to load into the database.`);
  }

  const loadDuration = Date.now() - loadStart;
  const totalDuration = Date.now() - startTime;

  console.log(`[ETL] [${originalName}] ETL Process finished in ${totalDuration}ms. (Extract: ${extractDuration}ms, Transform: ${transformDuration}ms, Load: ${loadDuration}ms)`);

  return {
    totalRowsProcessed: dataRows.length,
    totalRecordsImported: productsToInsert.length,
    totalRecordsSkipped: skippedCount,
    errors: errors,
    durationMs: totalDuration
  };
}

module.exports = {
  importProductsFromBuffer
};
