package com.laaccion.tag;

import com.laaccion.common.PageResponse;
import com.laaccion.common.SlugGenerator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TagService {

    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<TagResponse> list(Pageable pageable) {
        return PageResponse.of(tagRepository.findAll(pageable), TagResponse::from);
    }

    /** Devuelve las etiquetas con esos nombres, creando las que aún no existan. */
    @Transactional
    public Set<Tag> resolve(List<String> names) {
        Map<String, String> nameBySlug = new LinkedHashMap<>();
        if (names != null) {
            for (String raw : names) {
                String name = raw == null ? "" : raw.trim().replaceAll("\\s+", " ");
                String slug = SlugGenerator.slugify(name);
                if (!slug.isEmpty()) {
                    nameBySlug.putIfAbsent(slug, name);
                }
            }
        }
        Set<Tag> tags = new LinkedHashSet<>();
        nameBySlug.forEach((slug, name) ->
                tags.add(tagRepository.findBySlug(slug).orElseGet(() -> tagRepository.save(new Tag(name, slug)))));
        return tags;
    }
}
