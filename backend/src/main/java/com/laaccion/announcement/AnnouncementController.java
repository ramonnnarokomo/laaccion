package com.laaccion.announcement;

import com.laaccion.announcement.AnnouncementDtos.BoardResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** El Tablón público. La lista ya viene acotada (10 vigentes + 25 caducados), por eso no se pagina. */
@RestController
@RequestMapping("/api/v1/announcements")
public class AnnouncementController {

    private final AnnouncementService announcementService;

    public AnnouncementController(AnnouncementService announcementService) {
        this.announcementService = announcementService;
    }

    @GetMapping("/board")
    public BoardResponse board() {
        return announcementService.board();
    }
}
