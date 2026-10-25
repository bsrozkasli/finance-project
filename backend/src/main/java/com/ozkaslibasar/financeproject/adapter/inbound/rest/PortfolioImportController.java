package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.PortfolioImportResponse;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioCsvImportService;
import com.ozkaslibasar.financeproject.domain.service.PortfolioCsvParser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

@Tag(name = "Portfolio Imports", description = "CSV import staging and acceptance into the portfolio ledger")
@RestController
@RequestMapping("/api/v1/portfolios/{portfolioId}/imports")
@RequiredArgsConstructor
public class PortfolioImportController {

    private static final String DEFAULT_USER = "default";

    private final PortfolioPort portfolioPort;
    private final PortfolioCsvImportService importService;

    @PostMapping(consumes = "text/csv")
    public ResponseEntity<PortfolioImportResponse> stage(@PathVariable Long portfolioId, HttpServletRequest request)
            throws IOException {
        requirePortfolio(portfolioId);
        byte[] file = readBounded(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(PortfolioImportResponse.from(importService.stage(portfolioId, DEFAULT_USER, file)));
    }

    /** R-14: rejects on a declared oversize, and otherwise never reads more than the cap plus one byte. */
    private static byte[] readBounded(HttpServletRequest request) throws IOException {
        int max = PortfolioCsvParser.MAX_BYTES;
        if (request.getContentLengthLong() > max) {
            throw tooLarge(max);
        }
        byte[] body = request.getInputStream().readNBytes(max + 1);
        if (body.length > max) {
            throw tooLarge(max);
        }
        return body;
    }

    private static IllegalArgumentException tooLarge(int max) {
        return new IllegalArgumentException("CSV file exceeds " + max + " bytes");
    }

    @GetMapping("/{batchId}")
    public PortfolioImportResponse get(@PathVariable Long portfolioId, @PathVariable Long batchId) {
        requirePortfolio(portfolioId);
        return importService.find(portfolioId, DEFAULT_USER, batchId)
                .map(PortfolioImportResponse::from)
                .orElseThrow(() -> batchNotFound(batchId));
    }

    @PostMapping("/{batchId}/accept")
    public PortfolioImportResponse accept(@PathVariable Long portfolioId, @PathVariable Long batchId) {
        requirePortfolio(portfolioId);
        return importService.accept(portfolioId, DEFAULT_USER, batchId)
                .map(PortfolioImportResponse::from)
                .orElseThrow(() -> batchNotFound(batchId));
    }

    private void requirePortfolio(Long portfolioId) {
        portfolioPort.findByIdAndUserId(portfolioId, DEFAULT_USER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Portfolio not found: " + portfolioId));
    }

    private static ResponseStatusException batchNotFound(Long batchId) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Import batch not found: " + batchId);
    }
}
