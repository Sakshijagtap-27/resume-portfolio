const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Using promises version of fs for async file operations
const { exec } = require('child_process');
const handlebars = require('handlebars');
const zip = require('express-zip');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS
app.use(cors());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Serve the frontend
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Handle resume upload
app.post('/upload', upload.single('resume'), async (req, res, next) => {
  const filePath = req.file.path;
  console.log(`File uploaded: ${filePath}`);

  try {
    // Execute Python script to parse resume
    const { stdout, stderr } = await executePythonScript(filePath);

    console.log('Python script output:', stdout);
    console.error('Python script stderr:', stderr);

    let parsedData;
    try {
      parsedData = JSON.parse(stdout);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(500).json({ error: 'Error parsing resume data', details: parseError.message });
    }

    console.log('Parsed data:', parsedData);

    // Generate portfolio HTML
    const portfolioHTML = await generatePortfolioHTML(parsedData);

    // Write portfolio HTML to file
    const outputFilePath = path.join(__dirname, 'public', 'portfolios', `${parsedData.name}.html`);
    await fs.writeFile(outputFilePath, portfolioHTML);

    console.log(`Portfolio generated: ${outputFilePath}`);

    // Create zip archive with portfolio and related files
    res.zip([
      { path: outputFilePath, name: 'portfolio.html' },
      { path: path.join(__dirname, 'templates', 'portfolio-template.html'), name: 'template.html' },
      // Adjust path to your actual CSS file
      { path: path.join(__dirname, 'public', 'styles.css'), name: 'styles.css' }
    ], `${parsedData.name}-portfolio.zip`, (zipError) => {
      if (zipError) {
        console.error('Zip error:', zipError);
        return next(zipError); // Pass error to Express error handler
      }

      console.log('Zip file created and sent');
    });
  } catch (error) {
    console.error('Error processing resume:', error);
    return next(error); // Pass error to Express error handler
  }
});

// Error handler middleware
app.use((err, req, res, _next) => {
  console.error('Error handler middleware:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Function to execute Python script
function executePythonScript(filePath) {
  return new Promise((resolve, reject) => {
    exec(`python parse_resume.py ${filePath}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Function to generate portfolio HTML using Handlebars
async function generatePortfolioHTML(data) {
  try {
    const template = await fs.readFile(path.join(__dirname, 'templates', 'portfolio-template.html'), 'utf8');
    const compiledTemplate = handlebars.compile(template);
    const html = compiledTemplate(data);
    return html; // Ensure to return the HTML string synchronously
  } catch (error) {
    throw new Error(`Error reading or compiling template: ${error.message}`);
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
