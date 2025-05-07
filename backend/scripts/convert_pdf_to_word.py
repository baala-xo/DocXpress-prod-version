#!/usr/bin/env python3
"""
Convert PDF to Word (.docx) document.
Usage: python convert_pdf_to_word.py <input_pdf_path> <output_docx_path>
"""

import sys
import os
from pdf2docx import Converter
import traceback

def validate_input(input_path, output_path):
    """Validate the input and output paths."""
    # Check if input file exists
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file does not exist: {input_path}")
    
    # Check if input file is a PDF
    if not input_path.lower().endswith('.pdf'):
        raise ValueError(f"Input file must be a .pdf file: {input_path}")
    
    # Check if output path is valid
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        raise FileNotFoundError(f"Output directory does not exist: {output_dir}")
    
    # Check if output file has docx extension
    if not output_path.lower().endswith('.docx'):
        raise ValueError(f"Output file must have .docx extension: {output_path}")

def convert_pdf_to_word(input_path, output_path):
    """Convert PDF to Word document."""
    try:
        validate_input(input_path, output_path)
        
        # Convert PDF to Word
        cv = Converter(input_path)
        cv.convert(output_path)
        cv.close()
        
        # Verify the output file was created
        if not os.path.exists(output_path):
            raise RuntimeError(f"Conversion failed: Output file not created at {output_path}")
            
        print(f"Successfully converted {input_path} to {output_path}")
        return True
    except Exception as e:
        print(f"Error converting PDF to Word: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return False

if __name__ == "__main__":
    # Check if correct number of arguments are provided
    if len(sys.argv) != 3:
        print("Usage: python convert_pdf_to_word.py <input_pdf_path> <output_docx_path>", file=sys.stderr)
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    success = convert_pdf_to_word(input_path, output_path)
    sys.exit(0 if success else 1)