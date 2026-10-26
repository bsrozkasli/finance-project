package com.ozkaslibasar.financeproject.domain.service;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

/** R-19: symbol, currency and CSV identity normalization must not depend on the JVM default locale. */
class PortfolioLocaleIndependenceTest {

    private static final String CSV =
            "TRADE_DATE,ACTION,SYMBOL,ASSET_TYPE,QUANTITY,PRICE,CURRENCY,FEE,FX_RATE_TO_BASE,NOTES\n"
                    + "2026-10-01,buy,ibm,us_stock,1,10,idr,0,1,\n";

    private final PortfolioCsvParser parser = new PortfolioCsvParser();

    @Test
    void csvSymbolCurrencyAndLocatorDoNotDependOnTheDefaultLocale() {
        Locale original = Locale.getDefault();
        try {
            Locale.setDefault(Locale.ENGLISH);
            PortfolioCsvParser.ParsedRow english = parse();

            Locale.setDefault(new Locale("tr", "TR"));
            PortfolioCsvParser.ParsedRow turkish = parse();

            assertThat(turkish.error()).isNull();
            assertThat(turkish.transaction().symbol()).isEqualTo("IBM");
            assertThat(turkish.transaction().currency()).isEqualTo("IDR");
            assertThat(turkish.locator()).isEqualTo(english.locator());
        } finally {
            Locale.setDefault(original);
        }
    }

    private PortfolioCsvParser.ParsedRow parse() {
        List<PortfolioCsvParser.ParsedRow> rows = parser.parse(7L, "default", CSV.getBytes(StandardCharsets.UTF_8));
        assertThat(rows).hasSize(1);
        return rows.get(0);
    }
}
