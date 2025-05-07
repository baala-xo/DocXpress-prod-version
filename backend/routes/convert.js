const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueFilename = `${uuidv4()}-${file.originalname}`;
        cb(null, uniqueFilename);
    }
});

// File filter to only accept PDF and DOCX
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF and DOCX files are allowed'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

// Convert endpoint for multiple files
router.post('/', upload.array('files', 20), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const { direction } = req.body;
    if (!direction || !['word-to-pdf', 'pdf-to-word'].includes(direction)) {
        // Clean up the uploaded files
        req.files.forEach(file => {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        });
        return res.status(400).json({ error: 'Invalid conversion direction' });
    }

    // Create a unique folder for this batch job
    const batchId = uuidv4();
    const batchDir = path.join(__dirname, '../uploads', batchId);
    fs.mkdirSync(batchDir, { recursive: true });
    
    // Track all conversion operations
    const conversions = [];
    const outputFiles = [];
    const fileErrors = [];
    
    try {
        // Set up a script path based on conversion direction
        const scriptPath = direction === 'word-to-pdf' 
            ? path.join(__dirname, '../scripts/convert_word_to_pdf.py')
            : path.join(__dirname, '../scripts/convert_pdf_to_word.py');
        
        // Process each file
        for (const file of req.files) {
            const fileExt = path.extname(file.originalname).toLowerCase();
            const baseName = path.basename(file.originalname, fileExt);
            
            // Check if the file has the correct extension for the selected direction
            if ((direction === 'word-to-pdf' && fileExt !== '.docx') || 
                (direction === 'pdf-to-word' && fileExt !== '.pdf')) {
                fileErrors.push(`${file.originalname} - incorrect file type for the selected conversion direction`);
                continue;
            }
            
            // Create output path
            const outputExt = direction === 'word-to-pdf' ? '.pdf' : '.docx';
            const outputPath = path.join(batchDir, `${baseName}${outputExt}`);
            
            // Add this conversion to our list
            conversions.push({ 
                scriptPath, 
                inputPath: file.path,
                outputPath,
                originalName: file.originalname
            });
            
            outputFiles.push({
                path: outputPath,
                originalName: `${baseName}${outputExt}`
            });
        }
        
        // Execute all conversion processes
        await Promise.all(conversions.map(job => runPythonScript(job.scriptPath, job.inputPath, job.outputPath)
            .catch(error => {
                fileErrors.push(`${job.originalName} - ${error.message}`);
            })
        ));
        
        // Filter out files that failed conversion
        const successfulOutputs = outputFiles.filter(file => fs.existsSync(file.path));
        
        // If no files were successfully converted
        if (successfulOutputs.length === 0) {
            throw new Error('No files were successfully converted');
        }
        
        // If single file was converted, send directly
        if (successfulOutputs.length === 1 && req.files.length === 1) {
            const outputFile = successfulOutputs[0];
            return res.download(outputFile.path, outputFile.originalName, (err) => {
                // Clean up files after download
                cleanupFiles(req.files, successfulOutputs);
                
                if (err) {
                    console.error('Error during file download:', err);
                }
            });
        }
        
        // For multiple files, create a ZIP archive
        const zipPath = path.join(__dirname, '../uploads', `${batchId}.zip`);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });
        
        // Set up archive error handling
        archive.on('error', (err) => {
            throw err;
        });
        
        // Pipe archive data to the output file
        archive.pipe(output);
        
        // Add each successfully converted file to the archive
        successfulOutputs.forEach(file => {
            archive.file(file.path, { name: file.originalName });
        });
        
        // If there were errors, add a report file
        if (fileErrors.length > 0) {
            const errorReport = `Conversion Errors:\n${fileErrors.join('\n')}`;
            archive.append(Buffer.from(errorReport), { name: 'conversion_errors.txt' });
        }
        
        // Finalize the archive
        await archive.finalize();
        
        // Wait for the archive to be fully written
        output.on('close', () => {
            // Send the zip file to the client
            res.download(zipPath, 'converted_files.zip', (err) => {
                // Clean up all files after download
                cleanupFiles(req.files, successfulOutputs);
                if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
                if (fs.existsSync(batchDir)) fs.rmSync(batchDir, { recursive: true, force: true });
                
                if (err) {
                    console.error('Error during zip file download:', err);
                }
            });
        });
        
    } catch (error) {
        console.error('Batch conversion error:', error);
        // Clean up the uploaded files
        cleanupFiles(req.files, outputFiles);
        
        // Clean up batch directory if it exists
        if (fs.existsSync(batchDir)) {
            fs.rmSync(batchDir, { recursive: true, force: true });
        }
        
        return res.status(500).json({ 
            error: `Conversion failed: ${error.message}`,
            fileErrors: fileErrors.length > 0 ? fileErrors : undefined
        });
    }
});

// Helper function to run Python scripts
function runPythonScript(scriptPath, inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const process = spawn('python', [scriptPath, inputPath, outputPath]);
        
        let errorData = '';
        
        process.stderr.on('data', (data) => {
            errorData += data.toString();
        });
        
        process.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`Python script exited with code ${code}: ${errorData}`));
            }
            resolve();
        });
    });
}

// Helper function to clean up files
function cleanupFiles(inputFiles, outputFiles) {
    // Clean up input files
    inputFiles.forEach(file => {
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    });
    
    // Clean up output files
    outputFiles.forEach(file => {
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    });
}

module.exports = router;

module.exports = router;