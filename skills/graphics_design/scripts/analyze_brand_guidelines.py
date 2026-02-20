
import sys
import subprocess
import os

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

try:
    import pypdf
except ImportError:
    print("pypdf not found, installing...")
    install("pypdf")
    import pypdf

def extract_text_from_pdf(pdf_path):
    print(f"Analyzing {pdf_path}...")
    try:
        reader = pypdf.PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        return f"Error reading PDF: {e}"

if __name__ == "__main__":
    pdf_path = r"c:/Users/damse/OneDrive/Documents/AntiGravity Workspaces/Mosaic/AI-llergy/skills/graphics_design/resources/BrandGuidelines_Mosaic.pdf"
    if os.path.exists(pdf_path):
        content = extract_text_from_pdf(pdf_path)
        print("--- EXTRACTED CONTENT ---")
        print(content)
        print("--- END CONTENT ---")
    else:
        print(f"File not found: {pdf_path}")
