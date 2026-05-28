from pathlib import Path

from pypdf import PdfReader


SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md"}


def parse_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(page.strip() for page in pages if page.strip())


def parse_txt(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def parse_markdown(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def extract_document_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return parse_pdf(path)
    if suffix == ".txt":
        return parse_txt(path)
    if suffix == ".md":
        return parse_markdown(path)
    raise ValueError(f"Unsupported file type: {suffix}")
