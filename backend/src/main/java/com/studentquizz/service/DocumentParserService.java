package com.studentquizz.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DocumentParserService {

    public String extractText(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            return "";
        }

        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        
        if (fileName.endsWith(".pdf") || "application/pdf".equals(file.getContentType())) {
            try (PDDocument document = PDDocument.load(file.getInputStream())) {
                PDFTextStripper stripper = new PDFTextStripper();
                return stripper.getText(document);
            }
        } else if (fileName.endsWith(".docx") || "application/vnd.openxmlformats-officedocument.wordprocessingml.document".equals(file.getContentType())) {
            try (XWPFDocument doc = new XWPFDocument(file.getInputStream());
                 XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
                return extractor.getText();
            }
        }
        
        throw new RuntimeException("Định dạng file không được hỗ trợ. Chỉ hỗ trợ PDF và DOCX.");
    }
}
