package com.eaduck.backend.service;

import com.eaduck.backend.repository.DummyRepository;
import com.eaduck.backend.model.dummy.Dummy;
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
