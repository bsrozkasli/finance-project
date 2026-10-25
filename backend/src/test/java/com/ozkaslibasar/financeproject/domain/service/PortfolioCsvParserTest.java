package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** EPIC-002 Task 4 / D-4: CSV schema v1 parsing, row validation and row identity. */
class PortfolioCsvParserTest {

    private static final String HEADER =
            "trade_date,action,symbol,asset_type,quantity,price,currency,fee,fx_rate_to_base,notes";

    private final PortfolioCsvParser parser = new PortfolioCsvParser();

    private List<PortfolioCsvParser.ParsedRow> parse(String csv) {
        return parser.parse(7L, "default", csv.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void parsesValidRowIntoCsvSourcedTransactionWithoutId() {
        List<PortfolioCsvParser.ParsedRow> rows = parse(HEADER + "\n2026-10-01,buy,aapl,us_stock,10,100.50,usd,1,1.0,first\n");

        assertThat(rows).hasSize(1);
        PortfolioCsvParser.ParsedRow row = rows.get(0);
        assertThat(row.error()).isNull();
        assertThat(row.rowNumber()).isEqualTo(1);
        assertThat(row.transaction().id()).isNull();
        assertThat(row.transaction().source()).isEqualTo(PortfolioTransactionSource.CSV);
        assertThat(row.transaction().portfolioId()).isEqualTo(7L);
        assertThat(row.transaction().symbol()).isEqualTo("AAPL");
        assertThat(row.transaction().action()).isEqualTo(PortfolioTransactionAction.BUY);
        assertThat(row.transaction().assetType()).isEqualTo(PortfolioAssetType.US_STOCK);
        assertThat(row.transaction().tradeDate()).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(row.transaction().notes()).isEqualTo("first");
        assertThat(row.transaction().originLocator()).isEqualTo(row.locator());
        assertThat(row.locator()).matches("csv:[0-9a-f]{64}");
    }

    @Test
    void emptyFeeIsZeroAndEmptyFxRateIsOne() {
        PortfolioCsvParser.ParsedRow row = parse(HEADER + "\n2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,,,\n").get(0);

        assertThat(row.error()).isNull();
        assertThat(row.transaction().fee()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(row.transaction().fxRateToBase()).isEqualByComparingTo(BigDecimal.ONE);
    }

    @Test
    void headerIsCaseInsensitiveInAnyOrderAndNotesIsOptional() {
        String csv = "FX_Rate_To_Base,Fee,Currency,Price,Quantity,Asset_Type,Symbol,Action,Trade_Date\r\n"
                + "1,0,USD,100,10,US_STOCK,AAPL,BUY,2026-10-01\r\n";

        PortfolioCsvParser.ParsedRow row = parse(csv).get(0);

        assertThat(row.error()).isNull();
        assertThat(row.transaction().symbol()).isEqualTo("AAPL");
        assertThat(row.transaction().quantity()).isEqualByComparingTo("10");
        assertThat(row.transaction().notes()).isNull();
    }

    @Test
    void supportsQuotedFieldsDoubledQuotesAndCommasInsideQuotes() {
        String csv = HEADER + "\n2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,\"said \"\"hi\"\", then left\"\n";

        PortfolioCsvParser.ParsedRow row = parse(csv).get(0);

        assertThat(row.error()).isNull();
        assertThat(row.transaction().notes()).isEqualTo("said \"hi\", then left");
        assertThat(row.rawLine()).contains("\"said \"\"hi\"\", then left\"");
    }

    @Test
    void skipsBlankLinesAndNumbersDataRowsFromOne() {
        String csv = HEADER + "\n\n2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,\n\n2026-10-02,BUY,MSFT,US_STOCK,5,50,USD,0,1,\n";

        List<PortfolioCsvParser.ParsedRow> rows = parse(csv);

        assertThat(rows).extracting(PortfolioCsvParser.ParsedRow::rowNumber).containsExactly(1, 2);
    }

    @Test
    void stripsUtf8ByteOrderMark() {
        byte[] body = ("﻿" + HEADER + "\n2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,\n")
                .getBytes(StandardCharsets.UTF_8);

        assertThat(parser.parse(7L, "default", body)).hasSize(1);
    }

    @Test
    void rejectsWholeFileForMissingUnknownOrDuplicateHeader() {
        assertThatThrownBy(() -> parse("trade_date,action,symbol,asset_type,quantity,price,currency,fee\n1,2,3,4,5,6,7,8\n"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("fx_rate_to_base");
        assertThatThrownBy(() -> parse(HEADER + ",extra\n2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,,x\n"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("extra");
        assertThatThrownBy(() -> parse(HEADER + ",fee\n2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,,0\n"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("fee");
    }

    @Test
    void rejectsEmptyFileAndFileWithoutDataRows() {
        assertThatThrownBy(() -> parser.parse(7L, "default", new byte[0]))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> parse("\n\n"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> parse(HEADER + "\n"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("no data rows");
    }

    @Test
    void rejectsFileOverOneMebibyteButAcceptsExactlyTheLimit() {
        byte[] tooBig = new byte[PortfolioCsvParser.MAX_BYTES + 1];
        assertThatThrownBy(() -> parser.parse(7L, "default", tooBig))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("1048576");

        StringBuilder csv = new StringBuilder(HEADER).append("\n2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,");
        while (csv.length() < PortfolioCsvParser.MAX_BYTES - 1) {
            csv.append('x');
        }
        byte[] exact = csv.toString().getBytes(StandardCharsets.UTF_8);
        assertThat(exact.length).isLessThanOrEqualTo(PortfolioCsvParser.MAX_BYTES);
        assertThat(parser.parse(7L, "default", exact)).hasSize(1);
    }

    @Test
    void rejectsMoreThanFiveThousandDataRows() {
        StringBuilder csv = new StringBuilder(HEADER).append('\n');
        for (int i = 0; i < PortfolioCsvParser.MAX_ROWS + 1; i++) {
            csv.append("2026-10-01,BUY,AAPL,US_STOCK,1,1,USD,0,1,\n");
        }
        assertThatThrownBy(() -> parse(csv.toString()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("5000");

        StringBuilder atLimit = new StringBuilder(HEADER).append('\n');
        for (int i = 0; i < PortfolioCsvParser.MAX_ROWS; i++) {
            atLimit.append("2026-10-01,BUY,AAPL,US_STOCK,1,1,USD,0,1,\n");
        }
        assertThat(parse(atLimit.toString())).hasSize(PortfolioCsvParser.MAX_ROWS);
    }

    @Test
    void rejectsUnterminatedQuoteAndInvalidUtf8() {
        assertThatThrownBy(() -> parse(HEADER + "\n2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,\"open\n"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("quote");
        assertThatThrownBy(() -> parser.parse(7L, "default", new byte[]{'a', ',', (byte) 0xC3, (byte) 0x28, '\n', 'x'}))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void stagesRowFailuresAsInvalidWithMessageAndNoLocator() {
        String csv = HEADER + "\n"
                + "not-a-date,BUY,AAPL,US_STOCK,10,100,USD,0,1,\n"
                + "2026-10-01,HODL,AAPL,US_STOCK,10,100,USD,0,1,\n"
                + "2026-10-01,BUY,AAPL,US_STOCK,abc,100,USD,0,1,\n"
                + "2026-10-01,BUY,,US_STOCK,10,100,USD,0,1,\n"
                + "2026-10-01,BUY,AAPL,US_STOCK,-1,100,USD,0,1,\n"
                + "2026-10-01,BUY,AAPL,US_STOCK,10,100,USDX,0,1,\n"
                + ",BUY,AAPL,US_STOCK,10,100,USD,0,1,\n"
                + "2026-10-01,BUY,AAPL,,10,100,USD,0,1,\n"
                + "2026-10-01,BUY,AAPL,US_STOCK,10,100,,0,1,\n"
                + "2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,-1,1,\n"
                + "2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,0,\n"
                + "2026-10-01,BUY,AAPL\n";

        List<PortfolioCsvParser.ParsedRow> rows = parse(csv);

        assertThat(rows).hasSize(12);
        assertThat(rows).allSatisfy(row -> {
            assertThat(row.transaction()).isNull();
            assertThat(row.locator()).isNull();
            assertThat(row.error()).isNotBlank();
        });
        assertThat(rows.get(0).rawLine()).startsWith("not-a-date");
    }

    @Test
    void locatorIsDeterministicAndIgnoresNotesAndNumberFormatting() {
        String a = parse(HEADER + "\n2026-10-01,buy,aapl,us_stock,10.0,100.50,usd,0.00,1,note a\n").get(0).locator();
        String b = parse(HEADER + "\n2026-10-01,BUY, AAPL ,US_STOCK,10,100.5,USD,0,1.000,other note\n").get(0).locator();
        String different = parse(HEADER + "\n2026-10-01,BUY,AAPL,US_STOCK,10,100.51,USD,0,1,\n").get(0).locator();

        assertThat(a).isEqualTo(b).isNotEqualTo(different);
    }

    @Test
    void locatorHashMatchesTheDocumentedNormalizedRow() throws Exception {
        String normalized = String.join("\u001f", "2026-10-01", "BUY", "AAPL", "US_STOCK", "10", "100.5", "USD", "0", "1");
        byte[] digest = java.security.MessageDigest.getInstance("SHA-256")
                .digest(normalized.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder("csv:");
        for (byte value : digest) {
            hex.append(String.format("%02x", value));
        }

        String locator = parse(HEADER + "\n2026-10-01,BUY,AAPL,US_STOCK,10.00,100.50,USD,0.0,1.0,\n").get(0).locator();

        assertThat(locator).isEqualTo(hex.toString());
    }

    @Test
    void nthIdenticalRowGetsHashSuffixFromTwo() {
        String line = "2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,\n";
        List<PortfolioCsvParser.ParsedRow> rows = parse(HEADER + "\n" + line + line + line);

        String base = rows.get(0).locator();
        assertThat(base).doesNotContain("#");
        assertThat(rows.get(1).locator()).isEqualTo(base + "#2");
        assertThat(rows.get(2).locator()).isEqualTo(base + "#3");
    }

    @Test
    void reorderingTheSameRowsYieldsTheSameSetOfLocators() {
        String x = "2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,\n";
        String y = "2026-10-02,BUY,MSFT,US_STOCK,5,50,USD,0,1,\n";
        Set<String> first = locators(parse(HEADER + "\n" + x + y + x));
        Set<String> second = locators(parse(HEADER + "\n" + x + x + y));
        Set<String> third = locators(parse(HEADER + "\n" + y + x + x));

        assertThat(first).hasSize(3).isEqualTo(second).isEqualTo(third);
    }

    private static Set<String> locators(List<PortfolioCsvParser.ParsedRow> rows) {
        return rows.stream().map(PortfolioCsvParser.ParsedRow::locator).collect(Collectors.toSet());
    }
}
