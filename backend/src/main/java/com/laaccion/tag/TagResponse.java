package com.laaccion.tag;

public record TagResponse(String name, String slug) {

    public static TagResponse from(Tag tag) {
        return new TagResponse(tag.getName(), tag.getSlug());
    }
}
