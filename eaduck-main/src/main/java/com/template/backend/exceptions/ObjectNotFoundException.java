package com.template.backend.exceptions;

/**
 * Exception that can be thrown to indicate that a specific object was not found in the system.
 * This exception extends the RuntimeException class to allow it to be thrown without explicit declaration.
 */
public class ObjectNotFoundException extends RuntimeException {

    /**
     * Constructor that receives an error message to describe the cause of the exception.
     *
     * @param message Message that describes the specific cause of the exception.
     */
    public ObjectNotFoundException(String message) {
        super(message);
    }
}
