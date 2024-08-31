import sys
import json
import pdfplumber

def parse_resume(file_path):
    with pdfplumber.open(file_path) as pdf:
        # Initialize an empty text variable to store all extracted text
        text = ""
        
        # Iterate through each page in the PDF
        for page in pdf.pages:
            # Extract text from the current page
            page_text = page.extract_text()
            
            # Append the extracted text to the overall text variable
            text += page_text + "\n\n"  # Adding newlines between pages
        
    # You can add additional processing steps here based on your needs
    
    return {'text': text}  # Returning as a dictionary for JSON serialization

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python parse_resume.py <path_to_resume>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    parsed_data = parse_resume(file_path)
    print(json.dumps(parsed_data, indent=4))
