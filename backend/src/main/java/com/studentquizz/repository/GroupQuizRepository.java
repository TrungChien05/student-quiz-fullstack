package com.studentquizz.repository;

import com.studentquizz.model.GroupQuiz;
import com.studentquizz.model.Quiz;
import com.studentquizz.model.StudyGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GroupQuizRepository extends JpaRepository<GroupQuiz, Long> {
    List<GroupQuiz> findByStudyGroupOrderByAssignedAtDesc(StudyGroup studyGroup);
    Optional<GroupQuiz> findByStudyGroupAndQuiz(StudyGroup studyGroup, Quiz quiz);
    long countByStudyGroup(StudyGroup studyGroup);
}
