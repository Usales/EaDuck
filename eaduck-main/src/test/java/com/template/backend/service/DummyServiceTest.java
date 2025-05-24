package com.template.backend.service;

import com.template.backend.model.dummy.Dummy;
import com.template.backend.repository.DummyRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

/**
 * Unit tests for {@link DummyService}.
 */
@ExtendWith(MockitoExtension.class)
public class DummyServiceTest {

    @InjectMocks
    DummyService dummyService;
    @Mock
    DummyRepository dummyRepository;


    /**
     * Tests the method findDummies() of the DummyService class.
     * Verifies that the returned list of DummyResponseDTO is not null.
     */
    @Test
    void shouldReturnDummies(){
       /*when(dummyRepository.findAllDummies()).thenReturn(List.of(getDummy()));*/
        List<Dummy> dummy = dummyService.findDummies();
        Assertions.assertNotNull(dummy);
    }

}
