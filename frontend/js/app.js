document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('conversion-form');
    const fileInput = document.getElementById('file-upload');
    const fileCounter = document.querySelector('.file-counter');
    const directionSelect = document.getElementById('conversion-direction');
    const convertBtn = document.getElementById('convert-btn');
    const loading = document.getElementById('loading');
    const message = document.getElementById('message');
    
    // Max number of files allowed
    const MAX_FILES = 20;
    
    // Update file counter when files are selected
    fileInput.addEventListener('change', () => {
        const numFiles = fileInput.files.length;
        fileCounter.textContent = `${numFiles} file${numFiles !== 1 ? 's' : ''} selected (max ${MAX_FILES})`;
        
        // If too many files are selected, show warning and disable submit button
        if (numFiles > MAX_FILES) {
            showMessage(`Please select a maximum of ${MAX_FILES} files`, 'error');
            convertBtn.disabled = true;
        } else if (numFiles > 0) {
            hideMessage();
            convertBtn.disabled = false;
            validateFileSelection();
        } else {
            hideMessage();
            convertBtn.disabled = false;
        }
    });
    
    // Function to validate selected files based on the conversion direction
    function validateFileSelection() {
        const files = fileInput.files;
        const direction = directionSelect.value;
        
        if (!files || files.length === 0) return false;
        
        let invalidFiles = [];
        let validExtension = direction === 'word-to-pdf' ? '.docx' : '.pdf';
        
        // Check each file for valid extension
        for (let i = 0; i < files.length; i++) {
            const fileName = files[i].name.toLowerCase();
            if (direction === 'word-to-pdf' && !fileName.endsWith('.docx')) {
                invalidFiles.push(fileName);
            } else if (direction === 'pdf-to-word' && !fileName.endsWith('.pdf')) {
                invalidFiles.push(fileName);
            }
        }
        
        // Show error for invalid files
        if (invalidFiles.length > 0) {
            if (invalidFiles.length === 1) {
                showMessage(`File "${invalidFiles[0]}" is not a valid ${validExtension.substring(1).toUpperCase()} file`, 'error');
            } else if (invalidFiles.length <= 3) {
                showMessage(`Files ${invalidFiles.join(', ')} are not valid ${validExtension.substring(1).toUpperCase()} files`, 'error');
            } else {
                showMessage(`${invalidFiles.length} files are not valid ${validExtension.substring(1).toUpperCase()} files`, 'error');
            }
            return false;
        }
        
        // Hide any previous error messages
        hideMessage();
        return true;
    }
    
    // Update file input validator when direction changes
    directionSelect.addEventListener('change', () => {
        const direction = directionSelect.value;
        
        if (direction === 'word-to-pdf') {
            fileInput.accept = '.docx';
        } else {
            fileInput.accept = '.pdf';
        }
        
        // If a file is already selected, validate it
        if (fileInput.files.length > 0) {
            validateFileSelection();
        }
    });
    
    // Set initial accept attribute based on the default selected direction
    fileInput.accept = directionSelect.value === 'word-to-pdf' ? '.docx' : '.pdf';
    
    // Form submission handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Clear previous message
        hideMessage();
        
        // Validate the file selection
        if (!validateFileSelection()) {
            return;
        }
        
        // Check if number of files is within limit
        if (fileInput.files.length > MAX_FILES) {
            showMessage(`Please select a maximum of ${MAX_FILES} files`, 'error');
            return;
        }
        
        const files = fileInput.files;
        const direction = directionSelect.value;
        
        // Prepare form data
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }
        formData.append('direction', direction);
        
        try {
            // Show loading spinner
            showLoading(true);
            convertBtn.disabled = true;
            
            // Send request to the server
            const response = await fetch('/convert', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Conversion failed');
            }
            
            // Get the blob from response
            const blob = await response.blob();
            
            // Determine the filename
            let filename;
            if (files.length > 1) {
                filename = 'converted_files.zip';
            } else {
                if (direction === 'word-to-pdf') {
                    filename = files[0].name.replace('.docx', '.pdf');
                } else {
                    filename = files[0].name.replace('.pdf', '.docx');
                }
            }
            
            // Create a download link and trigger it
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // Show success message
            showMessage(`Conversion completed successfully! ${files.length > 1 ? 'ZIP archive' : 'File'} is downloading.`, 'success');
            
            // Reset the form and file counter
            form.reset();
            fileCounter.textContent = '0 files selected (max 20)';
            
        } catch (error) {
            console.error('Error during conversion:', error);
            showMessage(error.message || 'An error occurred during conversion. Please try again.', 'error');
        } finally {
            // Hide loading spinner
            showLoading(false);
            convertBtn.disabled = false;
        }
    });
    
    // Helper function to show/hide loading spinner
    function showLoading(show) {
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }
    
    // Helper function to show message
    function showMessage(text, type) {
        message.textContent = text;
        message.className = ''; // Clear previous classes
        message.classList.add(type);
        message.classList.remove('hidden');
    }
    
    // Helper function to hide message
    function hideMessage() {
        message.classList.add('hidden');
        message.textContent = '';
    }
});