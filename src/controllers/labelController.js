const puppeteer = require('puppeteer');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs').promises;
const qrcode = require('qrcode');
const History = require('../models/History');
const Product = require('../models/Product');



// 1.  destruct NEW body shape
exports.generatePdf = async (req, res) => {
  try {
    const { lines, customerName, customerEmail, customerPhone, customerAddress, skipHistory } = req.body;
    if (!Array.isArray(lines) || !lines.length) {
      return res.status(400).json({ message: 'Lines array required.' });
    }

    // 1. fetch products
    const prodIds = lines.map(l => l.productId);
    const prods = await Product.find({ _id: { $in: prodIds } }).lean();
    const prodMap = prods.reduce((m, p) => (m[p._id.toString()] = p, m), {});

    // 2. images (base64)
    const logoBase64 = `data:image/png;base64,${(await fs.readFile(path.join(__dirname, '../images/vashishat_logo.png'))).toString('base64')
      }`;
    const qrCodeBase64 = `data:image/png;base64,${(await fs.readFile(path.join(__dirname, '../images/QR.png'))).toString('base64')
      }`;


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

    // for saving history
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
        customerEmail: customerEmail || '',
        customerPhone: customerPhone || '',
        customerAddress: customerAddress || '',
        lines: historyLines,
        status: 'completed'
      });
      console.log('History record saved with ID:', savedHistory._id);
    } else {
      console.log('Skipping history creation (Preview mode)');
    }

    // 5. render EJS -> HTML
    const html = await ejs.renderFile(
      path.join(__dirname, '../templates/multipleLabels.ejs'),
      { labels }
    );

    // 6. launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // 7. generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });
    await browser.close();

    // 8. send back PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=labels.pdf');
    res.send(pdfBuffer);

  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
