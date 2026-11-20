package com.laaccion.poll;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "poll_option")
public class PollOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "poll_id", nullable = false)
    private Poll poll;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    /** Contador agregado. Solo se incrementa con una sentencia UPDATE atómica (ver repositorio). */
    @Column(name = "votes_count", nullable = false)
    private long votesCount;

    protected PollOption() {
    }

    PollOption(Poll poll, String label, int sortOrder) {
        this.poll = poll;
        this.label = label;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public Poll getPoll() { return poll; }
    public String getLabel() { return label; }
    public int getSortOrder() { return sortOrder; }
    public long getVotesCount() { return votesCount; }
}
