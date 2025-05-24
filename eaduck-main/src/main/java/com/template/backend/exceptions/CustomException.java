package com.template.backend.exceptions;

/**
 * Custom exception that can be thrown to indicate specific errors in the system.
 * This exception extends RuntimeException to allow it to be thrown without the need for explicit declaration.
 */
public class CustomException extends RuntimeException {

    /**
     * Constructor that receives an error message to describe the cause of the exception.
     *
     * @param message Message describing the specific cause of the exception.
     */
    public CustomException(String message) {
        super(message);
    }
}
