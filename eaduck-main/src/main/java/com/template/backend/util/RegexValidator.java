package com.template.backend.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Class responsible for validations using regular expressions.
 */
public class RegexValidator {

    public static final String PHONE_REGEX = "^(\\+?55\\s?)?(\\(?\\d{2}\\)?\\s?)?(9?\\d{4}-?\\d{4})$";
    public static final Pattern PHONE_PATTERN = Pattern.compile(PHONE_REGEX);
    public static final String SIZE_TEN = "^.{1,10}$";

    /**
     * Validates if the phoneNumber is valid.
     *
     * @param phoneNumber the phoneNumber to be validated
     * @return true if the phoneNumber is valid, false otherwise
     */
    public static boolean isValidPhone(String phoneNumber) {
        if (phoneNumber == null) {
            return false;
        }
        Matcher matcher = PHONE_PATTERN.matcher(phoneNumber);
        return matcher.matches();
    }

    /**
     * Validates if the text has a maximum size of X characters.
     *
     * @param text the text to be validated
     * @param regex the regular expression to be validated
     * @return true if the text has at most X characters, false otherwise
     */
    public static boolean TextSizeValidation(String text, String regex) {
        if (text == null) {
            return false;
        }
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(text);
        return matcher.matches();
    }
}
