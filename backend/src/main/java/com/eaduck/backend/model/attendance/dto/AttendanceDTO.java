package com.eaduck.backend.model.attendance.dto;

import com.eaduck.backend.model.enums.AttendanceStatus;
import com.eaduck.backend.model.enums.Period;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceDTO {
    private Long id;
    private Long classroomId;
    private String classroomName;
    private Long studentId;
    private String studentName;
    private LocalDate date;
    private AttendanceStatus status;
    private LocalTime arrivalTime;
    private String observations;
    private String discipline;
    private Period period;
    private Long teacherId;
    private String teacherName;
}

