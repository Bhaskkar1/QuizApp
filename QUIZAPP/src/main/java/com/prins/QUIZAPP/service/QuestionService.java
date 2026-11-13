package com.prins.QUIZAPP.service;

import com.prins.QUIZAPP.Dao.QuestionDao;
import com.prins.QUIZAPP.Question;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class QuestionService {
    @Autowired
    QuestionDao questionDao;
    public List<Question> getAllQuestion(){
    return questionDao.findAll();

    }

    public List<Question> getQuestionsByCategory(String category) {

        return questionDao.findByCategory(category);
    }
    public String addQuestion(Question question) {
         questionDao.save(question);
         return "Sucess";
    }

    public void deleteQuestion(Integer id) {
        questionDao.deleteById(id);
    }
}
