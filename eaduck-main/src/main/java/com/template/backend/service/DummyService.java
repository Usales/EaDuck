package com.template.backend.service;

import com.template.backend.repository.DummyRepository;
import com.template.backend.model.dummy.Dummy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;


/**
 * Dummies related operations.
 */
@Service
public class DummyService {

    @Autowired
    private DummyRepository dummyRepository;


    /**
     * Find all active Dummies.
     *
     * @return List of all valid dummies.
     */
    public List<Dummy> findDummies(){
        return dummyRepository.findAll();
    }

}
