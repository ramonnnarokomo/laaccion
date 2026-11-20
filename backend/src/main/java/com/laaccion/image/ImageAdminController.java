package com.laaccion.image;

import com.laaccion.common.PageResponse;
import com.laaccion.common.Pagination;
import com.laaccion.security.AppUserPrincipal;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Biblioteca de imágenes del panel editorial. */
@RestController
@RequestMapping("/api/v1/admin/images")
@PreAuthorize("hasAnyRole('ADMIN', 'EDITOR')")
public class ImageAdminController {

    private final ImageService imageService;

    public ImageAdminController(ImageService imageService) {
        this.imageService = imageService;
    }

    @GetMapping
    public PageResponse<ImageResponse> list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        return imageService.list(Pagination.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
    }

    /** Subida en multipart/form-data, con el fichero en el campo {@code file}. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ImageResponse upload(@RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal AppUserPrincipal me) {
        return imageService.upload(file, me);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal AppUserPrincipal me) {
        imageService.delete(id, me);
    }
}
