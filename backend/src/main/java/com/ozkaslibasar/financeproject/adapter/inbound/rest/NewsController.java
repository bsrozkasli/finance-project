package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.FinnhubClient;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubNewsDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
@Slf4j
public class NewsController {

    private final FinnhubClient finnhubClient;

    @GetMapping("/{symbol}")
    @Cacheable(value = "newsCache", key = "#symbol")
    public List<FinnhubNewsDto> getNews(@PathVariable String symbol) {
        log.info("Fetching news for symbol: {}", symbol);
        
        // Fetch news for the last 7 days
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(7);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        
        return finnhubClient.getCompanyNews(
                symbol.toUpperCase(), 
                from.format(formatter), 
                to.format(formatter)
        );
    }
}
