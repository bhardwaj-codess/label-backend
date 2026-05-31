const path = require('path');
const ejs = require('ejs');
const fs = require('fs').promises;
const qrcode = require('qrcode');
const History = require('../models/History');
const Product = require('../models/Product');
const { generatePdfFromHtml } = require('../services/pdfGenerator');

// Memory caches for static asset base64 strings to eliminate disk I/O from request lifecycle
let logoBase64Cache = null;
let qrCodeBase64Cache = null;

async function getCachedImages() {
  if (!logoBase64Cache) {
    const logoPath = path.join(__dirname, '../images/vashishat_logo.png');
    const logoBuffer = await fs.readFile(logoPath);
    logoBase64Cache = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  }
  if (!qrCodeBase64Cache) {
    const qrPath = path.join(__dirname, '../images/QR.png');
    const qrBuffer = await fs.readFile(qrPath);
    qrCodeBase64Cache = `data:image/png;base64,${qrBuffer.toString('base64')}`;
  }
  return { logoBase64: logoBase64Cache, qrCodeBase64: qrCodeBase64Cache };
}

exports.generatePdf = async (req, res) => {
  const startTime = Date.now();
  try {
    const { 
      lines, 
      customerName, 
      customerPhone, 
      customerAddress,
      clientCode,
      workOrderDateFrom,
      workOrderDateTo,
      workOrderNo,
      woReceiveDate,
      skipHistory 
    } = req.body;
    if (!Array.isArray(lines) || !lines.length) {
      return res.status(400).json({ message: 'Lines array required.' });
    }

    // 1. Fetch products
    const prodIds = lines.map(l => l.productId);
    const prods = await Product.find({ _id: { $in: prodIds } }).lean();
    const prodMap = prods.reduce((m, p) => (m[p._id.toString()] = p, m), {});

    // 2. Images (base64) - load from fast memory cache instead of disk
    const { logoBase64, qrCodeBase64 } = await getCachedImages();

    // 3. Assemble labels
    const labels = [];
    for (const { productId, totalQuantity, numLabels, brand } of lines) {
      const product = prodMap[productId];
      for (let i = 0; i < numLabels; i++) {
        labels.push({
          product,
          date: new Date().toLocaleDateString(),
          logoBase64,
          qrCodeBase64,
          quantity: totalQuantity,
          brand: brand || ''
        });
      }
    }

    // Assemble history lines
    const historyLines = lines.map(line => {
      const product = prodMap[line.productId];
      return {
        productId: line.productId,
        productName: product ? product.name : 'Unknown',
        sku: product ? product.catalogueNumber : '',
        qty: Number(line.qty) || 0,
        unitsPerBox: Number(line.totalQuantity) || 0,
        labelPrint: Number(line.numLabels) || 0,
        brand: line.brand || ''
      };
    });

    if (!skipHistory) {
      console.log('Creating history record with lines:', historyLines.length);
      const savedHistory = await History.create({
        user: req.user.id,
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        customerAddress: customerAddress || '',
        clientCode: clientCode || '',
        workOrderDateFrom: workOrderDateFrom || '',
        workOrderDateTo: workOrderDateTo || '',
        workOrderNo: workOrderNo || '',
        woReceiveDate: woReceiveDate || '',
        lines: historyLines,
        status: 'completed'
      });
      console.log('History record saved with ID:', savedHistory._id);
    } else {
      console.log('Skipping history creation (Preview mode)');
    }

    // 5. Render EJS -> HTML
    const html = await ejs.renderFile(
      path.join(__dirname, '../templates/multipleLabels.ejs'),
      { labels }
    );

    // 6. Generate PDF using our high-speed cached puppeteer service
    const options = {
      format: 'A4',
      printBackground: true,
      margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' }
    };
    const pdfBuffer = await generatePdfFromHtml(html, options);

    console.log(`[generatePdf] Request completed in ${Date.now() - startTime}ms.`);

    // 8. Send back PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=labels.pdf');
    res.send(pdfBuffer);

  } catch (err) {
    console.error('Error generating PDF:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      message: 'Failed to generate PDF',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
