#!/usr/bin/env python3
"""
Convert Word (.docx) document to PDF.
Usage: python convert_word_to_pdf.py <input_docx_path> <output_pdf_path>
"""

import sys
import os
from docx2pdf import convert
import traceback

def validate_input(input_path, output_path):
    """Validate the input and output paths."""
    # Check if input file exists
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file does not exist: {input_path}")
    
    # Check if input file is a Word document
    if not input_path.lower().endswith('.docx'):
        raise ValueError(f"Input file must be a .docx file: {input_path}")
    
    # Check if output path is valid
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        raise FileNotFoundError(f"Output directory does not exist: {output_dir}")
    
    # Check if output file has PDF extension
    if not output_path.lower().endswith('.pdf'):
        raise ValueError(f"Output file must have .pdf extension: {output_path}")

def convert_word_to_pdf(input_path, output_path):
    """Convert Word document to PDF."""
    try:
        validate_input(input_path, output_path)
        convert(input_path, output_path)
        
        # Verify the output file was created
        if not os.path.exists(output_path):
            raise RuntimeError(f"Conversion failed: Output file not created at {output_path}")
            
        print(f"Successfully converted {input_path} to {output_path}")
        return True
    except Exception as e:
        print(f"Error converting Word to PDF: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return False

if __name__ == "__main__":
    # Check if correct number of arguments are provided
    if len(sys.argv) != 3:
        print("Usage: python convert_word_to_pdf.py <input_docx_path> <output_pdf_path>", file=sys.stderr)
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    success = convert_word_to_pdf(input_path, output_path)
    sys.exit(0 if success else 1)