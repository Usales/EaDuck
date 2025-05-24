package com.template.backend.stub;

import com.template.backend.model.dummy.Dummy;

public class DummyStub {

    public static Dummy getDummy() {
        return Dummy.builder()
                .name("João da Silva")
                .status(true)
                .build();
    }

}
