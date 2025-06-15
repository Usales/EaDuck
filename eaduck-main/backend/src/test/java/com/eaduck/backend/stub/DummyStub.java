package com.eaduck.backend.stub;

import com.eaduck.backend.model.dummy.Dummy;

public class DummyStub {

    public static Dummy getDummy() {
        return Dummy.builder()
                .name("João da Silva")
                .status(true)
                .build();
    }

}
