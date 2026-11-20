package com.laaccion.image;

import com.laaccion.article.ArticleRepository;
import com.laaccion.audit.AuditService;
import com.laaccion.common.PageResponse;
import com.laaccion.common.RateLimiter;
import com.laaccion.common.error.BadRequestException;
import com.laaccion.common.error.ConflictException;
import com.laaccion.common.error.NotFoundException;
import com.laaccion.common.error.TooManyRequestsException;
import com.laaccion.config.AppProperties;
import com.laaccion.security.AppUserPrincipal;
import com.laaccion.storage.StorageService;
import com.laaccion.user.UserRepository;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Iterator;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImageService {

    private final ImageRepository imageRepository;
    private final ArticleRepository articleRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;
    private final RateLimiter rateLimiter;
    private final AuditService auditService;
    private final AppProperties properties;
    private final Clock clock;

    public ImageService(ImageRepository imageRepository, ArticleRepository articleRepository,
            UserRepository userRepository, StorageService storageService, RateLimiter rateLimiter,
            AuditService auditService, AppProperties properties, Clock clock) {
        this.imageRepository = imageRepository;
        this.articleRepository = articleRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
        this.rateLimiter = rateLimiter;
        this.auditService = auditService;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResponse<ImageResponse> list(Pageable pageable) {
        return PageResponse.of(imageRepository.findAll(pageable), ImageResponse::from);
    }

    @Transactional
    public ImageResponse upload(MultipartFile file, AppUserPrincipal me) {
        if (!rateLimiter.tryAcquire("upload:" + me.getId(), properties.rateLimit().uploadPerMinute(),
                Duration.ofMinutes(1))) {
            throw new TooManyRequestsException("Demasiadas subidas seguidas. Espera un minuto.");
        }
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("No se ha enviado ninguna imagen.");
        }
        if (file.getSize() > properties.images().maxSizeBytes()) {
            throw new BadRequestException("La imagen supera el tamaño máximo permitido.");
        }

        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException ex) {
            throw new BadRequestException("No se ha podido leer la imagen enviada.");
        }

        // Tipo real por contenido; se ignoran el nombre y el Content-Type que manda el cliente.
        ImageType type = ImageTypeDetector.detect(data)
                .orElseThrow(() -> new BadRequestException("Formato no admitido. Usa JPEG, PNG, WebP, GIF o AVIF."));
        int[] dimensions = readDimensions(data, type);

        Instant now = clock.instant();
        ZonedDateTime date = now.atZone(ZoneOffset.UTC);
        // Nombre nuevo generado por el servidor: nada del nombre original llega al almacenamiento.
        String key = "%d/%02d/%s.%s".formatted(date.getYear(), date.getMonthValue(), UUID.randomUUID(),
                type.extension());
        String url = storageService.store(key, data, type.contentType());

        Image image = imageRepository.save(new Image(key, url, type.contentType(), data.length,
                dimensions == null ? null : dimensions[0], dimensions == null ? null : dimensions[1],
                userRepository.getReferenceById(me.getId()), now));
        auditService.record("IMAGE_UPLOADED", "image", image.getId(), key);
        return ImageResponse.from(image);
    }

    @Transactional
    public void delete(Long id, AppUserPrincipal me) {
        Image image = imageRepository.findById(id).orElseThrow(() -> new NotFoundException("Imagen no encontrada."));
        if (!me.isAdmin() && !image.getUploadedBy().getId().equals(me.getId())) {
            throw new AccessDeniedException("Solo puedes borrar las imágenes que has subido tú.");
        }
        if (articleRepository.existsByFeaturedImageId(id)) {
            throw new ConflictException("La imagen es la destacada de algún artículo. Cámbiala antes de borrarla.");
        }
        imageRepository.delete(image);
        imageRepository.flush();
        storageService.delete(image.getStorageKey());
        auditService.record("IMAGE_DELETED", "image", id, image.getStorageKey());
    }

    /**
     * Lee ancho y alto de la cabecera (sin descodificar la imagen entera) y rechaza ficheros
     * corruptos o de dimensiones desproporcionadas. Java no trae lector de WebP ni AVIF: para
     * esos formatos se devuelve {@code null} y solo cuenta la comprobación de tipo y tamaño.
     */
    private int[] readDimensions(byte[] data, ImageType type) {
        if (type == ImageType.WEBP || type == ImageType.AVIF) {
            return null;
        }
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(data))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw new BadRequestException("La imagen está dañada o no es válida.");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                int max = properties.images().maxDimension();
                if (width <= 0 || height <= 0 || width > max || height > max) {
                    throw new BadRequestException("La imagen es demasiado grande: máximo " + max + " px por lado.");
                }
                return new int[] {width, height};
            } finally {
                reader.dispose();
            }
        } catch (IOException ex) {
            throw new BadRequestException("La imagen está dañada o no es válida.");
        }
    }
}
