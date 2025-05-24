package com.template.backend.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import javax.servlet.http.HttpServletRequest;

/**
 * Class for global exception handling thrown by controllers.
 * Centralizes the handling of specific exceptions and defines how
 * appropriate HTTP responses should be returned.
 */
@ControllerAdvice
public class ControllerExceptionHandler {

    /**
     * Handles exceptions of type BusinessException.
     *
     * @param ex Thrown BusinessException.
     * @param request HTTP request in which the exception was thrown.
     * @return ResponseEntity containing a StandardError object with error details and HTTP status 422 (Unprocessable Entity).
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<StandardError> handleNegocioException(BusinessException ex,
                                                                HttpServletRequest request) {
        StandardError error = new StandardError(System.currentTimeMillis(), HttpStatus.UNPROCESSABLE_ENTITY.value(),
                "Business Exception", ex.getMessage(), request.getRequestURI());

        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(error);
    }

    /**
     * Handles exceptions of type ObjectsNotFoundException.
     *
     * @param ex Thrown ObjectsNotFoundException.
     * @param request HTTP request in which the exception was thrown.
     * @return ResponseEntity containing a StandardError object with error details and HTTP status 404 (Not Found).
     */
    @ExceptionHandler(ObjectNotFoundException.class)
    public ResponseEntity<StandardError> handleCustomException(ObjectNotFoundException ex,
                                                               HttpServletRequest request) {
        StandardError error = new StandardError(System.currentTimeMillis(), HttpStatus.NOT_FOUND.value(),
                "ObjectNotFoundException Exception", ex.getMessage(), request.getRequestURI());

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    /**
     * Handles exceptions of type CustomException.
     *
     * @param ex Thrown CustomException.
     * @param request HTTP request in which the exception was thrown.
     * @return ResponseEntity containing a StandardError object with error details and HTTP status 400 (Bad Request).
     */
    @ExceptionHandler(CustomException.class)
    public ResponseEntity<StandardError> handleCustomException(CustomException ex,
                                                               HttpServletRequest request) {
        StandardError error = new StandardError(System.currentTimeMillis(), HttpStatus.BAD_REQUEST.value(),
                "Custom Exception", ex.getMessage(), request.getRequestURI());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
}
