package com.template.backend.controller;

import com.template.backend.model.dummy.Dummy;
import com.template.backend.service.DummyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * RestController for operations related to dummies.
 */
@RestController
@RequestMapping("/api/dummy")
@CrossOrigin(origins = "*")
public class DummyController {

    @Autowired
    private DummyService dummyService;

    /**
     * Endpoint to retrieve all active dummies.
     *
     * @return ResponseEntity with the list of found dummies or an empty list (200).
     */
    @GetMapping(produces = { MediaType.APPLICATION_JSON_VALUE })
    @Operation(
            summary = "Dummies",
            description = "Route to retrieve all active dummies"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Dummies found"),
            @ApiResponse(responseCode = "500", description = "Server-side error")
    })
    public ResponseEntity<List<Dummy>> getDummies() {
        return ResponseEntity.ok(dummyService.findDummies());
    }
}
