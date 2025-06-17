package com.eaduck.backend.model.classroom.dto;

import com.eaduck.backend.model.classroom.Classroom;

public class ClassroomDashboardDTO {
    private Long id;
    private String name;
    private String academicYear;
    private int taskCount;

    public ClassroomDashboardDTO(Classroom classroom) {
        this.id = classroom.getId();
        this.name = classroom.getName();
        this.academicYear = classroom.getAcademicYear();
        this.taskCount = classroom.getTasks() != null ? classroom.getTasks().size() : 0;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getAcademicYear() { return academicYear; }
    public int getTaskCount() { return taskCount; }

    public void setId(Long id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }
    public void setTaskCount(int taskCount) { this.taskCount = taskCount; }
} 