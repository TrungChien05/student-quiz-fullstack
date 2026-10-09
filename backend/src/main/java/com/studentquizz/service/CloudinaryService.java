package com.studentquizz.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(
            @Value("${cloudinary.cloud-name}") String cloudName,
            @Value("${cloudinary.api-key}") String apiKey,
            @Value("${cloudinary.api-secret}") String apiSecret) {
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true
        ));
    }

    /**
     * Upload file lên Cloudinary.
     * Ảnh → folder "studentquizz/images"
     * Tài liệu → folder "studentquizz/files" dưới dạng raw
     *
     * @param file MultipartFile từ request
     * @return Map chứa { url, name, type }
     */
    @SuppressWarnings("unchecked")
    public Map<String, String> upload(MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename() != null
                ? file.getOriginalFilename() : "file";

        String contentType = file.getContentType() != null
                ? file.getContentType() : "application/octet-stream";

        // Kiểm tra extension
        int dotIndex = originalFilename.lastIndexOf('.');
        String ext = dotIndex >= 0 ? originalFilename.substring(dotIndex).toLowerCase() : "";

        List<String> allowedExtensions = Arrays.asList(
                ".png", ".jpg", ".jpeg", ".gif", ".webp",
                ".pdf", ".doc", ".docx", ".ppt", ".pptx",
                ".xls", ".xlsx", ".txt", ".csv"
        );
        if (!allowedExtensions.contains(ext)) {
            throw new IllegalArgumentException(
                "Chỉ chấp nhận ảnh, PDF, Word, PowerPoint, Excel, TXT hoặc CSV.");
        }

        // Giới hạn 20MB
        if (file.getSize() > 20L * 1024 * 1024) {
            throw new IllegalArgumentException("Tệp không được vượt quá 20MB.");
        }

        boolean isImage = List.of(".png", ".jpg", ".jpeg", ".gif", ".webp").contains(ext);

        Map<String, Object> options;
        String randomId = java.util.UUID.randomUUID().toString();

        if (isImage) {
            String nameWithoutExt = dotIndex >= 0 ? originalFilename.substring(0, dotIndex) : originalFilename;
            String cleanName = nameWithoutExt.replaceAll("[^a-zA-Z0-9.-]", "_");
            if (cleanName.length() > 60) {
                cleanName = cleanName.substring(0, 60);
            }
            String publicId = "studentquizz/images/" + randomId + "_" + cleanName;

            options = ObjectUtils.asMap(
                    "public_id", publicId,
                    "resource_type", "image"
            );
        } else {
            String cleanName = originalFilename.replaceAll("[^a-zA-Z0-9.-]", "_");
            if (cleanName.length() > 80) {
                cleanName = cleanName.substring(cleanName.length() - 80);
            }
            String publicId = "studentquizz/files/" + randomId + "_" + cleanName;

            options = ObjectUtils.asMap(
                    "public_id", publicId,
                    "resource_type", "raw"
            );
        }

        Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), options);

        String secureUrl = (String) result.get("secure_url");

        return Map.of(
                "url", secureUrl,
                "name", originalFilename,
                "type", contentType
        );
    }
}
