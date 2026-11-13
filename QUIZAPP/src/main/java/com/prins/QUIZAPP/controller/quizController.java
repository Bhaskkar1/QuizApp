package com.prins.QUIZAPP.controller;

import com.prins.QUIZAPP.Question;
import com.prins.QUIZAPP.service.QuestionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("question")
public class quizController {
    @Autowired
    QuestionService questionService;
    @GetMapping("allquestion")
    public List<Question> getAllQuestion(){
     return questionService.getAllQuestion();
    }
    @GetMapping("category/{category}")
    public List<Question> getQuestionByCategory(@PathVariable String category){
        return  questionService.getQuestionsByCategory(category);

    }
    @PostMapping("add")
    public String addQuestion(@RequestBody Question question) {
        questionService.addQuestion(question);
        return "Question added successfully";

    }
    @DeleteMapping("delete/{id}")
    public String deleteQuestion(@PathVariable Integer id){
        questionService.deleteQuestion(id);
        return "Sucessfully deleted!";
    }
}
