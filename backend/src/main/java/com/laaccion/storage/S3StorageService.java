package com.laaccion.storage;

import com.laaccion.config.AppProperties;
import jakarta.annotation.PreDestroy;
import java.net.URI;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * Almacenamiento compatible con S3 (app.storage.type=s3): vale para Cloudflare R2, AWS S3,
 * Backblaze B2, MinIO... Las credenciales solo existen en el back; el front nunca las ve.
 */
@Service
@ConditionalOnProperty(prefix = "app.storage", name = "type", havingValue = "s3")
public class S3StorageService implements StorageService {

    private final S3Client client;
    private final String bucket;
    private final String publicBaseUrl;

    public S3StorageService(AppProperties properties) {
        AppProperties.Storage.S3 s3 = properties.storage().s3();
        require(s3.bucket(), "S3_BUCKET");
        require(s3.accessKey(), "S3_ACCESS_KEY");
        require(s3.secretKey(), "S3_SECRET_KEY");
        require(s3.publicBaseUrl(), "S3_PUBLIC_BASE_URL");
        this.bucket = s3.bucket();
        this.publicBaseUrl = s3.publicBaseUrl().replaceAll("/+$", "");

        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(StringUtils.hasText(s3.region()) ? s3.region() : "auto"))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(s3.accessKey(), s3.secretKey())))
                // Los proveedores compatibles con S3 no siempre admiten los checksums que el SDK
                // añade por defecto: se calculan solo cuando la operación los exige.
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED);
        if (StringUtils.hasText(s3.endpoint())) {
            // Endpoint propio (R2: https://<account-id>.r2.cloudflarestorage.com).
            builder.endpointOverride(URI.create(s3.endpoint())).forcePathStyle(true);
        }
        this.client = builder.build();
    }

    @Override
    public String store(String key, byte[] data, String contentType) {
        client.putObject(PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(contentType)
                        // El nombre del fichero es único y no cambia: se puede cachear para siempre.
                        .cacheControl("public, max-age=31536000, immutable")
                        .build(),
                RequestBody.fromBytes(data));
        return publicBaseUrl + "/" + key;
    }

    @Override
    public void delete(String key) {
        client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }

    @PreDestroy
    void close() {
        client.close();
    }

    private static void require(String value, String variable) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalStateException("app.storage.type=s3 pero falta la variable " + variable + ".");
        }
    }
}
