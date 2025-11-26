package com.eaduck.backend.model.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceBulkDTO {
    private Long classroomId;
    private LocalDate date;
    private String discipline;
    private String period;
    private List<StudentAttendanceDTO> students;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentAttendanceDTO {
        private Long studentId;
        private String status; // PRESENT, ABSENT, LATE
        private String arrivalTime; // HH:mm format
        private String observations;
    }
}

