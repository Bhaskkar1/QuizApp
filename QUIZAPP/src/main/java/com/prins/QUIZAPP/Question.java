package com.prins.QUIZAPP;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

@Data
@Entity
@JsonPropertyOrder({
        "id",
        "question_title",
        "option1",
        "option2",
        "option3",
        "option4",
        "right_answer",
        "difficulty_level",
        "category"
})
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String question_title;
    private String option1;
    private String option2;
    private String option3;
    private String option4;
    private String right_answer;
    private String difficulty_level;
    private String category;




}