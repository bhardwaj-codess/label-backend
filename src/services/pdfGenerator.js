const puppeteer = require('puppeteer');

let browser = null;
let launchPromise = null;

/**
 * Initiates or returns a running Puppeteer browser singleton.
 * Employs clean concurrency controls to prevent multiple launch commands in parallel.
 */
async function getBrowser() {
  if (browser && browser.connected) {
    return browser;
  }

  if (launchPromise) {
    return launchPromise;
  }

  console.log('[PDF Generator] Initializing shared Puppeteer browser instance...');
  launchPromise = puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ]
  }).then(b => {
    browser = b;
    launchPromise = null;
    console.log('[PDF Generator] Shared Puppeteer browser launched successfully.');
    
    // Monitor process connection state
    browser.on('disconnected', () => {
      console.warn('[PDF Generator] Puppeteer browser disconnected. Cleaning up cache...');
      browser = null;
    });

    return browser;
  }).catch(err => {
    launchPromise = null;
    console.error('[PDF Generator] Failed to launch Puppeteer browser:', err);
    throw err;
  });

  return launchPromise;
}

/**
 * Generates a PDF buffer from HTML content with performance request filtering.
 *
 * @param {string} htmlContent - The rendered HTML page.
 * @param {Object} [options={}] - Page print settings.
 * @returns {Promise<Buffer>} The output PDF buffer.
 */
async function generatePdfFromHtml(htmlContent, options = {}) {
  const startTime = Date.now();
  const browserInstance = await getBrowser();
  
  // Create an isolated window/tab context
  const page = await browserInstance.newPage();
  
  try {
    // Optimization: Intercept all outgoing web requests.
    // Since images/logo/QR are base64, we block fonts, external CSS, scripts, and media to prevent unnecessary I/O or network delays.
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'image' || type === 'stylesheet' || type === 'font' || type === 'script' || type === 'media') {
        if (req.url().startsWith('data:')) {
          req.continue();
        } else {
          req.abort();
        }
      } else {
        req.continue();
      }
    });

    // Populate contents instantly
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    
    // Render PDF buffer to memory
    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      printBackground: options.printBackground !== false,
      margin: options.margin || { top: '10px', bottom: '10px', left: '10px', right: '10px' }
    });
    
    console.log(`[PDF Generator] Rendered labels to PDF in ${Date.now() - startTime}ms.`);
    return pdfBuffer;
  } catch (error) {
    console.error('[PDF Generator] Error during HTML to PDF conversion:', error);
    throw error;
  } finally {
    // Crucial: Clean up page connection to prevent memory leakage
    await page.close();
  }
}

// Handle clean shutdown under process terminal signals
process.on('SIGTERM', async () => {
  if (browser) {
    console.log('[PDF Generator] SIGTERM received. Closing browser instance...');
    await browser.close();
  }
});

module.exports = {
  generatePdfFromHtml
};
